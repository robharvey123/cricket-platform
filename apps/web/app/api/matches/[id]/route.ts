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
