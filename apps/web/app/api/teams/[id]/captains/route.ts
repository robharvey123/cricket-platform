import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

// Get team captains
export async function GET(
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

    // Get user's role
    const { data: userRole, error: roleError } = await supabase
      .from('user_org_roles')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Get team captains with user details
    const { data: captains, error: captainsError } = await supabase
      .from('team_captains')
      .select(`
        id,
        team_id,
        user_id,
        assigned_at
      `)
      .eq('team_id', id)

    if (captainsError) {
      throw captainsError
    }

    // Get user details from auth
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    // Combine captain data with user details
    const captainsWithDetails = captains?.map(captain => {
      const authUser = authUsers?.find(u => u.id === captain.user_id)
      return {
        id: captain.id,
        user_id: captain.user_id,
        email: authUser?.email || 'Unknown',
        assigned_at: captain.assigned_at
      }
    })

    return NextResponse.json({
      captains: captainsWithDetails || []
    })
  } catch (error: any) {
    console.error('Get team captains error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Assign captain to team
export async function POST(
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

    // Get user's role
    const { data: userRole, error: roleError } = await supabase
      .from('user_org_roles')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Check permissions (admin or captain)
    if (userRole.role !== 'admin' && userRole.role !== 'captain') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify the team belongs to the club
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', id)
      .eq('club_id', userRole.club_id)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Verify the user exists in the club
    const { data: targetUser, error: targetUserError } = await supabase
      .from('user_org_roles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('club_id', userRole.club_id)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found in club' }, { status: 404 })
    }

    // Check if already a captain
    const { data: existing } = await supabase
      .from('team_captains')
      .select('id')
      .eq('team_id', id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User is already a captain of this team' }, { status: 400 })
    }

    // Assign captain
    const { data: captain, error: insertError } = await supabase
      .from('team_captains')
      .insert({
        team_id: id,
        user_id: userId
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Log audit
    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'create',
      p_entity_type: 'team_captain',
      p_entity_id: captain.id,
      p_changes: {
        team_id: id,
        user_id: userId
      },
      p_metadata: {
        team_name: team.name
      }
    })

    return NextResponse.json({ captain })
  } catch (error: any) {
    console.error('Assign team captain error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove captain from team
export async function DELETE(
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

    // Get user's role
    const { data: userRole, error: roleError } = await supabase
      .from('user_org_roles')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Check permissions (admin or captain)
    if (userRole.role !== 'admin' && userRole.role !== 'captain') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const captainId = searchParams.get('captainId')

    if (!captainId) {
      return NextResponse.json({ error: 'Captain ID is required' }, { status: 400 })
    }

    // Get captain details before deletion
    const { data: captain, error: captainError } = await supabase
      .from('team_captains')
      .select('id, team_id, user_id')
      .eq('id', captainId)
      .eq('team_id', id)
      .single()

    if (captainError || !captain) {
      return NextResponse.json({ error: 'Captain assignment not found' }, { status: 404 })
    }

    // Remove captain
    const { error: deleteError } = await supabase
      .from('team_captains')
      .delete()
      .eq('id', captainId)

    if (deleteError) {
      throw deleteError
    }

    // Log audit
    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'delete',
      p_entity_type: 'team_captain',
      p_entity_id: captain.id,
      p_changes: {
        team_id: captain.team_id,
        user_id: captain.user_id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Remove team captain error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
