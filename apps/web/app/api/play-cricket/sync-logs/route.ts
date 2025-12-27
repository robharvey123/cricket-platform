import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clubId = searchParams.get('clubId')

    if (!clubId) {
      return NextResponse.json(
        { error: 'Club ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this club
    const { data: roleData } = await supabase
      .from('user_org_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .single()

    if (!roleData) {
      return NextResponse.json(
        { error: 'Unauthorized: No access to this club' },
        { status: 403 }
      )
    }

    // Fetch sync logs
    const { data: logs, error } = await supabase
      .from('play_cricket_sync_logs')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching sync logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
