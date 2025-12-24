import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch player details
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', params.id)
      .eq('club_id', userRole.club_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Get active season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('club_id', userRole.club_id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    // Fetch season stats for active season
    let seasonStats = null
    if (activeSeason) {
      const { data: stats } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', params.id)
        .eq('season_id', activeSeason.id)
        .single()

      seasonStats = stats
    }

    // Fetch all season stats for career totals
    const { data: careerStats } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('player_id', params.id)

    // Calculate career totals
    const careerTotals = careerStats?.reduce((acc, season) => ({
      matches_batted: (acc.matches_batted || 0) + (season.matches_batted || 0),
      innings_batted: (acc.innings_batted || 0) + (season.innings_batted || 0),
      not_outs: (acc.not_outs || 0) + (season.not_outs || 0),
      runs_scored: (acc.runs_scored || 0) + (season.runs_scored || 0),
      balls_faced: (acc.balls_faced || 0) + (season.balls_faced || 0),
      fours: (acc.fours || 0) + (season.fours || 0),
      sixes: (acc.sixes || 0) + (season.sixes || 0),
      highest_score: Math.max(acc.highest_score || 0, season.highest_score || 0),
      fifties: (acc.fifties || 0) + (season.fifties || 0),
      hundreds: (acc.hundreds || 0) + (season.hundreds || 0),
      ducks: (acc.ducks || 0) + (season.ducks || 0),
      matches_bowled: (acc.matches_bowled || 0) + (season.matches_bowled || 0),
      innings_bowled: (acc.innings_bowled || 0) + (season.innings_bowled || 0),
      overs_bowled: (acc.overs_bowled || 0) + (season.overs_bowled || 0),
      maidens: (acc.maidens || 0) + (season.maidens || 0),
      runs_conceded: (acc.runs_conceded || 0) + (season.runs_conceded || 0),
      wickets: (acc.wickets || 0) + (season.wickets || 0),
      best_bowling_wickets: Math.max(acc.best_bowling_wickets || 0, season.best_bowling_wickets || 0),
      three_fors: (acc.three_fors || 0) + (season.three_fors || 0),
      five_fors: (acc.five_fors || 0) + (season.five_fors || 0),
      catches: (acc.catches || 0) + (season.catches || 0),
      stumpings: (acc.stumpings || 0) + (season.stumpings || 0),
      run_outs: (acc.run_outs || 0) + (season.run_outs || 0),
      total_points: (acc.total_points || 0) + (season.total_points || 0)
    }), {
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
      three_fors: 0,
      five_fors: 0,
      catches: 0,
      stumpings: 0,
      run_outs: 0,
      total_points: 0
    })

    // Calculate career averages
    const careerDismissals = (careerTotals?.innings_batted || 0) - (careerTotals?.not_outs || 0)
    const careerBattingAverage = careerDismissals > 0 ?
      Math.round((careerTotals?.runs_scored || 0) / careerDismissals * 100) / 100 : null

    const careerBattingStrikeRate = (careerTotals?.balls_faced || 0) > 0 ?
      Math.round((careerTotals?.runs_scored || 0) / (careerTotals?.balls_faced || 0) * 10000) / 100 : null

    const careerBowlingAverage = (careerTotals?.wickets || 0) > 0 ?
      Math.round((careerTotals?.runs_conceded || 0) / (careerTotals?.wickets || 0) * 100) / 100 : null

    const careerBowlingEconomy = (careerTotals?.overs_bowled || 0) > 0 ?
      Math.round((careerTotals?.runs_conceded || 0) / (careerTotals?.overs_bowled || 0) * 100) / 100 : null

    // Fetch recent match performances
    const { data: recentPerformances } = await supabase
      .from('player_match_performance')
      .select(`
        *,
        matches:match_id (
          id,
          match_date,
          opponent_name,
          result
        )
      `)
      .eq('player_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      player,
      seasonStats,
      activeSeason,
      careerTotals: {
        ...careerTotals,
        batting_average: careerBattingAverage,
        batting_strike_rate: careerBattingStrikeRate,
        bowling_average: careerBowlingAverage,
        bowling_economy: careerBowlingEconomy
      },
      recentPerformances,
      allSeasonStats: careerStats
    })

  } catch (error: any) {
    console.error('Player API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
