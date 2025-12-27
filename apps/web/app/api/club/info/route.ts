import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug') === '1'
    const supabase = await createClient()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceSupabase =
      serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL
        ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
            auth: { persistSession: false },
          })
        : null

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club
    const { data: userRole, error: userRoleError } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    let serviceRoleError: string | null = null
    let serviceRoleData: { club_id: string } | null = null
    if (!userRole && serviceSupabase) {
      const { data, error } = await serviceSupabase
        .from('user_org_roles')
        .select('club_id')
        .eq('user_id', user.id)
        .single()
      serviceRoleData = data
      serviceRoleError = error?.message ?? null
    }

    const roleData = userRole || serviceRoleData

    if (!roleData?.club_id) {
      if (debug) {
        return NextResponse.json(
          {
            error: 'Club not found',
            debug: {
              userId: user.id,
              hasServiceRole: Boolean(serviceSupabase),
              userRoleError: userRoleError?.message ?? null,
              serviceRoleError,
            },
          },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const { data: club, error: clubError } = serviceSupabase
      ? await serviceSupabase
          .from('clubs')
          .select('id, name, slug')
          .eq('id', roleData.club_id)
          .single()
      : await supabase
          .from('clubs')
          .select('id, name, slug')
          .eq('id', roleData.club_id)
          .single()

    if (clubError || !club) {
      console.error('Club info club error:', clubError)
      if (debug) {
        return NextResponse.json(
          {
            error: 'Club not found',
            debug: {
              clubId: roleData.club_id,
              hasServiceRole: Boolean(serviceSupabase),
              clubError: clubError?.message ?? null,
            },
          },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Try to get Play Cricket fields if they exist (migration may not be applied yet)
    let playCricketFields = {
      play_cricket_site_id: null,
      play_cricket_api_token: null,
      play_cricket_sync_enabled: false,
      play_cricket_last_sync: null,
    }

    try {
      const { data: clubWithPC } = serviceSupabase
        ? await serviceSupabase
            .from('clubs')
            .select(
              'play_cricket_site_id, play_cricket_api_token, play_cricket_sync_enabled, play_cricket_last_sync'
            )
            .eq('id', club.id)
            .single()
        : await supabase
            .from('clubs')
            .select(
              'play_cricket_site_id, play_cricket_api_token, play_cricket_sync_enabled, play_cricket_last_sync'
            )
            .eq('id', club.id)
            .single()

      if (clubWithPC) {
        playCricketFields = clubWithPC
      }
    } catch (error) {
      // Columns don't exist yet - migration not applied
      console.log('Play Cricket columns not found - migration may not be applied')
    }

    let clubExtras: Record<string, any> = {}
    try {
      const { data: extras } = serviceSupabase
        ? await serviceSupabase
            .from('clubs')
            .select('brand, tier, billing_status')
            .eq('id', club.id)
            .single()
        : await supabase
            .from('clubs')
            .select('brand, tier, billing_status')
            .eq('id', club.id)
            .single()

      if (extras) {
        clubExtras = extras as Record<string, any>
      }
    } catch (error) {
      console.log('Club optional fields not found - migration may not be applied')
    }

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
        ...clubExtras,
        ...playCricketFields,
      },
    })
  } catch (error: any) {
    console.error('Club info error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
