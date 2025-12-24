import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

/**
 * Temporary endpoint to fix existing matches that were created with inactive season
 * Updates all matches to use the active season
 */
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

    const clubId = userRole.club_id

    // Get active season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (!activeSeason) {
      return NextResponse.json({ error: 'No active season found' }, { status: 404 })
    }

    // Update all matches for this club to use the active season
    const { data: matches, error: updateError } = await supabase
      .from('matches')
      .update({ season_id: activeSeason.id })
      .eq('club_id', clubId)
      .select('id')

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({
      message: 'Matches updated successfully',
      updated: matches?.length || 0,
      season_id: activeSeason.id
    })

  } catch (error: any) {
    console.error('Fix season error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
