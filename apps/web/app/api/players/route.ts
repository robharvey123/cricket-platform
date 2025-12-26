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

    // Fetch all club players with season stats
    let playersQuery = supabase
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
          matches_bowled,
          catches,
          stumpings,
          run_outs,
          drops,
          fielding_points,
          season_id
        )
      `)
      .eq('club_id', userRole.club_id)
      .order('last_name', { ascending: true })

    let { data: players, error: playersError } = await playersQuery

    if (playersError) {
      console.warn('Players stats join failed, retrying without stats:', playersError.message)
      const fallback = await supabase
        .from('players')
        .select('*')
        .eq('club_id', userRole.club_id)
        .order('last_name', { ascending: true })

      if (fallback.error) {
        throw new Error(fallback.error.message)
      }

      players = fallback.data || []
    }

    // Transform the data to flatten season stats
    const playersWithStats = (players || []).map(player => {
      // Filter stats for active season only
      const seasonStats = (player.player_season_stats || []).find(
        (stats: any) => stats.season_id === activeSeason?.id
      )

      return {
        ...player,
        full_name: player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim(),
        season_stats: seasonStats || null
      }
    })

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
