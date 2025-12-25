import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const normalizeName = (value: string) =>
      value.toLowerCase().replace(/\s+/g, ' ').trim()

    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', userRole.club_id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    const { data: club } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', userRole.club_id)
      .single()

    const clubName = normalizeName(club?.name || '')

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('club_id', userRole.club_id)

    const teamNameById = new Map<string, string>()
    teams?.forEach((team) => {
      teamNameById.set(team.id, normalizeName(team.name || ''))
    })

    const inferBattingTeam = (value: string, opponentName: string, teamName: string) => {
      const normalized = normalizeName(value)
      if (normalized === 'home' || normalized === 'away') {
        return normalized
      }
      if (normalized.includes('opposition') || normalized.includes('away')) {
        return 'away'
      }
      if (normalized.includes('home')) {
        return 'home'
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

    let matchQuery = supabase
      .from('matches')
      .select(`
        id,
        team_id,
        opponent_name,
        innings (
          id,
          batting_team,
          batting_cards (player_id),
          bowling_cards (player_id)
        )
      `)
      .eq('club_id', userRole.club_id)

    if (activeSeason?.id) {
      matchQuery = matchQuery.eq('season_id', activeSeason.id)
    }

    const { data: matches, error: matchesError } = await matchQuery

    if (matchesError) {
      throw new Error(matchesError.message)
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'No matches found', created: 0 })
    }

    const teamPlayersMap = new Map<string, Set<string>>()

    for (const match of matches) {
      const teamId = match.team_id
      if (!teamPlayersMap.has(teamId)) {
        teamPlayersMap.set(teamId, new Set())
      }

      const opponentName = normalizeName(match.opponent_name || '')
      const teamName = teamNameById.get(teamId) || ''

      for (const innings of match.innings || []) {
        const normalizedBattingTeam = inferBattingTeam(
          innings.batting_team || '',
          opponentName,
          teamName
        )
        const battingTeam = normalizedBattingTeam === 'away' ? 'away' : 'home'

        if (battingTeam === 'home') {
          innings.batting_cards?.forEach((card: { player_id: string }) => {
            if (card.player_id) {
              teamPlayersMap.get(teamId)!.add(card.player_id)
            }
          })
        }

        if (battingTeam === 'away') {
          innings.bowling_cards?.forEach((card: { player_id: string }) => {
            if (card.player_id) {
              teamPlayersMap.get(teamId)!.add(card.player_id)
            }
          })
        }
      }
    }

    const rows: { team_id: string; player_id: string }[] = []
    for (const [teamId, playerIds] of teamPlayersMap.entries()) {
      for (const playerId of playerIds) {
        rows.push({ team_id: teamId, player_id: playerId })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({
        message: 'No player cards found. Re-import matches after fixing parsing to create players.',
        created: 0,
      })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('team_players')
      .upsert(rows, { onConflict: 'team_id,player_id' })
      .select('team_id,player_id')

    if (insertError) {
      throw new Error(insertError.message)
    }

    return NextResponse.json({
      message: 'Backfill completed',
      created: inserted?.length || 0,
      matches: matches.length,
    })
  } catch (error: any) {
    console.error('Backfill players error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
