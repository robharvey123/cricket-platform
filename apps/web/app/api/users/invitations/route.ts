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

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Only admins can view invitations
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        expires_at,
        invited_by
      `)
      .eq('club_id', userRole.club_id)
      .order('created_at', { ascending: false })

    if (invitationsError) {
      throw new Error(invitationsError.message)
    }

    // Get inviter details
    const inviterIds = [...new Set(invitations?.map(inv => inv.invited_by) || [])]
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    const invitationsWithDetails = invitations?.map(invitation => {
      const inviter = authUsers?.users.find(u => u.id === invitation.invited_by)
      return {
        ...invitation,
        invited_by_email: inviter?.email || 'Unknown'
      }
    }) || []

    return NextResponse.json({ invitations: invitationsWithDetails })
  } catch (error: any) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
