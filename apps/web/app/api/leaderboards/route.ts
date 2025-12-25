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
      .select('id, name')
      .eq('club_id', userRole.club_id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (!activeSeason) {
      return NextResponse.json({ error: 'No active season found' }, { status: 404 })
    }

    const { data: battingLeaderboard } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('season_id', activeSeason.id)
      .eq('club_id', userRole.club_id)
      .gt('innings_batted', 0)
      .order('runs_scored', { ascending: false })
      .limit(20)

    const { data: bowlingLeaderboard } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('season_id', activeSeason.id)
      .eq('club_id', userRole.club_id)
      .gt('innings_bowled', 0)
      .order('wickets', { ascending: false })
      .limit(20)

    const { data: pointsLeaderboard } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('season_id', activeSeason.id)
      .eq('club_id', userRole.club_id)
      .gt('total_points', 0)
      .order('total_points', { ascending: false })
      .limit(20)

    const { data: averageLeaderboard } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('season_id', activeSeason.id)
      .eq('club_id', userRole.club_id)
      .gte('innings_batted', 3)
      .not('batting_average', 'is', null)
      .order('batting_average', { ascending: false })
      .limit(10)

    const { data: economyLeaderboard } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('season_id', activeSeason.id)
      .eq('club_id', userRole.club_id)
      .gte('overs_bowled', 10)
      .not('bowling_economy', 'is', null)
      .order('bowling_economy', { ascending: true })
      .limit(10)

    const allRows = [
      ...(battingLeaderboard || []),
      ...(bowlingLeaderboard || []),
      ...(pointsLeaderboard || []),
      ...(averageLeaderboard || []),
      ...(economyLeaderboard || [])
    ]
    const playerIds = Array.from(
      new Set(allRows.map((row: any) => row.player_id).filter(Boolean))
    )

    let playerMap = new Map<string, any>()
    if (playerIds.length > 0) {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .eq('club_id', userRole.club_id)
        .in('id', playerIds)

      if (playersError) {
        throw new Error(playersError.message)
      }

      playerMap = new Map(
        (players || []).map((player: any) => [
          player.id,
          {
            ...player,
            full_name: `${player.first_name || ''} ${player.last_name || ''}`.trim()
          }
        ])
      )
    }

    const attachNames = (rows: any[] | null) =>
      (rows || []).map((row) => ({
        ...row,
        players: playerMap.get(row.player_id) || null
      }))

    return NextResponse.json({
      activeSeason,
      batting: attachNames(battingLeaderboard),
      bowling: attachNames(bowlingLeaderboard),
      points: attachNames(pointsLeaderboard),
      average: attachNames(averageLeaderboard),
      economy: attachNames(economyLeaderboard)
    })

  } catch (error: any) {
    console.error('Leaderboards API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
