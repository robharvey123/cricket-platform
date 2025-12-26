import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { randomBytes } from 'crypto'
import { sendInvitationEmail } from '../../../../lib/email'

export async function POST(request: NextRequest) {
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

    // Only admins can invite users
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    if (!['player', 'captain', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_org_roles')
      .select('user_id')
      .eq('club_id', userRole.club_id)
      .limit(1)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already belongs to this club' },
        { status: 400 }
      )
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        club_id: userRole.club_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      throw new Error(inviteError.message)
    }

    // Log the invitation
    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'create',
      p_entity_type: 'user_invitation',
      p_entity_id: invitation.id,
      p_metadata: {
        email,
        role
      }
    })

    // Get current user's email for notification
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const inviter = authUsers?.find(u => u.id === currentUser?.id)

    // Send invitation email (async, don't wait)
    if (inviter?.email) {
      sendInvitationEmail(
        email,
        inviter.email,
        role,
        token
      ).catch(err => console.error('Failed to send invitation email:', err))
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`
    console.log('Invitation link:', inviteLink)

    return NextResponse.json({
      success: true,
      invitation,
      inviteLink // Include for testing/manual sharing
    })
  } catch (error: any) {
    console.error('Invite user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
