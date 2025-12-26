import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcTotalPoints } from '../../../../lib/scoring/engine'
import type { ScoringFormula, BattingStats, BowlingStats, FieldingStats } from '../../../../lib/scoring/types'

/**
 * POST /api/scoring/calculate
 * Calculate or recalculate points for matches
 *
 * Body: { matchIds?: string[] } - If omitted, recalculates ALL matches
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club
    const { data: membership } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No club found for user' }, { status: 404 })
    }

    // Get active scoring config
    const { data: config, error: configError } = await supabase
      .from('scoring_configs')
      .select('*')
      .eq('club_id', membership.club_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'No active scoring configuration found. Please create one first.' },
        { status: 400 }
      )
    }

    const formula = config.formula_json as ScoringFormula

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { matchIds } = body as { matchIds?: string[] }

    // Build query for matches
    let matchQuery = supabase
      .from('matches')
      .select('id, team_id, match_date')
      .eq('club_id', membership.club_id)
      .order('match_date', { ascending: false })

    if (matchIds && matchIds.length > 0) {
      matchQuery = matchQuery.in('id', matchIds)
    }

    const { data: matches, error: matchError } = await matchQuery

    if (matchError) {
      console.error('Error fetching matches:', matchError)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'No matches to process', processed: 0 })
    }

    let processedCount = 0
    const errors: { matchId: string; error: string }[] = []

    // Process each match
    for (const match of matches) {
      try {
        // Get all team players for this match
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('player_id')
          .eq('team_id', match.team_id)

        if (!teamPlayers || teamPlayers.length === 0) {
          errors.push({ matchId: match.id, error: 'No team players found' })
          continue
        }

        // Process each player
        for (const { player_id } of teamPlayers) {
          // Get batting stats
          const { data: battingCard } = await supabase
            .from('batting_cards')
            .select('*')
            .eq('match_id', match.id)
            .eq('player_id', player_id)
            .single()

          // Get bowling stats
          const { data: bowlingCard } = await supabase
            .from('bowling_cards')
            .select('*')
            .eq('match_id', match.id)
            .eq('player_id', player_id)
            .single()

          // Get fielding stats
          const { data: fieldingCard } = await supabase
            .from('fielding_cards')
            .select('*')
            .eq('match_id', match.id)
            .eq('player_id', player_id)
            .single()

          // Build stats objects (default to zeros if no card exists)
          const battingStats: BattingStats = battingCard
            ? {
                runs: battingCard.runs || 0,
                balls: battingCard.balls_faced || 0,
                fours: battingCard.fours || 0,
                sixes: battingCard.sixes || 0,
                dismissal: battingCard.dismissal_type,
              }
            : { runs: 0, balls: 0, fours: 0, sixes: 0 }

          const bowlingStats: BowlingStats = bowlingCard
            ? {
                overs: bowlingCard.overs || 0,
                maidens: bowlingCard.maidens || 0,
                runs: bowlingCard.runs_conceded || 0,
                wickets: bowlingCard.wickets || 0,
              }
            : { overs: 0, maidens: 0, runs: 0, wickets: 0 }

          const fieldingStats: FieldingStats = fieldingCard
            ? {
                catches: fieldingCard.catches || 0,
                stumpings: fieldingCard.stumpings || 0,
                runouts: fieldingCard.run_outs || 0,
                drops: fieldingCard.drops || 0,
                misfields: fieldingCard.misfields || 0,
              }
            : { catches: 0, stumpings: 0, runouts: 0, drops: 0, misfields: 0 }

          // Calculate points
          const breakdown = calcTotalPoints(formula, battingStats, bowlingStats, fieldingStats)

          // Delete existing points events for this player/match
          await supabase
            .from('points_events')
            .delete()
            .eq('match_id', match.id)
            .eq('player_id', player_id)

          // Insert new points events
          const events = []

          // Batting events
          if (battingStats.runs > 0 && breakdown.details.batting) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'batting_runs',
              value: battingStats.runs,
              points: breakdown.details.batting.runs,
            })
          }
          if (breakdown.details.batting && breakdown.details.batting.boundaries > 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'batting_boundaries',
              value: battingStats.fours + battingStats.sixes,
              points: breakdown.details.batting.boundaries,
            })
          }
          if (breakdown.details.batting && breakdown.details.batting.milestones > 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'batting_milestones',
              value: battingStats.runs,
              points: breakdown.details.batting.milestones,
            })
          }
          if (breakdown.details.batting && breakdown.details.batting.penalties !== 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'batting_penalty',
              value: 0,
              points: breakdown.details.batting.penalties,
            })
          }

          // Bowling events
          if (bowlingStats.wickets > 0 && breakdown.details.bowling) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'bowling_wickets',
              value: bowlingStats.wickets,
              points: breakdown.details.bowling.wickets,
            })
          }
          if (breakdown.details.bowling && breakdown.details.bowling.maidens > 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'bowling_maidens',
              value: bowlingStats.maidens,
              points: breakdown.details.bowling.maidens,
            })
          }
          if (breakdown.details.bowling && breakdown.details.bowling.milestones > 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'bowling_milestones',
              value: bowlingStats.wickets,
              points: breakdown.details.bowling.milestones,
            })
          }
          if (breakdown.details.bowling && breakdown.details.bowling.economy !== 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'bowling_economy',
              value: bowlingStats.overs > 0 ? bowlingStats.runs / bowlingStats.overs : 0,
              points: breakdown.details.bowling.economy,
            })
          }

          // Fielding events
          if (fieldingStats.catches > 0 && breakdown.details.fielding) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'fielding_catches',
              value: fieldingStats.catches,
              points: breakdown.details.fielding.catches,
            })
          }
          if (fieldingStats.stumpings > 0 && breakdown.details.fielding) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'fielding_stumpings',
              value: fieldingStats.stumpings,
              points: breakdown.details.fielding.stumpings,
            })
          }
          if (fieldingStats.runouts > 0 && breakdown.details.fielding) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'fielding_runouts',
              value: fieldingStats.runouts,
              points: breakdown.details.fielding.runouts,
            })
          }
          if (breakdown.details.fielding && breakdown.details.fielding.penalties !== 0) {
            events.push({
              match_id: match.id,
              player_id,
              config_id: config.id,
              metric: 'fielding_penalty',
              value: fieldingStats.drops + fieldingStats.misfields,
              points: breakdown.details.fielding.penalties,
            })
          }

          // Insert events
          if (events.length > 0) {
            const { error: eventsError } = await supabase.from('points_events').insert(events)

            if (eventsError) {
              console.error('Error inserting points events:', eventsError)
              errors.push({
                matchId: match.id,
                error: `Failed to insert points for player ${player_id}`,
              })
            }
          }
        }

        processedCount++
      } catch (err: any) {
        console.error(`Error processing match ${match.id}:`, err)
        errors.push({ matchId: match.id, error: err.message })
      }
    }

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      club_id: membership.club_id,
      actor: user.id,
      action: 'points_recalculated',
      details: {
        config_id: config.id,
        config_version: config.version,
        matches_processed: processedCount,
        total_matches: matches.length,
        errors: errors.length,
      },
    })

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: matches.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/scoring/calculate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
