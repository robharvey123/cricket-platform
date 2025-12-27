import { NextResponse } from 'next/server'
import { playCricketService } from '../../../../lib/play-cricket-service'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    const clubId = searchParams.get('clubId')

    if (!matchId || !clubId) {
      return NextResponse.json(
        { error: 'matchId and clubId are required' },
        { status: 400 }
      )
    }

    const { data: roleData } = await supabase
      .from('user_org_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { data: club } = await supabase
      .from('clubs')
      .select('play_cricket_site_id, play_cricket_api_token')
      .eq('id', clubId)
      .single()

    if (!club?.play_cricket_site_id || !club?.play_cricket_api_token) {
      return NextResponse.json(
        { error: 'Play Cricket not configured for this club' },
        { status: 400 }
      )
    }

    const detail = await playCricketService.fetchMatchDetail(
      {
        siteId: club.play_cricket_site_id,
        apiToken: club.play_cricket_api_token,
      },
      Number(matchId)
    )

    const summarizeEntries = (value: any) => {
      if (!value) return 0
      if (Array.isArray(value)) return value.length
      if (typeof value === 'object') return Object.keys(value).length
      return 0
    }

    const inningsSummary = (detail.innings || []).map((innings: any) => ({
      innings_number: innings.innings_number,
      team_batting_name: innings.team_batting_name,
      bat: summarizeEntries(innings.bat),
      batting: summarizeEntries(innings.batting),
      batting_cards: summarizeEntries(innings.batting_cards),
      batsmen: summarizeEntries(innings.batsmen),
      bowl: summarizeEntries(innings.bowl),
      bowling: summarizeEntries(innings.bowling),
      bowling_cards: summarizeEntries(innings.bowling_cards),
      bowlers: summarizeEntries(innings.bowlers),
    }))

    return NextResponse.json({
      match_detail: detail,
      innings_summary: inningsSummary,
    })
  } catch (error: any) {
    console.error('Play Cricket match detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
