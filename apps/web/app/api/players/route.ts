import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get active season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', userRole.club_id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    // Fetch all players with season stats
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        *,
        player_season_stats!left (
          runs_scored,
          wickets,
          total_points,
          batting_average,
          bowling_economy,
          matches_batted,
          matches_bowled
        )
      `)
      .eq('club_id', userRole.club_id)
      .eq('player_season_stats.season_id', activeSeason?.id || '')
      .order('last_name', { ascending: true })

    if (playersError) {
      throw new Error(playersError.message)
    }

    // Transform the data to flatten season stats
    const playersWithStats = (players || []).map(player => ({
      ...player,
      season_stats: player.player_season_stats?.[0] || null
    }))

    return NextResponse.json({
      players: playersWithStats,
      activeSeason
    })

  } catch (error: any) {
    console.error('Players API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
