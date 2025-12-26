import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

    // Only admins can view user list
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all users for this club
    const { data: clubUsers, error: usersError } = await supabase
      .from('user_org_roles')
      .select(`
        user_id,
        role,
        created_at
      `)
      .eq('club_id', userRole.club_id)

    if (usersError) {
      throw new Error(usersError.message)
    }

    // Fetch players to map user -> player profile
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, user_id, first_name, last_name')
      .eq('club_id', userRole.club_id)

    if (playersError) {
      throw new Error(playersError.message)
    }

    const playerByUserId = new Map(
      (players || [])
        .filter((player) => player.user_id)
        .map((player) => [
          player.user_id,
          {
            id: player.id,
            name: `${player.first_name || ''} ${player.last_name || ''}`.trim()
          }
        ])
    )

    // Get user details from auth.users (metadata) using service role if available
    let authUsers: {
      users: Array<{
        id: string
        email?: string | null
        last_sign_in_at?: string | null
        user_metadata?: Record<string, any>
      }>
    } | null = null
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (serviceRoleKey) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: { autoRefreshToken: false, persistSession: false }
        }
      )

      const { data, error: adminError } = await adminClient.auth.admin.listUsers()
      if (adminError) {
        console.warn('Admin listUsers failed:', adminError.message)
      } else {
        authUsers = data
      }
    }

    const usersWithDetails = clubUsers?.map(clubUser => {
      const authUser = authUsers?.users.find(u => u.id === clubUser.user_id)
      const fallbackEmail = clubUser.user_id === user.id ? user.email : null
      const authName = authUser?.user_metadata?.full_name
        || authUser?.user_metadata?.name
        || authUser?.user_metadata?.first_name
        || null
      const linkedPlayer = playerByUserId.get(clubUser.user_id) || null
      return {
        user_id: clubUser.user_id,
        email: authUser?.email || fallbackEmail || 'Unknown',
        name: authName,
        player_id: linkedPlayer?.id || null,
        player_name: linkedPlayer?.name || null,
        role: clubUser.role,
        created_at: clubUser.created_at,
        last_sign_in: authUser?.last_sign_in_at
      }
    }) || []

    return NextResponse.json({
      users: usersWithDetails,
      players: (players || []).map((player) => ({
        id: player.id,
        name: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
        user_id: player.user_id
      }))
    })
  } catch (error: any) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
