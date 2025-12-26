import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const playerId = body.player_id || null

    // Clear any existing link for this user in the club
    const { error: clearError } = await supabase
      .from('players')
      .update({ user_id: null })
      .eq('club_id', userRole.club_id)
      .eq('user_id', id)

    if (clearError) {
      throw new Error(clearError.message)
    }

    if (playerId) {
      const { data: targetPlayer, error: targetPlayerError } = await supabase
        .from('players')
        .select('id, user_id')
        .eq('id', playerId)
        .eq('club_id', userRole.club_id)
        .single()

      if (targetPlayerError || !targetPlayer) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
      }

      const { data: existingLink, error: linkCheckError } = await supabase
        .from('players')
        .select('id, user_id')
        .eq('id', playerId)
        .eq('club_id', userRole.club_id)
        .single()

      if (linkCheckError) {
        throw new Error(linkCheckError.message)
      }

      if (existingLink?.user_id && existingLink.user_id !== id) {
        return NextResponse.json(
          { error: 'Player profile is already linked to another user.' },
          { status: 409 }
        )
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('players')
        .update({ user_id: id })
        .eq('id', playerId)
        .eq('club_id', userRole.club_id)
        .select('id')

      if (updateError) {
        throw new Error(updateError.message)
      }

      if (!updatedRows || updatedRows.length === 0) {
        return NextResponse.json(
          { error: 'Linking failed or not permitted' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ success: true, player_id: playerId })
  } catch (error: any) {
    console.error('Update user player link error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
