import { NextResponse } from 'next/server'
import { playCricketService } from '../../../../lib/play-cricket-service'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { siteId, apiToken, clubId } = body

    if (!siteId || !apiToken) {
      return NextResponse.json(
        { error: 'Site ID and API Token are required' },
        { status: 400 }
      )
    }

    // Verify user is admin of the club
    const { data: roleData } = await supabase
      .from('user_org_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Test connection
    const isConnected = await playCricketService.testConnection({
      siteId,
      apiToken,
    })

    if (isConnected) {
      // Update club with Play Cricket credentials
      await supabase
        .from('clubs')
        .update({
          play_cricket_site_id: siteId,
          play_cricket_api_token: apiToken, // In production, encrypt this
          play_cricket_sync_enabled: true,
        })
        .eq('id', clubId)

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to Play Cricket API. Please check your credentials.',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error testing Play Cricket connection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
