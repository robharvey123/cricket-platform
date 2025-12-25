import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

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

    // Update season
    const { data: season, error: updateError } = await supabase
      .from('seasons')
      .update({
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: body.is_active
      })
      .eq('id', id)
      .eq('club_id', userRole.club_id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({ season })

  } catch (error: any) {
    console.error('Update season error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Delete season
    const { error: deleteError } = await supabase
      .from('seasons')
      .delete()
      .eq('id', id)
      .eq('club_id', userRole.club_id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete season error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
