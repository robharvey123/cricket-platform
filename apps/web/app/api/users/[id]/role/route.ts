import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { sendRoleChangeEmail } from '../../../../../lib/email'

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

    // Only admins can change roles
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { role: newRole } = body

    if (!['player', 'captain', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get old role for audit log
    const { data: oldRoleData } = await supabase
      .from('user_org_roles')
      .select('role')
      .eq('user_id', id)
      .eq('club_id', userRole.club_id)
      .single()

    // Update role
    const { error: updateError } = await supabase
      .from('user_org_roles')
      .update({ role: newRole })
      .eq('user_id', id)
      .eq('club_id', userRole.club_id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Log the change
    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'update',
      p_entity_type: 'user_role',
      p_entity_id: id,
      p_changes: {
        old_role: oldRoleData?.role,
        new_role: newRole
      }
    })

    // Get target user's email and current user's email for notification
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const targetUser = authUsers?.find(u => u.id === id)
    const currentUser = authUsers?.find(u => u.id === user.id)

    if (targetUser?.email && currentUser?.email) {
      // Send email notification (async, don't wait)
      sendRoleChangeEmail(
        targetUser.email,
        oldRoleData?.role || 'unknown',
        newRole,
        currentUser.email
      ).catch(err => console.error('Failed to send role change email:', err))
    }

    return NextResponse.json({ success: true, role: newRole })
  } catch (error: any) {
    console.error('Update role error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
