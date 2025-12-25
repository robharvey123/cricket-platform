import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

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
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: 'Please create an active season first. Go to Seasons → Add Season and ensure "Active" is checked.' },
        { status: 400 }
      )
    }

    // Get first team for the club
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('club_id', clubId)
      .limit(1)
      .single()

    if (!team) {
      return NextResponse.json(
        { error: 'Please create a team first. Go to Teams → Add Team.' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Create match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        club_id: clubId,
        season_id: season.id,
        team_id: team.id,
        match_date: body.match_date,
        opponent_name: body.opponent_name,
        venue: body.venue || null,
        match_type: body.match_type,
        result: body.result,
        published: false // Matches start as draft
      })
      .select('id')
      .single()

    if (matchError) {
      throw new Error(matchError.message)
    }

    return NextResponse.json({
      matchId: match.id,
      message: 'Match created successfully'
    })

  } catch (error: any) {
    console.error('Create manual match error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
