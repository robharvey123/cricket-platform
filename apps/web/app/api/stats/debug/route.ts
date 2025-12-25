import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const { data: season } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .eq('club_id', userRole.club_id)
      .order('start_date', { ascending: false })
      .limit(5)

    const { data: stats, error: statsError } = await supabase
      .from('player_season_stats')
      .select('player_id, season_id, total_points, innings_batted, innings_bowled, club_id')
      .eq('club_id', userRole.club_id)
      .limit(20)

    if (statsError) {
      throw new Error(statsError.message)
    }

    return NextResponse.json({
      seasons: season || [],
      sample_stats: stats || []
    })
  } catch (error: any) {
    console.error('Stats debug error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
