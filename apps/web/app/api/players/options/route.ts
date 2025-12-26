import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club and role
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, user_id')
      .eq('club_id', userRole.club_id)
      .order('last_name', { ascending: true })

    if (playersError) {
      throw new Error(playersError.message)
    }

    return NextResponse.json({ players: players || [] })
  } catch (error: any) {
    console.error('Players options error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
