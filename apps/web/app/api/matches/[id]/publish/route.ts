import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlayCricketTransformer } from '@/lib/play-cricket/transformer'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id
    const body = await request.json()
    const { playerMappings, squadPlayerIds } = body as {
      playerMappings: Record<string, string> // externalName -> playerId
      squadPlayerIds: string[]
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get match
    const { data: match } = await supabase
      .from('matches')
      .select('*, teams(season_id)')
      .eq('id', matchId)
      .single()

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    if (match.published) {
      return NextResponse.json(
        { error: 'Match is already published' },
        { status: 400 }
      )
    }

    // Step 1: Apply player mappings to batting cards
    const { data: battingCards } = await supabase
      .from('batting_cards')
      .select('id, player_name')
      .eq('match_id', matchId)
      .is('player_id', null)

    if (battingCards) {
      for (const card of battingCards) {
        const playerId = playerMappings[card.player_name]
        if (playerId) {
          await supabase
            .from('batting_cards')
            .update({ player_id: playerId })
            .eq('id', card.id)
        }
      }
    }

    // Step 2: Apply player mappings to bowling cards
    const { data: bowlingCards } = await supabase
      .from('bowling_cards')
      .select('id, player_name')
      .eq('match_id', matchId)
      .is('player_id', null)

    if (bowlingCards) {
      for (const card of bowlingCards) {
        const playerId = playerMappings[card.player_name]
        if (playerId) {
          await supabase
            .from('bowling_cards')
            .update({ player_id: playerId })
            .eq('id', card.id)
        }
      }
    }

    // Step 3: Create zero-rows for squad players who didn't play
    if (squadPlayerIds && squadPlayerIds.length > 0) {
      // Get first innings
      const { data: innings } = await supabase
        .from('innings')
        .select('id')
        .eq('match_id', matchId)
        .order('innings_number')
        .limit(1)
        .single()

      if (innings) {
        // Get all players who already have cards
        const { data: existingBattingCards } = await supabase
          .from('batting_cards')
          .select('player_id')
          .eq('match_id', matchId)
          .not('player_id', 'is', null)

        const existingPlayerIds = new Set(
          existingBattingCards?.map(c => c.player_id) || []
        )

        // Create derived batting cards for squad players
        const zeroRowsPlayers = squadPlayerIds.filter(
          id => !existingPlayerIds.has(id)
        )

        for (const playerId of zeroRowsPlayers) {
          const { data: player } = await supabase
            .from('players')
            .select('first_name, last_name')
            .eq('id', playerId)
            .single()

          if (player) {
            await supabase.from('batting_cards').insert({
              innings_id: innings.id,
              match_id: matchId,
              player_id: playerId,
              player_name: `${player.first_name} ${player.last_name}`,
              position: 99, // Low priority position
              how_out: 'did not bat',
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              derived: true,
            })
          }
        }
      }
    }

    // Step 4: Calculate points
    await calculatePoints(supabase, matchId, match.teams.season_id)

    // Step 5: Mark match as published
    await supabase
      .from('matches')
      .update({ published: true })
      .eq('id', matchId)

    return NextResponse.json({
      success: true,
      message: 'Match published successfully',
    })
  } catch (error: any) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate points for all players in a match
 */
async function calculatePoints(
  supabase: any,
  matchId: string,
  seasonId: string
) {
  // Get active scoring config for this season
  const { data: scoringConfig } = await supabase
    .from('scoring_configs')
    .select('id, formula_json')
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .single()

  if (!scoringConfig) {
    throw new Error('No active scoring config found for this season')
  }

  const formula = scoringConfig.formula_json

  // Get all batting cards
  const { data: battingCards } = await supabase
    .from('batting_cards')
    .select('*')
    .eq('match_id', matchId)
    .not('player_id', 'is', null)

  // Calculate batting points
  for (const card of battingCards || []) {
    const events: Array<{ type: string; points: number; metadata?: any }> = []

    // Points per run
    if (card.runs > 0 && formula.batting.run) {
      events.push({
        type: 'runs',
        points: card.runs * formula.batting.run,
        metadata: { runs: card.runs },
      })
    }

    // Fours
    if (card.fours > 0 && formula.batting.four) {
      events.push({
        type: 'fours',
        points: card.fours * formula.batting.four,
        metadata: { fours: card.fours },
      })
    }

    // Sixes
    if (card.sixes > 0 && formula.batting.six) {
      events.push({
        type: 'sixes',
        points: card.sixes * formula.batting.six,
        metadata: { sixes: card.sixes },
      })
    }

    // Milestones
    const milestone = PlayCricketTransformer.getMilestone(card.runs)
    if (milestone === 50 && formula.batting.milestone_50) {
      events.push({
        type: 'milestone_50',
        points: formula.batting.milestone_50,
      })
    } else if (milestone === 100 && formula.batting.milestone_100) {
      events.push({
        type: 'milestone_100',
        points: formula.batting.milestone_100,
      })
    }

    // Duck penalty
    if (PlayCricketTransformer.isDuck(card.runs, card.how_out) && formula.batting.duck) {
      events.push({
        type: 'duck',
        points: formula.batting.duck,
      })
    }

    // Insert points events
    for (const event of events) {
      await supabase.from('points_events').insert({
        match_id: matchId,
        player_id: card.player_id,
        scoring_config_id: scoringConfig.id,
        category: 'batting',
        event_type: event.type,
        points: event.points,
        metadata: event.metadata || {},
      })
    }
  }

  // Get all bowling cards
  const { data: bowlingCards } = await supabase
    .from('bowling_cards')
    .select('*')
    .eq('match_id', matchId)
    .not('player_id', 'is', null)

  // Calculate bowling points
  for (const card of bowlingCards || []) {
    const events: Array<{ type: string; points: number; metadata?: any }> = []

    // Wickets
    if (card.wickets > 0 && formula.bowling.wicket) {
      events.push({
        type: 'wickets',
        points: card.wickets * formula.bowling.wicket,
        metadata: { wickets: card.wickets },
      })
    }

    // Maidens
    if (card.maidens > 0 && formula.bowling.maiden) {
      events.push({
        type: 'maidens',
        points: card.maidens * formula.bowling.maiden,
        metadata: { maidens: card.maidens },
      })
    }

    // Wicket milestones
    const wicketMilestone = PlayCricketTransformer.getWicketMilestone(card.wickets)
    if (wicketMilestone === 3 && formula.bowling.milestone_3_wickets) {
      events.push({
        type: 'milestone_3_wickets',
        points: formula.bowling.milestone_3_wickets,
      })
    } else if (wicketMilestone === 5 && formula.bowling.milestone_5_wickets) {
      events.push({
        type: 'milestone_5_wickets',
        points: formula.bowling.milestone_5_wickets,
      })
    }

    // Economy bonus/penalty
    const economy = PlayCricketTransformer.calculateEconomy(card.overs, card.runs_conceded)
    if (economy > 0) {
      if (
        formula.bowling.economy_bonus_threshold &&
        economy <= formula.bowling.economy_bonus_threshold
      ) {
        events.push({
          type: 'economy_bonus',
          points: formula.bowling.economy_bonus_points || 0,
          metadata: { economy },
        })
      } else if (
        formula.bowling.economy_penalty_threshold &&
        economy >= formula.bowling.economy_penalty_threshold
      ) {
        events.push({
          type: 'economy_penalty',
          points: formula.bowling.economy_penalty_points || 0,
          metadata: { economy },
        })
      }
    }

    // Insert points events
    for (const event of events) {
      await supabase.from('points_events').insert({
        match_id: matchId,
        player_id: card.player_id,
        scoring_config_id: scoringConfig.id,
        category: 'bowling',
        event_type: event.type,
        points: event.points,
        metadata: event.metadata || {},
      })
    }
  }
}
