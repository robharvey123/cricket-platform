import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

// Get current user's player profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role and club
    const { data: userRole, error: roleError } = await supabase
      .from('user_org_roles')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Find player profile linked to this user
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, first_name, last_name, user_id, bio, preferred_position, jersey_number, photo_url')
      .eq('user_id', user.id)
      .eq('club_id', userRole.club_id)
      .single()

    if (playerError) {
      if (playerError.code === 'PGRST116') {
        // No player profile found
        return NextResponse.json({ error: 'No player profile linked' }, { status: 404 })
      }
      throw playerError
    }

    const displayName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim()
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
        .eq('player_id', player.id)
        .eq('season_id', activeSeason.id)
        .single()

      seasonStats = stats
    }

    // Fetch all season stats for career totals
    const { data: careerStats } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('player_id', player.id)

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
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      player: {
        ...player,
        name: displayName
      },
      seasonStats,
      activeSeason,
      careerTotals: {
        ...careerTotals,
        batting_average: careerBattingAverage,
        batting_strike_rate: careerBattingStrikeRate,
        bowling_average: careerBowlingAverage,
        bowling_economy: careerBowlingEconomy
      },
      recentPerformances
    })
  } catch (error: any) {
    console.error('Get player profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update current user's player profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role and club
    const { data: userRole, error: roleError } = await supabase
      .from('user_org_roles')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Find player profile
    const { data: existingPlayer, error: findError } = await supabase
      .from('players')
      .select('id, first_name, last_name, bio, preferred_position, jersey_number')
      .eq('user_id', user.id)
      .eq('club_id', userRole.club_id)
      .single()

    if (findError) {
      if (findError.code === 'PGRST116') {
        return NextResponse.json({ error: 'No player profile linked' }, { status: 404 })
      }
      throw findError
    }

    const body = await request.json()
    const { bio, preferred_position, jersey_number } = body

    // Update player profile
    const { data: player, error: updateError } = await supabase
      .from('players')
      .update({
        bio,
        preferred_position,
        jersey_number
      })
      .eq('id', existingPlayer.id)
      .select('id, first_name, last_name, user_id, bio, preferred_position, jersey_number, photo_url')
      .single()

    if (updateError) {
      throw updateError
    }

    // Log audit
    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'update',
      p_entity_type: 'player',
      p_entity_id: player.id,
      p_changes: {
        old_bio: existingPlayer.bio,
        new_bio: bio,
        old_preferred_position: existingPlayer.preferred_position,
        new_preferred_position: preferred_position,
        old_jersey_number: existingPlayer.jersey_number,
        new_jersey_number: jersey_number
      },
      p_metadata: {
        self_service: true
      }
    })

    const updatedName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim()
    return NextResponse.json({
      player: {
        ...player,
        name: updatedName
      }
    })
  } catch (error: any) {
    console.error('Update player profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
