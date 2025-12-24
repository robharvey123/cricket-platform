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

    // Get first season and team (for MVP, we'll improve this later)
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', userRole.club_id)
      .limit(1)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: 'Please create a season first. Go to Seasons → Add Season.' },
        { status: 400 }
      )
    }

    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('club_id', userRole.club_id)
      .limit(1)
      .single()

    if (!team) {
      return NextResponse.json(
        { error: 'Please create a team first. Go to Teams → Add Team.' },
        { status: 400 }
      )
    }

    // Get all players for name matching
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('club_id', userRole.club_id)

    const playerMap = new Map<string, string>()
    players?.forEach(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      playerMap.set(fullName, p.id)
    })

    // Helper function to get or create player
    async function getOrCreatePlayer(playerName: string): Promise<string | null> {
      const nameLower = playerName.toLowerCase()

      // Check if player already exists in our map
      if (playerMap.has(nameLower)) {
        return playerMap.get(nameLower)!
      }

      // Parse name into first and last
      const nameParts = playerName.trim().split(' ')
      if (nameParts.length < 2) {
        console.warn(`Invalid player name format: ${playerName}`)
        return null
      }

      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ')

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

      // Add to team
      await supabase
        .from('team_players')
        .insert({
          team_id: team.id,
          player_id: newPlayer.id,
        })

      // Add to our map for future lookups
      playerMap.set(nameLower, newPlayer.id)
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
    for (const inningsData of parsedData.innings) {
      const { data: innings, error: inningsError } = await supabase
        .from('innings')
        .insert({
          match_id: match.id,
          innings_number: inningsData.innings_number,
          batting_team: inningsData.batting_team,
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
        // Only create cards for home team (your club's players)
        if (inningsData.batting_team !== 'home') {
          continue
        }

        const playerId = await getOrCreatePlayer(battingCard.player_name)

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
        // Only create cards for home team (your club's players)
        // Bowlers are from the opposite team that's batting
        if (inningsData.batting_team === 'home') {
          continue
        }

        const playerId = await getOrCreatePlayer(bowlingCard.player_name)

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
