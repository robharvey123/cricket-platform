import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

/**
 * Development endpoint to make the current user an admin
 * Only works in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user's club (or get the first club)
    let { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single()

    let clubId = userRole?.club_id

    // If user not in a club, find the first club
    if (!clubId) {
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single()

      if (!clubs) {
        return NextResponse.json({ error: 'No clubs found in database' }, { status: 404 })
      }

      clubId = clubs.id

      // Insert user into club as admin
      const { error: insertError } = await supabase
        .from('user_org_roles')
        .insert({
          user_id: user.id,
          club_id: clubId,
          role: 'admin'
        })

      if (insertError) {
        throw insertError
      }

      return NextResponse.json({
        success: true,
        message: 'User added to club as admin',
        email: user.email,
        role: 'admin',
        clubId
      })
    }

    // Update existing role to admin
    const { error: updateError } = await supabase
      .from('user_org_roles')
      .update({ role: 'admin' })
      .eq('user_id', user.id)
      .eq('club_id', clubId)

    if (updateError) {
      throw updateError
    }

    // Log the change
    await supabase.rpc('log_audit', {
      p_club_id: clubId,
      p_action: 'update',
      p_entity_type: 'user_role',
      p_entity_id: user.id,
      p_changes: {
        old_role: userRole?.role || 'none',
        new_role: 'admin'
      },
      p_metadata: {
        source: 'dev_endpoint'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User role updated to admin',
      email: user.email,
      role: 'admin',
      clubId
    })
  } catch (error: any) {
    console.error('Make admin error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
