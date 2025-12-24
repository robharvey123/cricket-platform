import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

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
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Fetch all seasons
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('*')
      .eq('club_id', userRole.club_id)
      .order('start_date', { ascending: false })

    if (seasonsError) {
      throw new Error(seasonsError.message)
    }

    return NextResponse.json({ seasons })

  } catch (error: any) {
    console.error('Seasons API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

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
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const body = await request.json()

    // If this season is being set to active, deactivate all others
    if (body.is_active) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('club_id', userRole.club_id)
    }

    // Create new season
    const { data: season, error: createError } = await supabase
      .from('seasons')
      .insert({
        club_id: userRole.club_id,
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: body.is_active || false
      })
      .select()
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    return NextResponse.json({ season })

  } catch (error: any) {
    console.error('Create season error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
