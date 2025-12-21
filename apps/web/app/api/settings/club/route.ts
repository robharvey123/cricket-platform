import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { play_cricket_site_id, play_cricket_api_token } = body

    if (!play_cricket_site_id || !play_cricket_api_token) {
      return NextResponse.json(
        { error: 'Site ID and API Token are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    if (userRole.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only club administrators can update settings' },
        { status: 403 }
      )
    }

    // Update club settings
    const { error: updateError } = await supabase
      .from('clubs')
      .update({
        play_cricket_site_id,
        play_cricket_api_token,
      })
      .eq('id', userRole.club_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
