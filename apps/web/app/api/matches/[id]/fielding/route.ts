import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { playCricketService } from '../../../../../lib/play-cricket-service'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const debugMode = request.nextUrl.searchParams.get('debug') === '1'
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
      .select('id, club_id, team_id, season_id, source_match_id')
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

    let rosterSource: 'team_players' | 'squads' | 'match_cards' | 'match_detail' | 'none' = 'team_players'
    let { data: teamPlayers } = await writeClient
      .from('team_players')
      .select('player_id')
      .eq('team_id', match.team_id)

    if (!teamPlayers || teamPlayers.length === 0) {
      rosterSource = 'squads'
      const { data: squadPlayers } = await writeClient
        .from('squads')
        .select('player_id')
        .eq('team_id', match.team_id)
        .eq('season_id', match.season_id)
      teamPlayers = squadPlayers || []
    }

    let teamPlayerIds = new Set((teamPlayers || []).map((row: any) => row.player_id))
    if (teamPlayerIds.size === 0) {
      rosterSource = 'none'
    }

    const { data: existingFielding } = await writeClient
      .from('fielding_cards')
      .select('id, player_id, catches, stumpings, run_outs, derived')
      .eq('match_id', match.id)

    const existingIds = new Set((existingFielding || []).map((row: any) => row.player_id))

    const { data: players } = await writeClient
      .from('players')
      .select('id, first_name, last_name')
      .eq('club_id', match.club_id)

    const normalizeName = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

    const cleanName = (value: string) =>
      value.replace(/['"][^'"]+['"]/g, '').replace(/\([^)]*\)/g, '').trim()

    const normalizeClubKey = (value: string) => {
      const stopWords = new Set([
        'cricket',
        'club',
        'cc',
        'xi',
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
        'saturday',
        'sunday',
        'women',
        'mens',
        'men',
        'ladies'
      ])
      return normalizeName(value)
        .split(' ')
        .filter((word) => word && !stopWords.has(word))
        .join(' ')
    }

    const clubKeysMatch = (a: string, b: string) => {
      if (!a || !b) return false
      return a.includes(b) || b.includes(a)
    }

    const playerNameMap = new Map<string, string>()
    const playerIdByName = new Map<string, string>()
    const playerIdByFirstLast = new Map<string, string>()
    const playerIdByLast = new Map<string, string[]>()
    ;(players || []).forEach((player: any) => {
      const name = `${player.first_name || ''} ${player.last_name || ''}`.trim()
      playerNameMap.set(player.id, name)
      if (name) {
        playerIdByName.set(normalizeName(name), player.id)
        const parts = normalizeName(name).split(' ').filter(Boolean)
        if (parts.length >= 2) {
          const key = `${parts[0]} ${parts[parts.length - 1]}`
          if (!playerIdByFirstLast.has(key)) {
            playerIdByFirstLast.set(key, player.id)
          } else {
            playerIdByFirstLast.delete(key)
          }
          const last = parts[parts.length - 1]
          const lastList = playerIdByLast.get(last) || []
          lastList.push(player.id)
          playerIdByLast.set(last, lastList)
        }
      }
    })

    const findPlayerIdByName = (name: string) => {
      const cleaned = cleanName(name)
      const normalized = normalizeName(cleaned)
      if (!normalized) return null
      const exact = playerIdByName.get(normalized)
      if (exact) return exact
      const parts = normalized.split(' ').filter(Boolean)
      if (parts.length >= 2) {
        const firstLastKey = `${parts[0]} ${parts[parts.length - 1]}`
        const firstLast = playerIdByFirstLast.get(firstLastKey)
        if (firstLast) return firstLast
        const lastMatches = playerIdByLast.get(parts[parts.length - 1]) || []
        if (lastMatches.length === 1) return lastMatches[0]
      }
      return null
    }

    const ensurePlayerForName = async (name: string) => {
      const existingId = findPlayerIdByName(name)
      if (existingId) return existingId
      const cleaned = cleanName(name)
      const parts = cleaned.split(/\s+/).filter(Boolean)
      if (parts.length === 0) return null
      const firstName = parts[0]
      const lastName = parts.slice(1).join(' ')
      const { data: created, error: createError } = await writeClient
        .from('players')
        .insert({
          club_id: match.club_id,
          first_name: firstName,
          last_name: lastName || null
        })
        .select('id, first_name, last_name')
        .single()
      if (createError || !created?.id) {
        return null
      }
      const fullName = `${created.first_name || ''} ${created.last_name || ''}`.trim()
      playerNameMap.set(created.id, fullName)
      if (fullName) {
        playerIdByName.set(normalizeName(fullName), created.id)
        const partsNormalized = normalizeName(fullName).split(' ').filter(Boolean)
        if (partsNormalized.length >= 2) {
          const key = `${partsNormalized[0]} ${partsNormalized[partsNormalized.length - 1]}`
          if (!playerIdByFirstLast.has(key)) {
            playerIdByFirstLast.set(key, created.id)
          } else {
            playerIdByFirstLast.delete(key)
          }
          const last = partsNormalized[partsNormalized.length - 1]
          const lastList = playerIdByLast.get(last) || []
          lastList.push(created.id)
          playerIdByLast.set(last, lastList)
        }
      }
      return created.id
    }

    const { data: battingCards } = await writeClient
      .from('batting_cards')
      .select('dismissal_type, dismissal_text, dismissal_fielder_id, innings!inner(batting_team)')
      .eq('match_id', match.id)
      .eq('innings.batting_team', 'away')

    if (teamPlayerIds.size === 0) {
      const { data: matchBatters } = await writeClient
        .from('batting_cards')
        .select('player_id')
        .eq('match_id', match.id)
      const { data: matchBowlers } = await writeClient
        .from('bowling_cards')
        .select('player_id')
        .eq('match_id', match.id)

      const seededIds = new Set<string>()
      ;(matchBatters || []).forEach((row: any) => {
        if (row.player_id) seededIds.add(row.player_id)
      })
      ;(matchBowlers || []).forEach((row: any) => {
        if (row.player_id) seededIds.add(row.player_id)
      })

      if (seededIds.size > 0) {
        rosterSource = 'match_cards'
        const seedRows = Array.from(seededIds).map((playerId) => ({
          team_id: match.team_id,
          player_id: playerId
        }))
        await writeClient
          .from('team_players')
          .upsert(seedRows, { onConflict: 'team_id,player_id', ignoreDuplicates: true })
        teamPlayerIds = seededIds
      }
    }

    const extractFielderName = (text: string) => {
      const caughtMatch = text.match(/c(?:t)?\s+([^b]+?)\s+b\s+/i)
      if (caughtMatch?.[1]) return caughtMatch[1].trim()
      const stumpedMatch = text.match(/st\s+([^b]+?)\s+b\s+/i)
      if (stumpedMatch?.[1]) return stumpedMatch[1].trim()
      const runOutMatch = text.match(/run out\s*\(([^)]+)\)/i)
      if (runOutMatch?.[1]) return runOutMatch[1].trim()
      return ''
    }

    const fieldingCounts = new Map<string, { catches: number; run_outs: number; stumpings: number }>()

    for (const card of battingCards || []) {
      const rawType = (card.dismissal_type || card.dismissal_text || '').toLowerCase()
      const isCaught = rawType.includes('caught') || rawType.includes('ct ')
      const isRunOut = rawType.includes('run out')
      const isStumped = rawType.includes('stumped') || rawType.includes('st ')

      if (!isCaught && !isRunOut && !isStumped) {
        continue
      }

      let fielderId: string | null = null
      if (card.dismissal_fielder_id && teamPlayerIds.has(card.dismissal_fielder_id)) {
        fielderId = card.dismissal_fielder_id
      } else if (card.dismissal_text) {
        const fielderName = extractFielderName(card.dismissal_text)
        if (fielderName) {
          const matchedId = findPlayerIdByName(fielderName)
          if (matchedId) {
            fielderId = matchedId
          }
        }
      }

      if (!fielderId) continue

      if (!fieldingCounts.has(fielderId)) {
        fieldingCounts.set(fielderId, { catches: 0, run_outs: 0, stumpings: 0 })
      }

      const current = fieldingCounts.get(fielderId)!
      if (isCaught) current.catches += 1
      if (isRunOut) current.run_outs += 1
      if (isStumped) current.stumpings += 1
    }

    const shouldFetchMatchDetail = (battingCards || []).length === 0 && !!match.source_match_id
    let playCricketDebug: any = null

    if (shouldFetchMatchDetail) {
      const { data: clubConfig } = await writeClient
        .from('clubs')
        .select('name, play_cricket_site_id, play_cricket_api_token')
        .eq('id', match.club_id)
        .single()

      if (clubConfig?.play_cricket_site_id && clubConfig?.play_cricket_api_token) {
        try {
          const matchDetail = await playCricketService.fetchMatchDetail(
            {
              siteId: clubConfig.play_cricket_site_id.toString(),
              apiToken: clubConfig.play_cricket_api_token
            },
            Number(match.source_match_id)
          )

          const clubSideFromId = clubConfig.play_cricket_site_id.toString() === matchDetail.home_club_id
            ? 'home'
            : clubConfig.play_cricket_site_id.toString() === matchDetail.away_club_id
              ? 'away'
              : null
          const clubNameNormalized = normalizeName(clubConfig.name || '')
          const homeClubNormalized = normalizeName(matchDetail.home_club_name || '')
          const awayClubNormalized = normalizeName(matchDetail.away_club_name || '')
          const clubKey = normalizeClubKey(clubConfig.name || '')
          const homeKey = normalizeClubKey(matchDetail.home_club_name || '')
          const awayKey = normalizeClubKey(matchDetail.away_club_name || '')
          const clubSide = clubSideFromId
            || (clubNameNormalized && homeClubNormalized.includes(clubNameNormalized) ? 'home' : null)
            || (clubNameNormalized && awayClubNormalized.includes(clubNameNormalized) ? 'away' : null)
            || (clubKeysMatch(clubKey, homeKey) ? 'home' : null)
            || (clubKeysMatch(clubKey, awayKey) ? 'away' : null)
            || 'home'
          const normalizeEntries = (value: any) => (Array.isArray(value) ? value : value ? [value] : [])

          const rosterNames = new Set<string>()
          const rosterIds = new Set<string>()
          const inferredSides: Array<{ team: string | null; side: string }> = []
          const inningsDebug: Array<{
            team: string | null
            side: string
            isClubBatting: boolean
            entriesCount: number
            sampleEntries: Array<{ batsman_name: string | null; how_out: string | null; fielder_name: string | null }>
          }> = []
          const unmatchedFielders: string[] = []
          const matchedFielders: Array<{ name: string; playerId: string; type: string }> = []
          playCricketDebug = {
            inningsCount: matchDetail.innings?.length || 0,
            clubSide,
            homeClubName: matchDetail.home_club_name,
            awayClubName: matchDetail.away_club_name,
            homeTeamName: matchDetail.home_team_name,
            awayTeamName: matchDetail.away_team_name,
            battingTeams: (matchDetail.innings || []).map((inn: any, idx: number) => {
              const teamName = inn.team_batting_name || null
              inferredSides[idx] = { team: teamName, side: 'unknown' }
              return teamName
            }),
            inningsDebug,
            sampleBatters: (matchDetail.innings || [])
              .flatMap((inn: any) => {
                const entries = normalizeEntries(
                  inn.bat || inn.batting || inn.batting_cards || inn.batters || inn.batsmen
                )
                return entries.slice(0, 2).map((b: any) => ({
                  batsman_name: b.batsman_name || b.player_name || b.name || null,
                  how_out: b.how_out || b.dismissal || null,
                  fielder_name: b.fielder_name || b.fielder || null
                }))
              })
              .slice(0, 4)
          }

          for (const [inningsIndex, innings] of matchDetail.innings.entries()) {
            const teamBattingName = (innings as any).team_batting_name || ''
            let rawBattingTeam: 'home' | 'away'

            const normalizedTeamBatting = normalizeName(teamBattingName)
            const normalizedHomeTeam = normalizeName(matchDetail.home_team_name || '')
            const normalizedAwayTeam = normalizeName(matchDetail.away_team_name || '')
            const homeTeamDistinct = normalizedHomeTeam && normalizedAwayTeam && normalizedHomeTeam !== normalizedAwayTeam
            if (normalizedTeamBatting && homeClubNormalized && normalizedTeamBatting.includes(homeClubNormalized)) {
              rawBattingTeam = 'home'
            } else if (normalizedTeamBatting && awayClubNormalized && normalizedTeamBatting.includes(awayClubNormalized)) {
              rawBattingTeam = 'away'
            } else if (normalizedTeamBatting && clubKeysMatch(normalizeClubKey(teamBattingName), homeKey)) {
              rawBattingTeam = 'home'
            } else if (normalizedTeamBatting && clubKeysMatch(normalizeClubKey(teamBattingName), awayKey)) {
              rawBattingTeam = 'away'
            } else if (
              homeTeamDistinct &&
              normalizedTeamBatting &&
              normalizedHomeTeam &&
              normalizedTeamBatting.includes(normalizedHomeTeam)
            ) {
              rawBattingTeam = 'home'
            } else if (
              homeTeamDistinct &&
              normalizedTeamBatting &&
              normalizedAwayTeam &&
              normalizedTeamBatting.includes(normalizedAwayTeam)
            ) {
              rawBattingTeam = 'away'
            } else if (clubNameNormalized && normalizedTeamBatting.includes(clubNameNormalized)) {
              rawBattingTeam = clubSide
            } else {
              const battedFirstId = (matchDetail as any).batted_first
              const firstBatting =
                battedFirstId === matchDetail.home_team_id
                  ? 'home'
                  : battedFirstId === matchDetail.away_team_id
                    ? 'away'
                    : null
              if (firstBatting) {
                rawBattingTeam = inningsIndex === 0 ? firstBatting : (firstBatting === 'home' ? 'away' : 'home')
              } else {
                rawBattingTeam = inningsIndex % 2 === 0
                  ? clubSide
                  : (clubSide === 'home' ? 'away' : 'home')
              }
            }

            const battingEntries = normalizeEntries(
              (innings as any).bat ||
                (innings as any).batting ||
                (innings as any).batting_cards ||
                (innings as any).batters ||
                (innings as any).batsmen
            )
            const bowlingEntries = normalizeEntries(
              (innings as any).bowl ||
                (innings as any).bowling ||
                (innings as any).bowling_cards ||
                (innings as any).bowlers
            )

            const isClubBatting = rawBattingTeam === clubSide
            if (inferredSides[inningsIndex]) {
              inferredSides[inningsIndex].side = rawBattingTeam
              playCricketDebug.inferredSides = inferredSides
            }
            if (debugMode) {
              const sampleEntries = battingEntries.slice(0, 3).map((b: any) => ({
                batsman_name: b.batsman_name || b.player_name || b.name || null,
                how_out: b.how_out || b.dismissal || null,
                fielder_name: b.fielder_name || b.fielder || null
              }))
              inningsDebug.push({
                team: teamBattingName || null,
                side: rawBattingTeam,
                isClubBatting,
                entriesCount: battingEntries.length,
                sampleEntries
              })
            }

            if (isClubBatting) {
              for (const batsman of battingEntries) {
                const batsmanName =
                  (batsman as any).batsman_name ||
                  (batsman as any).player_name ||
                  (batsman as any).name
                if (batsmanName) rosterNames.add(batsmanName)
              }
            } else {
              for (const bowler of bowlingEntries) {
                const bowlerName =
                  (bowler as any).bowler_name ||
                  (bowler as any).player_name ||
                  (bowler as any).name
                if (bowlerName) rosterNames.add(bowlerName)
              }
            }

            for (const batsman of battingEntries) {
              const dismissalText = (batsman as any).how_out || (batsman as any).dismissal || ''
              const dismissal = playCricketService.parseDismissalType(dismissalText || '')
              const isCaught = dismissal.dismissalType === 'caught'
              const isRunOut = dismissal.dismissalType === 'run out'
              const isStumped = dismissal.dismissalType === 'stumped'

              if (!isCaught && !isRunOut && !isStumped) {
                continue
              }

              if (isClubBatting) {
                continue
              }

              const fielderName =
                (batsman as any).fielder_name ||
                (batsman as any).fielder ||
                extractFielderName(dismissalText || '')

              if (!fielderName) continue

              const fielderId = await ensurePlayerForName(fielderName)
              if (!fielderId) {
                if (debugMode && unmatchedFielders.length < 10) {
                  unmatchedFielders.push(fielderName)
                }
                continue
              }

              rosterIds.add(fielderId)
              if (!fieldingCounts.has(fielderId)) {
                fieldingCounts.set(fielderId, { catches: 0, run_outs: 0, stumpings: 0 })
              }
              const current = fieldingCounts.get(fielderId)!
              if (isCaught) current.catches += 1
              if (isRunOut) current.run_outs += 1
              if (isStumped) current.stumpings += 1

              if (debugMode && matchedFielders.length < 10) {
                matchedFielders.push({
                  name: fielderName,
                  playerId: fielderId,
                  type: dismissal.dismissalType
                })
              }
            }
          }

          for (const name of rosterNames) {
            const matchedId = await ensurePlayerForName(name)
            if (matchedId) {
              rosterIds.add(matchedId)
            }
          }

          if (rosterIds.size > 0) {
            rosterSource = 'match_detail'
            teamPlayerIds = rosterIds
            const seedRows = Array.from(rosterIds).map((playerId) => ({
              team_id: match.team_id,
              player_id: playerId
            }))
            await writeClient
              .from('team_players')
              .upsert(seedRows, { onConflict: 'team_id,player_id', ignoreDuplicates: true })
          }

          if (debugMode) {
            playCricketDebug.unmatchedFielders = unmatchedFielders
            playCricketDebug.sampleRoster = Array.from(playerNameMap.values()).slice(0, 8)
            playCricketDebug.matchedFielders = matchedFielders
            playCricketDebug.fieldingCounts = Array.from(fieldingCounts.entries()).map(([playerId, counts]) => ({
              playerId,
              playerName: playerNameMap.get(playerId) || null,
              counts
            }))
          }
        } catch (error) {
          console.warn('Prefill fielding from Play Cricket failed:', error)
        }
      }
    }

    const existingFieldingMap = new Map((existingFielding || []).map((row: any) => [row.player_id, row]))

    if (rosterSource === 'match_detail' && teamPlayerIds.size > 0) {
      const rosterFilter = Array.from(teamPlayerIds)
        .map((playerId) => `'${playerId}'`)
        .join(',')
      await writeClient
        .from('fielding_cards')
        .delete()
        .eq('match_id', match.id)
        .not('player_id', 'in', `(${rosterFilter})`)
    }

    const missingRows = Array.from(teamPlayerIds)
      .filter((playerId) => !existingIds.has(playerId))
      .map((playerId: any) => {
        const counts = fieldingCounts.get(playerId)
        return {
          match_id: match.id,
          player_id: playerId,
          catches: counts?.catches || 0,
          stumpings: counts?.stumpings || 0,
          run_outs: counts?.run_outs || 0,
          drops: 0,
          misfields: 0,
          derived: true
        }
      })

    if (missingRows.length > 0) {
      const { error: insertError } = await writeClient
        .from('fielding_cards')
        .insert(missingRows)
      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    const updates = Array.from(fieldingCounts.entries()).filter(([playerId, counts]) => {
      const existing = existingFieldingMap.get(playerId)
      if (!existing) return false
      const hasManual =
        (existing.catches || 0) > 0 ||
        (existing.run_outs || 0) > 0 ||
        (existing.stumpings || 0) > 0
      if (hasManual) return false
      return counts.catches > 0 || counts.run_outs > 0 || counts.stumpings > 0
    })

    for (const [playerId, counts] of updates) {
      await writeClient
        .from('fielding_cards')
        .update({
          catches: counts.catches,
          run_outs: counts.run_outs,
          stumpings: counts.stumpings
        })
        .eq('match_id', match.id)
        .eq('player_id', playerId)
    }

    return NextResponse.json({
      success: true,
      created: missingRows.length,
      prefilled: updates.length,
      ...(debugMode
        ? {
            debug: {
              hasBattingCards: (battingCards || []).length > 0,
              fetchedFromPlayCricket: shouldFetchMatchDetail,
              teamPlayerCount: teamPlayerIds.size,
              rosterSource,
              battingCardCount: (battingCards || []).length,
              fieldingCount: fieldingCounts.size,
              playCricket: playCricketDebug,
              sampleFielders: Array.from(fieldingCounts.entries())
                .slice(0, 5)
                .map(([playerId, counts]) => ({
                  playerId,
                  playerName: playerNameMap.get(playerId) || null,
                  counts
                }))
            }
          }
        : {})
    })
  } catch (error: any) {
    console.error('Generate fielding rows error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
