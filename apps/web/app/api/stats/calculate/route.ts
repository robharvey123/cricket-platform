import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { calcBattingPoints, calcBowlingPoints, calcFieldingPoints } from '../../../../lib/scoring/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const clubId = userRole.club_id

    // Get active scoring config
    let { data: config } = await supabase
      .from('scoring_configs')
      .select('*')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    // If no config exists, create a default one
    if (!config) {
      const { DEFAULT_FORMULA } = await import('../../../../lib/scoring/engine')

      const { data: newConfig, error: createError } = await supabase
        .from('scoring_configs')
        .insert({
          club_id: clubId,
          name: 'Default Scoring',
          version: 1,
          formula_json: DEFAULT_FORMULA,
          is_active: true
        })
        .select()
        .single()

      if (createError || !newConfig) {
        return NextResponse.json({ error: 'Failed to create default scoring config' }, { status: 500 })
      }

      config = newConfig
    }

    const formula = config.formula_json

    const normalizeName = (value: string) =>
      value.toLowerCase().replace(/\s+/g, ' ').trim()

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (!season) {
      return NextResponse.json({ error: 'No active season found' }, { status: 404 })
    }

    const { data: club } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .single()

    const clubName = normalizeName(club?.name || '')

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('club_id', clubId)

    const teamNameById = new Map<string, string>()
    teams?.forEach((team) => {
      teamNameById.set(team.id, normalizeName(team.name || ''))
    })

    const inferBattingTeam = (value: string, opponentName: string, teamName: string) => {
      const normalized = normalizeName(value)
      if (normalized === 'home' || normalized === 'away') {
        return normalized
      }
      if (normalized.includes('opposition') || normalized.includes('away')) {
        return 'away'
      }
      if (normalized.includes('home')) {
        return 'home'
      }
      if (
        normalized.includes('brookweald') ||
        (clubName && normalized.includes(clubName)) ||
        (teamName && normalized.includes(teamName))
      ) {
        return 'home'
      }
      if (opponentName && normalized.includes(opponentName)) {
        return 'away'
      }
      return normalized
    }

    // Get all matches for the active season (or missing season_id)
    let { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        team_id,
        opponent_name,
        match_date,
        innings (
          id,
          innings_number,
          batting_team,
          total_runs,
          wickets,
          overs,
          extras,
          batting_cards (
            id,
            player_id,
            runs,
            balls_faced,
            fours,
            sixes,
            is_out,
            dismissal_type
          ),
          bowling_cards (
            id,
            player_id,
            overs,
            maidens,
            runs_conceded,
            wickets,
            wides,
            no_balls
          )
        )
      `)
      .eq('club_id', clubId)
      .or(`season_id.eq.${season.id},season_id.is.null`)

    if (matchesError) {
      console.error('Matches fetch error (stats):', matchesError)
    }

    if (!matches || matches.length === 0) {
      const fallback = await supabase
        .from('matches')
        .select(`
          id,
          team_id,
          opponent_name,
          match_date,
          innings (
            id,
            innings_number,
            batting_team,
            total_runs,
            wickets,
            overs,
            extras,
            batting_cards (
              id,
              player_id,
              runs,
              balls_faced,
              fours,
              sixes,
              is_out,
              dismissal_type
            ),
            bowling_cards (
              id,
              player_id,
              overs,
              maidens,
              runs_conceded,
              wickets,
              wides,
              no_balls
            )
          )
        )
        `)
        .eq('club_id', clubId)

      if (fallback.error) {
        console.error('Matches fallback error (stats):', fallback.error)
      }

      matches = fallback.data || []
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        message: 'No matches found',
        processed: 0,
        debug: {
          clubId,
          seasonId: season.id
        }
      })
    }

    // Calculate stats for each player
    const playerStats: Map<string, any> = new Map()
    const playerMatchPerformance: any[] = []

    for (const match of matches) {
      const { data: fieldingCards, error: fieldingError } = await supabase
        .from('fielding_cards')
        .select('player_id, catches, stumpings, run_outs, drops, misfields')
        .eq('match_id', match.id)

      if (fieldingError) {
        console.error('Fielding cards fetch error:', fieldingError)
      }

      const fieldingByPlayer = new Map<string, {
        catches: number
        stumpings: number
        runouts: number
        drops: number
        misfields: number
      }>()

      fieldingCards?.forEach((card) => {
        fieldingByPlayer.set(card.player_id, {
          catches: card.catches || 0,
          stumpings: card.stumpings || 0,
          runouts: card.run_outs || 0,
          drops: card.drops || 0,
          misfields: card.misfields || 0,
        })
      })

      const opponentName = normalizeName(match.opponent_name || '')
      const teamName = teamNameById.get(match.team_id) || ''

      for (const innings of match.innings || []) {
        const normalizedBattingTeam = inferBattingTeam(
          innings.batting_team || '',
          opponentName,
          teamName
        )
        const battingTeam = normalizedBattingTeam === 'away' ? 'away' : 'home'
        // Process batting cards (only for home team - our players)
        if (battingTeam === 'home') {
          for (const card of innings.batting_cards || []) {
            const playerId = card.player_id
            if (!playerId) continue

            // Initialize player stats if not exists
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, {
                player_id: playerId,
                season_id: season.id,
                club_id: clubId,
                matches_batted: 0,
                innings_batted: 0,
                not_outs: 0,
                runs_scored: 0,
                balls_faced: 0,
                fours: 0,
                sixes: 0,
                highest_score: 0,
                fifties: 0,
                hundreds: 0,
                ducks: 0,
                matches_bowled: 0,
                innings_bowled: 0,
                overs_bowled: 0,
                maidens: 0,
                runs_conceded: 0,
                wickets: 0,
                best_bowling_wickets: 0,
                best_bowling_runs: 999,
                three_fors: 0,
                five_fors: 0,
                catches: 0,
                stumpings: 0,
                run_outs: 0,
                drops: 0,
                batting_points: 0,
                bowling_points: 0,
                fielding_points: 0,
                total_points: 0,
                match_performances: new Map()
              })
            }

            const stats = playerStats.get(playerId)!

            // Update batting stats
            stats.innings_batted++
            stats.runs_scored += card.runs || 0
            stats.balls_faced += card.balls_faced || 0
            stats.fours += card.fours || 0
            stats.sixes += card.sixes || 0

            if (!card.is_out) stats.not_outs++
            if (card.runs === 0 && card.is_out) stats.ducks++
            if (card.runs >= 50 && card.runs < 100) stats.fifties++
            if (card.runs >= 100) stats.hundreds++
            if (card.runs > stats.highest_score) stats.highest_score = card.runs

            // Calculate batting points
            const battingPoints = calcBattingPoints(formula.batting, {
              runs: card.runs || 0,
              balls: card.balls_faced || 0,
              fours: card.fours || 0,
              sixes: card.sixes || 0,
              out: card.is_out,
              duck: card.runs === 0 && card.is_out
            })

            stats.batting_points += battingPoints.points

            // Track per-match performance
            if (!stats.match_performances.has(match.id)) {
              stats.match_performances.set(match.id, {
                runs: 0,
                balls_faced: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                overs_bowled: 0,
                runs_conceded: 0,
                maidens: 0,
                catches: 0,
                stumpings: 0,
                run_outs: 0,
                batting_points: 0,
                bowling_points: 0,
                fielding_points: 0
              })
            }
            const matchPerf = stats.match_performances.get(match.id)
            matchPerf.runs += card.runs || 0
            matchPerf.balls_faced += card.balls_faced || 0
            matchPerf.fours += card.fours || 0
            matchPerf.sixes += card.sixes || 0
            matchPerf.batting_points += battingPoints.points
          }
        }

        // Process bowling cards (only for away team innings - our players bowling)
        if (battingTeam === 'away') {
          for (const card of innings.bowling_cards || []) {
            const playerId = card.player_id
            if (!playerId) continue

            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, {
                player_id: playerId,
                season_id: season.id,
                club_id: clubId,
                matches_batted: 0,
                innings_batted: 0,
                not_outs: 0,
                runs_scored: 0,
                balls_faced: 0,
                fours: 0,
                sixes: 0,
                highest_score: 0,
                fifties: 0,
                hundreds: 0,
                ducks: 0,
                matches_bowled: 0,
                innings_bowled: 0,
                overs_bowled: 0,
                maidens: 0,
                runs_conceded: 0,
                wickets: 0,
                best_bowling_wickets: 0,
                best_bowling_runs: 999,
                three_fors: 0,
                five_fors: 0,
                catches: 0,
                stumpings: 0,
                run_outs: 0,
                drops: 0,
                batting_points: 0,
                bowling_points: 0,
                fielding_points: 0,
                total_points: 0,
                match_performances: new Map()
              })
            }

            const stats = playerStats.get(playerId)!

            // Update bowling stats
            stats.innings_bowled++
            stats.overs_bowled += card.overs || 0
            stats.maidens += card.maidens || 0
            stats.runs_conceded += card.runs_conceded || 0
            stats.wickets += card.wickets || 0

            if (card.wickets >= 3) stats.three_fors++
            if (card.wickets >= 5) stats.five_fors++

            // Track best bowling
            if (card.wickets > stats.best_bowling_wickets ||
                (card.wickets === stats.best_bowling_wickets && card.runs_conceded < stats.best_bowling_runs)) {
              stats.best_bowling_wickets = card.wickets
              stats.best_bowling_runs = card.runs_conceded
            }

            // Calculate bowling points
            const balls = card.overs * 6
            const bowlingPoints = calcBowlingPoints(formula.bowling, {
              wickets: card.wickets || 0,
              overs: card.overs || 0,
              runs: card.runs_conceded || 0,
              maidens: card.maidens || 0,
              balls: balls
            })

            stats.bowling_points += bowlingPoints.points

            // Track per-match performance
            if (!stats.match_performances.has(match.id)) {
              stats.match_performances.set(match.id, {
                runs: 0,
                balls_faced: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                overs_bowled: 0,
                runs_conceded: 0,
                maidens: 0,
                catches: 0,
                stumpings: 0,
                run_outs: 0,
                batting_points: 0,
                bowling_points: 0,
                fielding_points: 0
              })
            }
            const matchPerf = stats.match_performances.get(match.id)
            matchPerf.wickets += card.wickets || 0
            matchPerf.overs_bowled += card.overs || 0
            matchPerf.runs_conceded += card.runs_conceded || 0
            matchPerf.maidens += card.maidens || 0
            matchPerf.bowling_points += bowlingPoints.points
          }
        }

        // Process fielding cards
      }

      // Process fielding cards (match-level)
      for (const [playerId, card] of fieldingByPlayer.entries()) {
        if (!playerStats.has(playerId)) {
          playerStats.set(playerId, {
            player_id: playerId,
            season_id: season.id,
            club_id: clubId,
            matches_batted: 0,
            innings_batted: 0,
            not_outs: 0,
            runs_scored: 0,
            balls_faced: 0,
            fours: 0,
            sixes: 0,
            highest_score: 0,
            fifties: 0,
            hundreds: 0,
            ducks: 0,
            matches_bowled: 0,
            innings_bowled: 0,
            overs_bowled: 0,
            maidens: 0,
            runs_conceded: 0,
            wickets: 0,
            best_bowling_wickets: 0,
            best_bowling_runs: 999,
            three_fors: 0,
            five_fors: 0,
            catches: 0,
            stumpings: 0,
            run_outs: 0,
            drops: 0,
            batting_points: 0,
            bowling_points: 0,
            fielding_points: 0,
            total_points: 0,
            match_performances: new Map()
          })
        }

        const stats = playerStats.get(playerId)!
        stats.catches += card.catches
        stats.stumpings += card.stumpings
        stats.run_outs += card.runouts
        stats.drops += card.drops

        const fieldingPoints = calcFieldingPoints(formula.fielding, {
          catches: card.catches,
          stumpings: card.stumpings,
          runouts: card.runouts,
          drops: card.drops,
          misfields: card.misfields
        })

        stats.fielding_points += fieldingPoints.points

        if (!stats.match_performances.has(match.id)) {
          stats.match_performances.set(match.id, {
            runs: 0,
            balls_faced: 0,
            fours: 0,
            sixes: 0,
            wickets: 0,
            overs_bowled: 0,
            runs_conceded: 0,
            maidens: 0,
            catches: 0,
            stumpings: 0,
            run_outs: 0,
            batting_points: 0,
            bowling_points: 0,
            fielding_points: 0
          })
        }

        const matchPerf = stats.match_performances.get(match.id)
        matchPerf.catches += card.catches
        matchPerf.stumpings += card.stumpings
        matchPerf.run_outs += card.runouts
        matchPerf.fielding_points += fieldingPoints.points
      }

      // Track unique matches played
      for (const [playerId, stats] of playerStats) {
        const matchPerf = stats.match_performances.get(match.id)
        if (matchPerf) {
          if (matchPerf.runs > 0 || matchPerf.balls_faced > 0) {
            stats.matches_batted = (stats.matches_batted || 0) + 1
          }
          if (matchPerf.wickets > 0 || matchPerf.overs_bowled > 0) {
            stats.matches_bowled = (stats.matches_bowled || 0) + 1
          }
        }
      }
    }

    // Calculate averages and insert into database
    for (const [playerId, stats] of playerStats) {
      stats.total_points = stats.batting_points + stats.bowling_points + stats.fielding_points

      // Calculate batting average
      const dismissals = stats.innings_batted - stats.not_outs
      stats.batting_average = dismissals > 0 ?
        Math.round((stats.runs_scored / dismissals) * 100) / 100 : null

      // Calculate batting strike rate
      stats.batting_strike_rate = stats.balls_faced > 0 ?
        Math.round((stats.runs_scored / stats.balls_faced) * 10000) / 100 : null

      // Calculate bowling average
      stats.bowling_average = stats.wickets > 0 ?
        Math.round((stats.runs_conceded / stats.wickets) * 100) / 100 : null

      // Calculate bowling economy
      stats.bowling_economy = stats.overs_bowled > 0 ?
        Math.round((stats.runs_conceded / stats.overs_bowled) * 100) / 100 : null

      // Calculate bowling strike rate (balls per wicket)
      const balls_bowled = stats.overs_bowled * 6
      stats.bowling_strike_rate = stats.wickets > 0 ?
        Math.round((balls_bowled / stats.wickets) * 100) / 100 : null

      // Upsert player season stats
      const { error: upsertError } = await supabase
        .from('player_season_stats')
        .upsert({
          player_id: playerId,
          season_id: season.id,
          club_id: clubId,
          matches_batted: stats.matches_batted,
          innings_batted: stats.innings_batted,
          not_outs: stats.not_outs,
          runs_scored: stats.runs_scored,
          balls_faced: stats.balls_faced,
          fours: stats.fours,
          sixes: stats.sixes,
          highest_score: stats.highest_score,
          fifties: stats.fifties,
          hundreds: stats.hundreds,
          ducks: stats.ducks,
          batting_average: stats.batting_average,
          batting_strike_rate: stats.batting_strike_rate,
          matches_bowled: stats.matches_bowled,
          innings_bowled: stats.innings_bowled,
          overs_bowled: stats.overs_bowled,
          maidens: stats.maidens,
          runs_conceded: stats.runs_conceded,
          wickets: stats.wickets,
          best_bowling_wickets: stats.best_bowling_wickets === 0 ? null : stats.best_bowling_wickets,
          best_bowling_runs: stats.best_bowling_runs === 999 ? null : stats.best_bowling_runs,
          three_fors: stats.three_fors,
          five_fors: stats.five_fors,
          bowling_average: stats.bowling_average,
          bowling_economy: stats.bowling_economy,
          bowling_strike_rate: stats.bowling_strike_rate,
          catches: stats.catches,
          stumpings: stats.stumpings,
          run_outs: stats.run_outs,
          drops: stats.drops,
          batting_points: stats.batting_points,
          bowling_points: stats.bowling_points,
          fielding_points: stats.fielding_points,
          total_points: stats.total_points,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'player_id,season_id'
        })

      if (upsertError) {
        console.error('Error upserting player stats:', upsertError)
      }

      // Insert match performances
      for (const [matchId, perf] of stats.match_performances) {
        const totalPoints = perf.batting_points + perf.bowling_points + perf.fielding_points

        const { error: perfError } = await supabase
          .from('player_match_performance')
          .upsert({
            player_id: playerId,
            match_id: matchId,
            season_id: season.id,
            club_id: clubId,
            runs: perf.runs,
            balls_faced: perf.balls_faced,
            fours: perf.fours,
            sixes: perf.sixes,
            wickets: perf.wickets,
            overs_bowled: perf.overs_bowled,
            runs_conceded: perf.runs_conceded,
            maidens: perf.maidens,
            catches: perf.catches,
            stumpings: perf.stumpings,
            run_outs: perf.run_outs,
            batting_points: perf.batting_points,
            bowling_points: perf.bowling_points,
            fielding_points: perf.fielding_points,
            total_points: totalPoints
          }, {
            onConflict: 'player_id,match_id'
          })

        if (perfError) {
          console.error('Error upserting match performance:', perfError)
        }
      }
    }

    return NextResponse.json({
      message: 'Player statistics calculated successfully',
      processed: playerStats.size,
      matches: matches.length
    })

  } catch (error: any) {
    console.error('Stats calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
