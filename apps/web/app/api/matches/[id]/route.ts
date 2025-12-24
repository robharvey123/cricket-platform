import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch match with innings
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        innings (
          id,
          innings_number,
          batting_team,
          total_runs,
          wickets,
          overs,
          extras
        )
      `)
      .eq('id', params.id)
      .eq('club_id', userRole.club_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Fetch batting cards for each innings
    const inningsWithCards = await Promise.all(
      (match.innings || []).map(async (innings: any) => {
        const [battingCards, bowlingCards, fieldingCards] = await Promise.all([
          supabase
            .from('batting_cards')
            .select(`
              *,
              players (first_name, last_name)
            `)
            .eq('innings_id', innings.id)
            .order('position', { ascending: true }),

          supabase
            .from('bowling_cards')
            .select(`
              *,
              players (first_name, last_name)
            `)
            .eq('innings_id', innings.id),

          supabase
            .from('fielding_cards')
            .select(`
              *,
              players (first_name, last_name)
            `)
            .eq('match_id', match.id)
        ])

        return {
          ...innings,
          batting_cards: battingCards.data || [],
          bowling_cards: bowlingCards.data || [],
          fielding_cards: fieldingCards.data || []
        }
      })
    )

    return NextResponse.json({
      match: {
        ...match,
        innings: inningsWithCards
      }
    })

  } catch (error: any) {
    console.error('Match detail API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Update match
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        opponent_name: body.opponent_name,
        match_date: body.match_date,
        venue: body.venue,
        match_type: body.match_type,
        result: body.result
      })
      .eq('id', params.id)
      .eq('club_id', userRole.club_id)

    if (matchError) {
      throw new Error(matchError.message)
    }

    // Update innings
    for (const innings of body.innings) {
      const { error: inningsError } = await supabase
        .from('innings')
        .update({
          total_runs: innings.total_runs,
          wickets: innings.wickets,
          overs: innings.overs,
          extras: innings.extras
        })
        .eq('id', innings.id)

      if (inningsError) {
        throw new Error(inningsError.message)
      }

      // Update batting cards
      for (const card of innings.batting_cards) {
        const { error: battingError } = await supabase
          .from('batting_cards')
          .update({
            runs: card.runs,
            balls_faced: card.balls_faced,
            fours: card.fours,
            sixes: card.sixes,
            is_out: card.is_out,
            dismissal_text: card.dismissal_text
          })
          .eq('id', card.id)

        if (battingError) {
          throw new Error(battingError.message)
        }
      }

      // Update bowling cards
      for (const card of innings.bowling_cards) {
        const { error: bowlingError } = await supabase
          .from('bowling_cards')
          .update({
            overs: card.overs,
            maidens: card.maidens,
            runs_conceded: card.runs_conceded,
            wickets: card.wickets,
            wides: card.wides,
            no_balls: card.no_balls
          })
          .eq('id', card.id)

        if (bowlingError) {
          throw new Error(bowlingError.message)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Match update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
