import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: match } = await supabase
      .from('matches')
      .select('id, club_id, team_id')
      .eq('id', id)
      .eq('club_id', userRole.club_id)
      .single()

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = serviceRoleKey
      ? createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
      : null
    const writeClient = adminClient ?? supabase

    const { data: teamPlayers } = await writeClient
      .from('team_players')
      .select('player_id')
      .eq('team_id', match.team_id)

    const teamPlayerIds = new Set((teamPlayers || []).map((row: any) => row.player_id))

    const { data: innings } = await writeClient
      .from('innings')
      .select('id')
      .eq('match_id', match.id)

    const inningsIds = (innings || []).map((row: any) => row.id)

    const { data: battingCards } = await writeClient
      .from('batting_cards')
      .select('player_id')
      .in('innings_id', inningsIds)

    const { data: bowlingCards } = await writeClient
      .from('bowling_cards')
      .select('player_id')
      .in('innings_id', inningsIds)

    const matchPlayerIds = new Set<string>()
    ;(battingCards || []).forEach((row: any) => {
      if (teamPlayerIds.has(row.player_id)) {
        matchPlayerIds.add(row.player_id)
      }
    })
    ;(bowlingCards || []).forEach((row: any) => {
      if (teamPlayerIds.has(row.player_id)) {
        matchPlayerIds.add(row.player_id)
      }
    })

    const { data: existingFielding } = await writeClient
      .from('fielding_cards')
      .select('player_id')
      .eq('match_id', match.id)

    const existingIds = new Set((existingFielding || []).map((row: any) => row.player_id))
    const missingRows = Array.from(matchPlayerIds)
      .filter((playerId) => !existingIds.has(playerId))
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

    if (missingRows.length > 0) {
      const { error: insertError } = await writeClient
        .from('fielding_cards')
        .insert(missingRows)
      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    return NextResponse.json({
      success: true,
      created: missingRows.length
    })
  } catch (error: any) {
    console.error('Generate fielding rows error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
