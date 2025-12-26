import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = serviceRoleKey
      ? createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
      : null
    const readClient = adminClient ?? supabase
    const debugMode = request.nextUrl.searchParams.get('debug') === '1'

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
      .eq('id', id)
      .eq('club_id', userRole.club_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Fetch batting/bowling cards for each innings
    const inningsWithCards = await Promise.all(
      (match.innings || []).map(async (innings: any) => {
        const [battingCards, bowlingCards] = await Promise.all([
          readClient
            .from('batting_cards')
            .select(`
              *,
              players (first_name, last_name)
            `)
            .eq('innings_id', innings.id)
            .order('position', { ascending: true }),

          readClient
            .from('bowling_cards')
            .select(`
              *,
              players (first_name, last_name)
            `)
            .eq('innings_id', innings.id),
        ])

        let battingData = battingCards.data || []
        if (battingCards.error) {
          console.warn('Batting cards join failed, retrying without players:', battingCards.error.message)
          const fallback = await readClient
            .from('batting_cards')
            .select('*')
            .eq('innings_id', innings.id)
            .order('position', { ascending: true })
          if (!fallback.error) {
            battingData = fallback.data || []
          }
        }

        let bowlingData = bowlingCards.data || []
        if (bowlingCards.error) {
          console.warn('Bowling cards join failed, retrying without players:', bowlingCards.error.message)
          const fallback = await readClient
            .from('bowling_cards')
            .select('*')
            .eq('innings_id', innings.id)
          if (!fallback.error) {
            bowlingData = fallback.data || []
          }
        }

        return {
          ...innings,
          batting_cards: battingData,
          bowling_cards: bowlingData
        }
      })
    )

    const missingPlayerIds = new Set<string>()
    inningsWithCards.forEach((innings: any) => {
      ;(innings.batting_cards || []).forEach((card: any) => {
        if (!card.players && card.player_id) {
          missingPlayerIds.add(card.player_id)
        }
      })
      ;(innings.bowling_cards || []).forEach((card: any) => {
        if (!card.players && card.player_id) {
          missingPlayerIds.add(card.player_id)
        }
      })
    })

    const playerFallbackMap = new Map<string, { first_name: string; last_name: string }>()
    if (missingPlayerIds.size > 0) {
      const { data: fallbackPlayers } = await readClient
        .from('players')
        .select('id, first_name, last_name')
        .in('id', Array.from(missingPlayerIds))

      ;(fallbackPlayers || []).forEach((player: any) => {
        playerFallbackMap.set(player.id, {
          first_name: player.first_name,
          last_name: player.last_name
        })
      })
    }

    const inningsWithPlayers = inningsWithCards.map((innings: any) => ({
      ...innings,
      batting_cards: (innings.batting_cards || []).map((card: any) => ({
        ...card,
        players: card.players || playerFallbackMap.get(card.player_id) || null
      })),
      bowling_cards: (innings.bowling_cards || []).map((card: any) => ({
        ...card,
        players: card.players || playerFallbackMap.get(card.player_id) || null
      }))
    }))

    const { data: teamPlayers, error: teamPlayersError } = await readClient
      .from('team_players')
      .select(`
        player_id,
        players (first_name, last_name)
      `)
      .eq('team_id', match.team_id)

    if (teamPlayersError) {
      throw new Error(teamPlayersError.message)
    }

    const playerNameMap = new Map<string, string>()
    ;(teamPlayers || []).forEach((row: any) => {
      if (row.player_id && row.players) {
        const name = `${row.players.first_name || ''} ${row.players.last_name || ''}`.trim()
        playerNameMap.set(row.player_id, name)
      }
    })

    const teamPlayerIds = new Set((teamPlayers || []).map((row: any) => row.player_id))
    const matchPlayerIds = new Set<string>()
    inningsWithPlayers.forEach((innings: any) => {
      ;(innings.batting_cards || []).forEach((card: any) => {
        if (card.player_id && teamPlayerIds.has(card.player_id)) {
          matchPlayerIds.add(card.player_id)
        }
      })
      ;(innings.bowling_cards || []).forEach((card: any) => {
        if (card.player_id && teamPlayerIds.has(card.player_id)) {
          matchPlayerIds.add(card.player_id)
        }
      })
    })

    const { data: fieldingCards, error: fieldingCardsError } = await readClient
      .from('fielding_cards')
      .select(`
        *,
        players (first_name, last_name)
      `)
      .eq('match_id', match.id)

    const existingFieldingIds = new Set((fieldingCards || []).map((card: any) => card.player_id))
    const missingFieldingRows = Array.from(matchPlayerIds)
      .filter((playerId) => !existingFieldingIds.has(playerId))
      .map((playerId: any) => ({
        match_id: match.id,
        player_id: playerId,
        catches: 0,
        stumpings: 0,
        run_outs: 0,
        drops: 0,
        misfields: 0,
        derived: true
      }))

    if (missingFieldingRows.length > 0) {
      const { error: fieldingInsertError } = await readClient
        .from('fielding_cards')
        .insert(missingFieldingRows)
      if (fieldingInsertError) {
        console.warn('Fielding cards insert failed:', fieldingInsertError.message)
      }
    }

    const { data: refreshedFieldingCards, error: refreshedFieldingError } = await readClient
      .from('fielding_cards')
      .select(`
        *,
        players (first_name, last_name)
      `)
      .eq('match_id', match.id)

    let fieldingData = refreshedFieldingCards || []
    if (refreshedFieldingError || fieldingCardsError) {
      const fallback = await readClient
        .from('fielding_cards')
        .select('*')
        .eq('match_id', match.id)
      if (!fallback.error) {
        fieldingData = fallback.data || []
      }
    }

    const filteredFieldingCards = fieldingData
      .filter((card: any) => matchPlayerIds.has(card.player_id))
      .map((card: any) => ({
        ...card,
        runouts: card.runouts ?? card.run_outs ?? 0
      }))

    const inningsWithAttribution = (inningsWithPlayers || []).map((innings: any) => ({
      ...innings,
      batting_cards: (innings.batting_cards || []).map((card: any) => ({
        ...card,
        dismissal_bowler_name: card.dismissal_bowler_id
          ? playerNameMap.get(card.dismissal_bowler_id) || null
          : null,
        dismissal_fielder_name: card.dismissal_fielder_id
          ? playerNameMap.get(card.dismissal_fielder_id) || null
          : null
      }))
    }))

    const responsePayload: any = {
      match: {
        ...match,
        innings: inningsWithAttribution,
        fielding_cards: filteredFieldingCards,
        team_players: teamPlayers || []
      }
    }

    if (debugMode) {
      const { data: debugBattingMatch } = await readClient
        .from('batting_cards')
        .select('id, innings_id')
        .eq('match_id', match.id)
        .limit(25)

      const battingMatchCount = debugBattingMatch?.length || 0
      const battingMatchInnings = (debugBattingMatch || []).reduce<Record<string, number>>(
        (acc, row: any) => {
          const key = row.innings_id || 'null'
          acc[key] = (acc[key] || 0) + 1
          return acc
        },
        {}
      )

      responsePayload.debug = {
        usingServiceRole: Boolean(adminClient),
        inningsCount: inningsWithAttribution.length,
        battingCounts: inningsWithAttribution.map((innings: any) => innings.batting_cards?.length || 0),
        bowlingCounts: inningsWithAttribution.map((innings: any) => innings.bowling_cards?.length || 0),
        fieldingCount: filteredFieldingCards.length,
        battingMatchCount,
        battingMatchInnings
      }
    }

    return NextResponse.json(responsePayload)

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

    // Update match
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        opponent_name: body.opponent_name,
        match_date: body.match_date,
        venue: body.venue,
        match_type: body.match_type,
        result: body.result,
        published: body.published
      })
      .eq('id', id)
      .eq('club_id', userRole.club_id)

    if (matchError) {
      throw new Error(matchError.message)
    }

    // Update innings
    for (const innings of body.innings) {
      const { error: inningsError } = await supabase
        .from('innings')
        .update({
          batting_team: innings.batting_team,
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
            dismissal_type: card.dismissal_type,
            dismissal_text: card.dismissal_text,
            dismissal_fielder_id: card.dismissal_fielder_id || null,
            dismissal_bowler_id: card.dismissal_bowler_id || null
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

    if (Array.isArray(body.fielding_cards)) {
      const normalizeDismissal = (value: string | null | undefined) =>
        (value || '').toLowerCase().replace(/[_-]+/g, ' ').trim()

      const fieldingCounts = new Map<string, { catches: number; stumpings: number; runouts: number }>()

      for (const innings of body.innings || []) {
        if (innings.batting_team !== 'away') {
          continue
        }

        for (const card of innings.batting_cards || []) {
          if (!card.dismissal_fielder_id || !card.is_out) {
            continue
          }
          const dismissalType = normalizeDismissal(card.dismissal_type)
          const entry = fieldingCounts.get(card.dismissal_fielder_id) || { catches: 0, stumpings: 0, runouts: 0 }

          if (dismissalType === 'caught') {
            entry.catches += 1
          } else if (dismissalType === 'stumped') {
            entry.stumpings += 1
          } else if (dismissalType === 'run out' || dismissalType === 'runout') {
            entry.runouts += 1
          }

          fieldingCounts.set(card.dismissal_fielder_id, entry)
        }
      }

      for (const card of body.fielding_cards) {
        const counts = fieldingCounts.get(card.player_id) || { catches: 0, stumpings: 0, runouts: 0 }
        const { error: fieldingError } = await supabase
          .from('fielding_cards')
          .update({
            catches: counts.catches,
            stumpings: counts.stumpings,
            run_outs: counts.runouts,
            drops: card.drops,
            misfields: card.misfields
          })
          .eq('id', card.id)

        if (fieldingError) {
          throw new Error(fieldingError.message)
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

    // Delete match (cascade deletes will handle innings, batting_cards, bowling_cards, fielding_cards)
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('id', id)
      .eq('club_id', userRole.club_id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    try {
      const origin = request.headers.get('origin')
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
      if (baseUrl) {
        await fetch(`${baseUrl}/api/stats/calculate`, {
          method: 'POST',
          headers: {
            cookie: request.headers.get('cookie') || ''
          }
        })
      } else {
        console.warn('Stats recalculation skipped: missing base URL')
      }
    } catch (calcError) {
      console.warn('Stats recalculation failed after delete:', calcError)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete match error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
