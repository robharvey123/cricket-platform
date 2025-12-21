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
        opponent_name: 'Riverside CC',
        venue: 'Home Ground',
        match_type: 'league',
        result: 'won',
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
        batting_team: 'home',
        total_runs: 185,
        wickets: 7,
        overs: 40.0,
        extras: 17,
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
      { runs: 45, balls_faced: 38, fours: 6, sixes: 1, dismissal_type: 'caught', is_out: true, position: 1 },
      { runs: 62, balls_faced: 51, fours: 8, sixes: 2, dismissal_type: 'caught', is_out: true, position: 2 },
      { runs: 0, balls_faced: 3, fours: 0, sixes: 0, dismissal_type: 'bowled', is_out: true, position: 3 }, // Duck!
      { runs: 28, balls_faced: 34, fours: 3, sixes: 0, dismissal_type: 'lbw', is_out: true, position: 4 },
      { runs: 15, balls_faced: 22, fours: 2, sixes: 0, dismissal_type: null, is_out: false, position: 5 }, // Not out
      { runs: 23, balls_faced: 18, fours: 4, sixes: 0, dismissal_type: 'run out', is_out: true, position: 6 },
    ]

    for (let i = 0; i < Math.min(6, players.length); i++) {
      const player = players[i]
      const batting = battingData[i]

      await supabase.from('batting_cards').insert({
        innings_id: innings.id,
        match_id: match.id,
        player_id: player.id,
        position: batting.position,
        dismissal_type: batting.dismissal_type,
        dismissal_text: batting.dismissal_type,
        is_out: batting.is_out,
        runs: batting.runs,
        balls_faced: batting.balls_faced,
        fours: batting.fours,
        sixes: batting.sixes,
        derived: false,
      })
    }

    // Create sample bowling cards for 4 players
    const bowlingData = [
      { overs: 8.0, maidens: 2, runs_conceded: 28, wickets: 3 },
      { overs: 8.0, maidens: 1, runs_conceded: 32, wickets: 2 },
      { overs: 8.0, maidens: 0, runs_conceded: 45, wickets: 1 },
      { overs: 8.0, maidens: 1, runs_conceded: 24, wickets: 2 },
    ]

    for (let i = 0; i < Math.min(4, players.length); i++) {
      const player = players[i]
      const bowling = bowlingData[i]

      await supabase.from('bowling_cards').insert({
        innings_id: innings.id,
        match_id: match.id,
        player_id: player.id,
        overs: bowling.overs,
        maidens: bowling.maidens,
        runs_conceded: bowling.runs_conceded,
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
