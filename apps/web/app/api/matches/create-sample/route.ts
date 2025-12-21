import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club, season, and team
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Get first season
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

    console.log('Found season:', season.id)

    // Get first team
    const { data: team, error: teamError } = await supabase
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

    console.log('Found team:', team.id)

    // Get all players for this club
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('club_id', userRole.club_id)
      .limit(11)

    console.log('Found players:', players?.length)

    if (!players || players.length < 5) {
      return NextResponse.json(
        { error: `Please create at least 5 players first. You currently have ${players?.length || 0} players. Go to Players → Add Player.` },
        { status: 400 }
      )
    }

    // Create sample match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        club_id: userRole.club_id,
        season_id: season.id,
        team_id: team.id,
        match_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        opponent: 'Riverside CC',
        venue: 'Home Ground',
        result: 'Won by 45 runs',
        source: 'manual',
        published: false,
      })
      .select('id')
      .single()

    if (matchError || !match) {
      console.error('Match creation error:', matchError)
      return NextResponse.json(
        {
          error: 'Failed to create match',
          details: matchError?.message || 'Unknown error',
          hint: matchError?.hint,
          code: matchError?.code
        },
        { status: 500 }
      )
    }

    // Create innings
    const { data: innings, error: inningsError } = await supabase
      .from('innings')
      .insert({
        match_id: match.id,
        innings_number: 1,
        batting_team: 'Your Team',
        total_runs: 185,
        total_wickets: 7,
        overs: 40,
        balls: 0,
        extras_byes: 4,
        extras_leg_byes: 2,
        extras_wides: 8,
        extras_no_balls: 3,
        extras_penalties: 0,
        declared: false,
        forfeited: false,
      })
      .select('id')
      .single()

    if (inningsError || !innings) {
      console.error('Innings creation error:', inningsError)
      return NextResponse.json(
        {
          error: 'Failed to create innings',
          details: inningsError?.message || 'Unknown error',
          hint: inningsError?.hint,
          code: inningsError?.code
        },
        { status: 500 }
      )
    }

    // Create sample batting cards for first 6 players
    const battingData = [
      { runs: 45, balls: 38, fours: 6, sixes: 1, how_out: 'caught', position: 1 },
      { runs: 62, balls: 51, fours: 8, sixes: 2, how_out: 'caught', position: 2 },
      { runs: 0, balls: 3, fours: 0, sixes: 0, how_out: 'bowled', position: 3 }, // Duck!
      { runs: 28, balls: 34, fours: 3, sixes: 0, how_out: 'lbw', position: 4 },
      { runs: 15, balls: 22, fours: 2, sixes: 0, how_out: 'not out', position: 5 },
      { runs: 23, balls: 18, fours: 4, sixes: 0, how_out: 'run out', position: 6 },
    ]

    for (let i = 0; i < Math.min(6, players.length); i++) {
      const player = players[i]
      const batting = battingData[i]

      await supabase.from('batting_cards').insert({
        innings_id: innings.id,
        match_id: match.id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        position: batting.position,
        how_out: batting.how_out,
        runs: batting.runs,
        balls: batting.balls,
        fours: batting.fours,
        sixes: batting.sixes,
        derived: false,
      })
    }

    // Create sample bowling cards for 4 players
    const bowlingData = [
      { overs: 8, maidens: 2, runs: 28, wickets: 3 },
      { overs: 8, maidens: 1, runs: 32, wickets: 2 },
      { overs: 8, maidens: 0, runs: 45, wickets: 1 },
      { overs: 8, maidens: 1, runs: 24, wickets: 2 },
    ]

    for (let i = 0; i < Math.min(4, players.length); i++) {
      const player = players[i]
      const bowling = bowlingData[i]

      await supabase.from('bowling_cards').insert({
        innings_id: innings.id,
        match_id: match.id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        overs: bowling.overs,
        maidens: bowling.maidens,
        runs_conceded: bowling.runs,
        wickets: bowling.wickets,
        wides: 0,
        no_balls: 0,
        derived: false,
      })
    }

    return NextResponse.json({
      success: true,
      matchId: match.id,
      message: 'Sample match created successfully! You can now view and publish it.',
    })
  } catch (error: any) {
    console.error('Create sample match error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
