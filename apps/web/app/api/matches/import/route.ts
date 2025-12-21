import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { PlayCricketTransformer } from '../../../../lib/play-cricket/transformer'
import type { MatchDetail } from '../../../../lib/play-cricket/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchDetail, seasonId, teamId } = body as {
      matchDetail: MatchDetail
      seasonId: string
      teamId: string
    }

    if (!matchDetail || !seasonId || !teamId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 400 }
      )
    }

    // Get team to find Play-Cricket team ID
    const { data: team } = await supabase
      .from('teams')
      .select('play_cricket_team_id')
      .eq('id', teamId)
      .single()

    if (!team?.play_cricket_team_id) {
      return NextResponse.json(
        { error: 'Team does not have a Play-Cricket team ID configured' },
        { status: 400 }
      )
    }

    // Check if match already exists
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('source_match_id', matchDetail.id)
      .eq('club_id', userRole.club_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This match has already been imported', matchId: existing.id },
        { status: 409 }
      )
    }

    // Transform match data
    const transformed = PlayCricketTransformer.transformMatch(
      matchDetail,
      userRole.club_id,
      seasonId,
      teamId,
      team.play_cricket_team_id
    )

    // Insert match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert(transformed.match)
      .select('id')
      .single()

    if (matchError || !match) {
      console.error('Match insert error:', matchError)
      return NextResponse.json(
        { error: 'Failed to insert match' },
        { status: 500 }
      )
    }

    // Insert innings
    for (const innings of transformed.innings) {
      const { data: inningsRecord, error: inningsError } = await supabase
        .from('innings')
        .insert({
          match_id: match.id,
          ...innings,
        })
        .select('id')
        .single()

      if (inningsError || !inningsRecord) {
        console.error('Innings insert error:', inningsError)
        continue
      }

      // Insert batting cards
      for (const battingCard of innings.batting_cards) {
        await supabase.from('batting_cards').insert({
          innings_id: inningsRecord.id,
          match_id: match.id,
          player_id: null, // Will be reconciled later
          ...battingCard,
        })
      }

      // Insert bowling cards
      for (const bowlingCard of innings.bowling_cards) {
        await supabase.from('bowling_cards').insert({
          innings_id: inningsRecord.id,
          match_id: match.id,
          player_id: null, // Will be reconciled later
          ...bowlingCard,
        })
      }
    }

    return NextResponse.json({
      success: true,
      matchId: match.id,
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
