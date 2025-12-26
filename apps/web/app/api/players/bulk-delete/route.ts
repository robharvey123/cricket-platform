import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { playerIds } = await request.json()

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'playerIds is required' }, { status: 400 })
    }

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
      .select('id, first_name, last_name')
      .eq('club_id', userRole.club_id)
      .in('id', playerIds)

    if (playersError) {
      throw new Error(playersError.message)
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('club_id', userRole.club_id)
      .in('id', playerIds)
      .select('id')

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Delete failed or not permitted' }, { status: 403 })
    }

    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'delete',
      p_entity_type: 'player_bulk_delete',
      p_entity_id: null,
      p_changes: {
        player_ids: (deletedRows || []).map((row) => row.id),
        player_names: (players || []).map((player) =>
          `${player.first_name || ''} ${player.last_name || ''}`.trim()
        )
      }
    })

    return NextResponse.json({ success: true, deleted: deletedRows.length })
  } catch (error: any) {
    console.error('Bulk delete players error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
