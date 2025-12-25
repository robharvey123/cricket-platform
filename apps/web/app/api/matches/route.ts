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

    // Fetch matches for the user's club
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        teams (
          id,
          name
        )
      `)
      .eq('club_id', userRole.club_id)
      .order('match_date', { ascending: false })

    if (matchesError) {
      console.error('Matches fetch error:', matchesError)
      return NextResponse.json(
        { error: 'Failed to fetch matches', details: matchesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ matches: matches || [] })

  } catch (error: any) {
    console.error('Matches API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
