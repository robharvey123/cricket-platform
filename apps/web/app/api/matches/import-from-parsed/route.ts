import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const parsedData = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
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

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', userRole.club_id)
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

    const requestedTeamId = parsedData.team_id as string | undefined

    const teamQuery = supabase
      .from('teams')
      .select('id, name')
      .eq('club_id', userRole.club_id)

    const { data: team } = requestedTeamId
      ? await teamQuery.eq('id', requestedTeamId).single()
      : await teamQuery.limit(1).single()

    if (!team) {
      return NextResponse.json(
        { error: requestedTeamId ? 'Selected team not found for your club.' : 'Please create a team first. Go to Teams → Add Team.' },
        { status: 400 }
      )
    }

    const normalizeName = (value: string) =>
      value.toLowerCase().replace(/\s+/g, ' ').trim()

    // Get all players for name matching
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('club_id', userRole.club_id)

    const playerMap = new Map<string, string>()
    players?.forEach(p => {
      const fullName = normalizeName(`${p.first_name} ${p.last_name}`)
      playerMap.set(fullName, p.id)
    })

    // Helper function to get or create player
    async function getOrCreatePlayer(
      playerName: string,
      options: { addToTeam: boolean }
    ): Promise<string | null> {
      const normalized = normalizeName(playerName)

      // Check if player already exists in our map
      if (playerMap.has(normalized)) {
        return playerMap.get(normalized)!
      }

      // Parse name into first and last
      let firstName = ''
      let lastName = ''
      const trimmed = playerName.trim()
      const commaSplit = trimmed.split(',').map(part => part.trim()).filter(Boolean)

      if (commaSplit.length >= 2) {
        lastName = commaSplit[0]
        firstName = commaSplit.slice(1).join(' ')
      } else {
        const nameParts = trimmed.split(/\s+/).filter(Boolean)
        if (nameParts.length === 1) {
          firstName = nameParts[0]
          lastName = ''
        } else {
          firstName = nameParts[0]
          lastName = nameParts.slice(1).join(' ')
        }
      }

      if (!firstName) {
        console.warn(`Invalid player name format: ${playerName}`)
        return null
      }

      // Create new player
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          club_id: userRole.club_id,
          first_name: firstName,
          last_name: lastName,
        })
        .select('id')
        .single()

      if (playerError || !newPlayer) {
        console.error(`Failed to create player ${playerName}:`, playerError)
        return null
      }

      // Add to team roster only for club players
      if (options.addToTeam) {
        await supabase
          .from('team_players')
          .insert({
            team_id: team.id,
            player_id: newPlayer.id,
          })
      }

      // Add to our map for future lookups
      playerMap.set(normalizeName(`${firstName} ${lastName}`), newPlayer.id)
      console.log(`✓ Created player: ${playerName}`)

      return newPlayer.id
    }

    // Create match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        club_id: userRole.club_id,
        season_id: season.id,
        team_id: team.id,
        match_date: parsedData.match.match_date,
        opponent_name: parsedData.match.opponent_name,
        venue: parsedData.match.venue,
        match_type: parsedData.match.match_type,
        result: parsedData.match.result,
        source: 'manual',
        published: false,
      })
      .select('id')
      .single()

    if (matchError || !match) {
      console.error('Match creation error:', matchError)
      return NextResponse.json(
        { error: 'Failed to create match', details: matchError?.message },
        { status: 500 }
      )
    }

    // Create innings with batting and bowling cards
    const opponentName = normalizeName(parsedData.match?.opponent_name || '')
    const { data: club } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', userRole.club_id)
      .single()
    const clubName = normalizeName(club?.name || '')
    const teamName = normalizeName(team?.name || '')

    const inferBattingTeam = (value: string) => {
      const normalized = normalizeName(value)
      if (normalized === 'home' || normalized === 'away') {
        return normalized
      }
      if (normalized.includes('home')) {
        return 'home'
      }
      if (normalized.includes('opposition') || normalized.includes('away')) {
        return 'away'
      }
      if (
        normalized.includes('brookweald') ||
        (clubName && normalized.includes(clubName)) ||
        (teamName && normalized.includes(teamName))
      ) {
        return 'home'
      }
      if (opponentName && normalized.includes(opponentName)) {
        return 'away'
      }
      return normalized
    }

    for (const inningsData of parsedData.innings) {
      const battingTeam = inferBattingTeam(String(inningsData.batting_team || ''))

      const { data: innings, error: inningsError } = await supabase
        .from('innings')
        .insert({
          match_id: match.id,
          innings_number: inningsData.innings_number,
          batting_team: battingTeam,
          total_runs: inningsData.total_runs,
          wickets: inningsData.wickets,
          overs: inningsData.overs,
          extras: inningsData.extras,
        })
        .select('id')
        .single()

      if (inningsError || !innings) {
        console.error('Innings creation error:', inningsError)
        continue
      }

      // Create batting cards
      for (const battingCard of inningsData.batting_cards) {
        const isHomeBatting = battingTeam === 'home'
        const playerId = await getOrCreatePlayer(battingCard.player_name, {
          addToTeam: isHomeBatting,
        })

        if (!playerId) {
          console.warn(`Could not create player: ${battingCard.player_name}`)
          continue
        }

        await supabase.from('batting_cards').insert({
          innings_id: innings.id,
          match_id: match.id,
          player_id: playerId,
          position: battingCard.position,
          dismissal_type: battingCard.dismissal_type,
          dismissal_text: battingCard.dismissal_text,
          is_out: battingCard.is_out,
          runs: battingCard.runs,
          balls_faced: battingCard.balls_faced,
          fours: battingCard.fours,
          sixes: battingCard.sixes,
          derived: false,
        })
      }

      // Create bowling cards
      for (const bowlingCard of inningsData.bowling_cards) {
        // Bowlers are from the opposite team that's batting
        const isHomeBowling = battingTeam === 'away'
        const playerId = await getOrCreatePlayer(bowlingCard.player_name, {
          addToTeam: isHomeBowling,
        })

        if (!playerId) {
          console.warn(`Could not create player: ${bowlingCard.player_name}`)
          continue
        }

        await supabase.from('bowling_cards').insert({
          innings_id: innings.id,
          match_id: match.id,
          player_id: playerId,
          overs: bowlingCard.overs,
          maidens: bowlingCard.maidens,
          runs_conceded: bowlingCard.runs_conceded,
          wickets: bowlingCard.wickets,
          wides: bowlingCard.wides,
          no_balls: bowlingCard.no_balls,
          derived: false,
        })
      }
    }

    // ZERO-ROWS RULE: Ensure ALL team players appear in stats (even if didn't bat/bowl)
    // Get all players in the team
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('team_id', team.id)

    const allPlayerIds = new Set(teamPlayers?.map(tp => tp.player_id) || [])

    // Get players who already have batting cards
    const { data: existingBatting } = await supabase
      .from('batting_cards')
      .select('player_id')
      .eq('match_id', match.id)

    const battedPlayerIds = new Set(existingBatting?.map(b => b.player_id) || [])

    // Get players who already have bowling cards
    const { data: existingBowling } = await supabase
      .from('bowling_cards')
      .select('player_id')
      .eq('match_id', match.id)

    const bowledPlayerIds = new Set(existingBowling?.map(b => b.player_id) || [])

    // Create zero-rows for players who didn't bat
    for (const playerId of allPlayerIds) {
      if (!battedPlayerIds.has(playerId)) {
        await supabase.from('batting_cards').insert({
          match_id: match.id,
          player_id: playerId,
          runs: 0,
          balls_faced: 0,
          fours: 0,
          sixes: 0,
          derived: true, // Mark as auto-generated
        })
      }
    }

    // Create zero-rows for players who didn't bowl
    for (const playerId of allPlayerIds) {
      if (!bowledPlayerIds.has(playerId)) {
        await supabase.from('bowling_cards').insert({
          match_id: match.id,
          player_id: playerId,
          overs: 0,
          maidens: 0,
          runs_conceded: 0,
          wickets: 0,
          wides: 0,
          no_balls: 0,
          derived: true, // Mark as auto-generated
        })
      }
    }

    // Create zero-row fielding cards for all players
    for (const playerId of allPlayerIds) {
      await supabase.from('fielding_cards').insert({
        match_id: match.id,
        player_id: playerId,
        catches: 0,
        stumpings: 0,
        run_outs: 0,
        drops: 0,
        misfields: 0,
        derived: true, // Mark as auto-generated
      })
    }

    console.log(`✓ Created zero-rows for ${allPlayerIds.size} team players`)

    // Recalculate season stats for leaderboards
    try {
      const origin = request.headers.get('origin')
      if (origin) {
        await fetch(`${origin}/api/stats/calculate`, {
          method: 'POST',
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        })
      }
    } catch (calcError) {
      console.warn('Stats recalculation failed after import:', calcError)
    }

    return NextResponse.json({
      success: true,
      matchId: match.id,
      message: 'Match imported successfully from PDF!',
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
