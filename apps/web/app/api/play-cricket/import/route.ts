import { NextResponse } from 'next/server'
import { playCricketService } from '../../../../lib/play-cricket-service'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const maxDuration = 300 // 5 minutes for long-running imports

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceSupabase =
      serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL
        ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
            auth: { persistSession: false },
          })
        : null
    const db = serviceSupabase ?? supabase

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clubId, season, fromDate, toDate } = body

    if (!clubId || !season) {
      return NextResponse.json(
        { error: 'Club ID and season are required' },
        { status: 400 }
      )
    }

    // Verify user is admin of the club
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

    // Get club Play Cricket config
    const { data: club, error: clubError } = await db
      .from('clubs')
      .select('play_cricket_site_id, play_cricket_api_token, name')
      .eq('id', clubId)
      .single()

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    if (!club.play_cricket_site_id || !club.play_cricket_api_token) {
      return NextResponse.json(
        { error: 'Play Cricket not configured for this club' },
        { status: 400 }
      )
    }

    // Create sync log
    const { data: syncLog, error: syncLogError } = await db
      .from('play_cricket_sync_logs')
      .insert({
        club_id: clubId,
        sync_type: 'manual',
        season_year: season,
        status: 'in_progress',
        created_by: user.id,
      })
      .select()
      .single()

    if (syncLogError || !syncLog) {
      return NextResponse.json(
        { error: 'Failed to create sync log' },
        { status: 500 }
      )
    }

    const pickNumber = (...values: Array<number | string | null | undefined>) => {
      for (const value of values) {
        if (value === null || value === undefined || value === '') continue
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) {
          return parsed
        }
      }
      return null
    }

    const pickString = (...values: Array<string | null | undefined>) => {
      for (const value of values) {
        if (value && value.trim().length > 0) {
          return value
        }
      }
      return null
    }

    const hashNameToId = (name: string) => {
      let hash = 0
      for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) % 2147483647
      }
      return hash || 1
    }

    const normalizeEntries = (value: any) => {
      if (!value) return []
      if (Array.isArray(value)) return value
      if (typeof value === 'object') return Object.values(value)
      return []
    }

    const insertBattingCard = async (payload: Record<string, any>) => {
      const attempt = await db.from('batting_cards').insert(payload)
      if (!attempt.error) return true

      const message = attempt.error.message || ''
      const fallbackPayload = { ...payload }
      if (message.includes('derived')) {
        delete fallbackPayload.derived
      }
      if (message.includes('strike_rate')) {
        delete fallbackPayload.strike_rate
      }
      if (message.includes('dismissal_text')) {
        delete fallbackPayload.dismissal_text
      }
      if (message.includes('dismissal_type')) {
        delete fallbackPayload.dismissal_type
      }
      if (message.includes('dismissal_bowler_id')) {
        delete fallbackPayload.dismissal_bowler_id
      }
      if (message.includes('dismissal_fielder_id')) {
        delete fallbackPayload.dismissal_fielder_id
      }
      if (Object.keys(fallbackPayload).length !== Object.keys(payload).length) {
        const retry = await db.from('batting_cards').insert(fallbackPayload)
        return !retry.error
      }
      return false
    }

    const insertBowlingCard = async (payload: Record<string, any>) => {
      const attempt = await db.from('bowling_cards').insert(payload)
      if (!attempt.error) return true

      const message = attempt.error.message || ''
      const fallbackPayload = { ...payload }
      if (message.includes('economy')) {
        delete fallbackPayload.economy
      }
      if (message.includes('wides')) {
        delete fallbackPayload.wides
      }
      if (message.includes('no_balls')) {
        delete fallbackPayload.no_balls
      }
      if (message.includes('maidens')) {
        delete fallbackPayload.maidens
      }
      if (Object.keys(fallbackPayload).length !== Object.keys(payload).length) {
        const retry = await db.from('bowling_cards').insert(fallbackPayload)
        return !retry.error
      }
      return false
    }

    const splitPlayerName = (name: string) => {
      const parts = name.trim().split(/\s+/)
      if (parts.length === 0) {
        return { first_name: name, last_name: name }
      }
      if (parts.length === 1) {
        return { first_name: parts[0], last_name: parts[0] }
      }
      return {
        first_name: parts[0],
        last_name: parts.slice(1).join(' ')
      }
    }

    try {
      // Fetch matches from Play Cricket
      const matches = await playCricketService.fetchMatches(
        {
          siteId: club.play_cricket_site_id,
          apiToken: club.play_cricket_api_token,
        },
        season,
        { fromDate, toDate }
      )
      const normalizedFromDate = fromDate
        ? playCricketService.normalizeMatchDate(fromDate)
        : null
      const normalizedToDate = toDate
        ? playCricketService.normalizeMatchDate(toDate)
        : null
      const filteredMatches = normalizedFromDate || normalizedToDate
        ? matches.filter((match) => {
            const matchDate = playCricketService.normalizeMatchDate(match.match_date)
            if (!matchDate) return false
            const matchTime = Date.parse(matchDate)
            if (normalizedFromDate) {
              const fromTime = Date.parse(normalizedFromDate)
              if (!Number.isNaN(fromTime) && matchTime < fromTime) {
                return false
              }
            }
            if (normalizedToDate) {
              const toTime = Date.parse(normalizedToDate)
              if (!Number.isNaN(toTime) && matchTime > toTime) {
                return false
              }
            }
            return true
          })
        : matches

      let matchesImported = 0
      let matchesUpdated = 0
      let matchesSkipped = 0
      const errors: Array<{ matchId?: number; error: string }> = []

      // Get or create season
      let seasonId: string | null = null
      const { data: seasonData } = await db
        .from('seasons')
        .select('id')
        .eq('club_id', clubId)
        .eq('name', season.toString())
        .single()

      if (seasonData) {
        seasonId = seasonData.id
      } else {
        const { data: newSeason } = await db
          .from('seasons')
          .insert({
            club_id: clubId,
            name: season.toString(),
            start_date: `${season}-01-01`,
            end_date: `${season}-12-31`,
            is_active: new Date().getFullYear() === season,
          })
          .select('id')
          .single()

        seasonId = newSeason?.id || null
      }

      // Import each match
      for (const match of filteredMatches) {
        try {
          // Fetch full match detail first
          const matchDetail = await playCricketService.fetchMatchDetail(
            {
              siteId: club.play_cricket_site_id!,
              apiToken: club.play_cricket_api_token!,
            },
            match.id
          )

          // Determine opponent using Play Cricket club IDs
          const clubSiteId = club.play_cricket_site_id?.toString()
          const homeClubId = matchDetail.home_club_id?.toString()
          const awayClubId = matchDetail.away_club_id?.toString()
          const isHomeMatch = clubSiteId
            ? clubSiteId === homeClubId
            : club.name.toLowerCase() === matchDetail.home_club_name.toLowerCase()

          const opponentName = isHomeMatch
            ? matchDetail.away_club_name
            : matchDetail.home_club_name

          // Check if match already exists by date and opponent
          const normalizedMatchDate = playCricketService.normalizeMatchDate(
            matchDetail.match_date || match.match_date
          )

          if (!normalizedMatchDate) {
            errors.push({
              matchId: match.id,
              error: `Invalid match date: ${matchDetail.match_date || match.match_date}`,
            })
            continue
          }

          const normalizedMatchType = playCricketService.normalizeMatchType(
            matchDetail.competition_type || matchDetail.match_type
          )
          const clubTeamId = isHomeMatch ? matchDetail.home_team_id : matchDetail.away_team_id
          const normalizedResult = playCricketService.normalizeMatchResult({
            resultCode: matchDetail.result,
            resultDescription: matchDetail.result_description,
            resultAppliedTo: matchDetail.result_applied_to,
            homeTeamId: matchDetail.home_team_id,
            awayTeamId: matchDetail.away_team_id,
            clubTeamId,
            clubName: club.name,
          })

          const { data: existingMatch } = await db
            .from('matches')
            .select('id, match_type, result, venue')
            .eq('club_id', clubId)
            .eq('source_match_id', match.id.toString())
            .single()

          if (existingMatch) {
            const updates: Record<string, any> = {}

            if (!existingMatch.match_type && normalizedMatchType) {
              updates.match_type = normalizedMatchType
            }

            if (!existingMatch.result) {
              const nextResult = normalizedResult || matchDetail.result_description || matchDetail.result
              if (nextResult) {
                updates.result = nextResult
              }
            }

            if (!existingMatch.venue && matchDetail.ground_name) {
              updates.venue = matchDetail.ground_name
            }

            if (Object.keys(updates).length > 0) {
              await db
                .from('matches')
                .update(updates)
                .eq('id', existingMatch.id)
                .eq('club_id', clubId)
            }

            matchesSkipped++
            continue
          }

          // Get or create team - use exact match first, then fuzzy match
          let teamId: string | null = null
          const teamName = isHomeMatch ? matchDetail.home_team_name : matchDetail.away_team_name
          const normalizeTeamName = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim()

          // Try exact match first
          const { data: exactTeam } = await db
            .from('teams')
            .select('id, name')
            .eq('club_id', clubId)
            .ilike('name', teamName)
            .single()

          if (exactTeam) {
            teamId = exactTeam.id
          } else {
            // Try normalized match
            const { data: allTeams } = await db
              .from('teams')
              .select('id, name')
              .eq('club_id', clubId)

            const normalizedInput = normalizeTeamName(teamName)
            const matchedTeam = allTeams?.find(t => normalizeTeamName(t.name) === normalizedInput)

            if (matchedTeam) {
              teamId = matchedTeam.id
            }
          }

          if (!teamId) {
            // Create new team
            const { data: newTeam, error: teamError } = await db
              .from('teams')
              .insert({
                club_id: clubId,
                name: teamName,
              })
              .select('id')
              .single()

            if (teamError) {
              // If duplicate key, try to find it again (race condition)
              if (teamError.message?.toLowerCase().includes('duplicate')) {
                const { data: retryTeam } = await db
                  .from('teams')
                  .select('id, name')
                  .eq('club_id', clubId)

                const normalizedInput = normalizeTeamName(teamName)
                const found = retryTeam?.find(t => normalizeTeamName(t.name) === normalizedInput)

                if (found) {
                  teamId = found.id
                } else {
                  errors.push({
                    matchId: match.id,
                    error: `Failed to create team "${teamName}": ${teamError.message}`,
                  })
                  continue
                }
              } else {
                errors.push({
                  matchId: match.id,
                  error: `Failed to create team "${teamName}": ${teamError.message}`,
                })
                continue
              }
            } else {
              teamId = newTeam?.id
            }
          }

          if (!teamId) {
            errors.push({ matchId: match.id, error: 'Failed to create/find team' })
            continue
          }

          // Create match (date already validated and normalized above)
          const { data: newMatch, error: matchError } = await db
            .from('matches')
            .insert({
              club_id: clubId,
              team_id: teamId,
              season_id: seasonId,
              opponent_name: opponentName,
              venue: matchDetail.ground_name,
              match_date: normalizedMatchDate,
              match_type: normalizedMatchType,
              result: normalizedResult || matchDetail.result_description || matchDetail.result,
              source: 'manual',
              source_match_id: match.id.toString(),
              published: false, // Match PDF import - start unpublished
            })
            .select()
            .single()

          if (matchError || !newMatch) {
            errors.push({ matchId: match.id, error: matchError?.message || 'Failed to create match' })
            continue
          }

          const getOrCreatePlayerId = async (pcId: number | null, name: string) => {
            if (!pcId) {
              errors.push({ matchId: match.id, error: `Missing player id for ${name}` })
              return null
            }

            const nameParts = splitPlayerName(name)
            const { data: mappedPlayer, error: mappedPlayerError } = await db
              .from('players')
              .select('id')
              .eq('club_id', clubId)
              .eq('external_ids->>play_cricket_id', pcId.toString())
              .limit(1)
              .maybeSingle()

            if (!mappedPlayerError && mappedPlayer?.id) {
              return mappedPlayer.id
            }

            const { data: existingPlayer, error: existingPlayerError } = await db
              .from('players')
              .select('id')
              .eq('club_id', clubId)
              .ilike('first_name', nameParts.first_name)
              .ilike('last_name', nameParts.last_name)
              .limit(1)
              .maybeSingle()

            if (existingPlayer?.id) {
              return existingPlayer.id
            }

            const insertAttempt = await db
              .from('players')
              .insert({
                club_id: clubId,
                first_name: nameParts.first_name,
                last_name: nameParts.last_name,
                external_ids: { play_cricket_id: pcId },
              })
              .select('id')
              .maybeSingle()

            if (insertAttempt.data?.id) {
              return insertAttempt.data.id
            }

            let retryAttempt = await db
              .from('players')
              .insert({
                club_id: clubId,
                first_name: nameParts.first_name,
                last_name: nameParts.last_name,
              })
              .select('id')
              .maybeSingle()

            if (!retryAttempt.data?.id && retryAttempt.error?.message?.includes('external_ids')) {
              retryAttempt = await db
                .from('players')
                .insert({
                  club_id: clubId,
                  first_name: nameParts.first_name,
                  last_name: nameParts.last_name,
                })
                .select('id')
                .maybeSingle()
            }

            if (retryAttempt.data?.id) {
              return retryAttempt.data.id
            }

            errors.push({
              matchId: match.id,
              error: `Failed to create player: ${[
                mappedPlayerError?.message,
                existingPlayerError?.message,
                insertAttempt.error?.message,
                retryAttempt.error?.message
              ]
                .filter(Boolean)
                .join(' | ') || 'Unknown error'}`,
            })
            return null
          }

          const ensureTeamPlayer = async (playerId: string) => {
            try {
              await db
                .from('team_players')
                .upsert(
                  { team_id: teamId, player_id: playerId },
                  { onConflict: 'team_id,player_id', ignoreDuplicates: true }
                )
            } catch {
              // Ignore roster upsert errors
            }
          }

          // Import innings and scorecards
          for (const [inningsIndex, innings] of matchDetail.innings.entries()) {
            const teamBattingName = innings.team_batting_name
            let rawBattingTeam: 'home' | 'away'

            if (teamBattingName === matchDetail.home_team_name) {
              rawBattingTeam = 'home'
            } else if (teamBattingName === matchDetail.away_team_name) {
              rawBattingTeam = 'away'
            } else {
              const battedFirstId = matchDetail.batted_first
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
                  ? (isHomeMatch ? 'home' : 'away')
                  : (isHomeMatch ? 'away' : 'home')
              }
            }
            const clubSide = isHomeMatch ? 'home' : 'away'
            const isClubBatting = rawBattingTeam === clubSide
            const battingTeam = isClubBatting ? 'home' : 'away'
            const isOppositionBatting = !isClubBatting

            const inningsNumber = inningsIndex + 1

            // Create innings
            const { data: newInnings, error: inningsError } = await db
              .from('innings')
              .insert({
                match_id: newMatch.id,
                innings_number: inningsNumber,
                batting_team: battingTeam,
                total_runs: innings.runs,
                wickets: innings.wickets,
                overs: playCricketService.parseOvers(innings.overs),
                extras: 0, // Would need to calculate from innings data
              })
              .select()
              .single()

            if (inningsError || !newInnings) {
              errors.push({
                matchId: match.id,
                error: inningsError?.message || `Failed to create innings ${inningsNumber}`,
              })
              continue
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

            // Import batting cards (club batting only)
            if (isClubBatting) {
              for (const batsman of battingEntries) {
              const batsmanName = pickString(
                (batsman as any).batsman_name,
                (batsman as any).player_name,
                (batsman as any).name,
                (batsman as any).batter_name,
                (batsman as any).batsman
              )
              const batsmanId =
                pickNumber(
                  (batsman as any).batsman_id,
                  (batsman as any).player_id,
                  (batsman as any).id,
                  (batsman as any).batsmanId
                ) ?? (batsmanName ? hashNameToId(batsmanName) : null)

              if (!batsmanName || batsmanId === null) {
                continue
              }

              const playerId = await getOrCreatePlayerId(batsmanId, batsmanName)
              if (!playerId) continue
              await ensureTeamPlayer(playerId)

              const dismissalText = pickString(
                (batsman as any).how_out,
                (batsman as any).dismissal,
                (batsman as any).dismissal_text,
                (batsman as any).out_desc
              )
              const dismissal = playCricketService.parseDismissalType(dismissalText || undefined)
              const dismissalBowlerName = pickString(
                (batsman as any).bowler_name,
                (batsman as any).bowler
              )
              const dismissalFielderName = pickString(
                (batsman as any).fielder_name,
                (batsman as any).fielder
              )

              const dismissalBowlerId = isOppositionBatting && dismissalBowlerName
                ? await getOrCreatePlayerId(
                    pickNumber((batsman as any).bowler_id, (batsman as any).bowlerId) ||
                      hashNameToId(dismissalBowlerName),
                    dismissalBowlerName
                  )
                : null
              const dismissalFielderId = isOppositionBatting && dismissalFielderName
                ? await getOrCreatePlayerId(
                    pickNumber((batsman as any).fielder_id, (batsman as any).fielderId) ||
                      hashNameToId(dismissalFielderName),
                    dismissalFielderName
                  )
                : null

              const dismissalSummaryParts = [dismissalText]
              if (!dismissalText && dismissal.dismissalType) {
                dismissalSummaryParts.push(dismissal.dismissalType)
              }
              if (dismissalFielderName) {
                dismissalSummaryParts.push(`f ${dismissalFielderName}`)
              }
              if (dismissalBowlerName) {
                dismissalSummaryParts.push(`b ${dismissalBowlerName}`)
              }
              const dismissalSummary = dismissalSummaryParts
                .filter(Boolean)
                .join(' ')
                .trim()

              const battingInserted = await insertBattingCard({
                match_id: newMatch.id,
                innings_id: newInnings.id,
                player_id: playerId,
                position: pickNumber(
                  (batsman as any).position,
                  (batsman as any).order,
                  (batsman as any).batting_order
                ),
                runs: pickNumber((batsman as any).runs, (batsman as any).r, (batsman as any).runs_scored) || 0,
                balls_faced: pickNumber((batsman as any).balls_faced, (batsman as any).balls, (batsman as any).b) || 0,
                fours: pickNumber((batsman as any).fours, (batsman as any)['4s'], (batsman as any).four) || 0,
                sixes: pickNumber((batsman as any).sixes, (batsman as any)['6s'], (batsman as any).six) || 0,
                dismissal_type: dismissal.dismissalType,
                dismissal_text: dismissalSummary || dismissal.dismissalText,
                dismissal_bowler_id: dismissalBowlerId || null,
                dismissal_fielder_id: dismissalFielderId || null,
                is_out: typeof (batsman as any).is_out === 'boolean' ? (batsman as any).is_out : dismissal.isOut,
                strike_rate: pickNumber((batsman as any).strike_rate) || playCricketService.calculateStrikeRate(
                  pickNumber((batsman as any).runs, (batsman as any).r, (batsman as any).runs_scored) || 0,
                  pickNumber((batsman as any).balls_faced, (batsman as any).balls, (batsman as any).b) || 0
                ),
                derived: false,
              })

                if (!battingInserted) {
                  errors.push({
                    matchId: match.id,
                    error: `Failed to insert batting card for ${batsmanName}`,
                  })
                }
              }
            }

            // Import bowling cards (club bowling only)
            if (isOppositionBatting) {
              for (const bowler of bowlingEntries) {
              const bowlerName = pickString(
                (bowler as any).bowler_name,
                (bowler as any).player_name,
                (bowler as any).name,
                (bowler as any).bowler
              )
              const bowlerId =
                pickNumber(
                  (bowler as any).bowler_id,
                  (bowler as any).player_id,
                  (bowler as any).id,
                  (bowler as any).bowlerId
                ) ?? (bowlerName ? hashNameToId(bowlerName) : null)

              if (!bowlerName || bowlerId === null) {
                continue
              }

              const playerId = await getOrCreatePlayerId(bowlerId, bowlerName)
              if (!playerId) continue
              await ensureTeamPlayer(playerId)

              const bowlingInserted = await insertBowlingCard({
                match_id: newMatch.id,
                innings_id: newInnings.id,
                player_id: playerId,
                overs: playCricketService.parseOvers(
                  pickNumber((bowler as any).overs, (bowler as any).o) || 0
                ),
                maidens: pickNumber((bowler as any).maidens, (bowler as any).m) || 0,
                runs_conceded: pickNumber((bowler as any).runs, (bowler as any).r, (bowler as any).runs_conceded) || 0,
                wickets: pickNumber((bowler as any).wickets, (bowler as any).w) || 0,
                wides: pickNumber((bowler as any).wides, (bowler as any).wd) || 0,
                no_balls: pickNumber((bowler as any).no_balls, (bowler as any).nb) || 0,
                economy: pickNumber((bowler as any).economy, (bowler as any).econ) || playCricketService.calculateEconomy(
                  pickNumber((bowler as any).runs, (bowler as any).r, (bowler as any).runs_conceded) || 0,
                  pickNumber((bowler as any).overs, (bowler as any).o) || 0
                ),
                derived: false,
              })

                if (!bowlingInserted) {
                  errors.push({
                    matchId: match.id,
                    error: `Failed to insert bowling card for ${bowlerName}`,
                  })
                }
              }
            }
          }

          matchesImported++
        } catch (error: any) {
          console.error(`Error importing match ${match.id}:`, error)
          errors.push({ matchId: match.id, error: error.message || 'Unknown error' })
        }
      }

      // Update sync log
      await db
        .from('play_cricket_sync_logs')
        .update({
          status: 'completed',
          matches_found: filteredMatches.length,
          matches_imported: matchesImported,
          matches_updated: matchesUpdated,
          matches_skipped: matchesSkipped,
          errors: errors,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      // Update club last sync
      await db
        .from('clubs')
        .update({ play_cricket_last_sync: new Date().toISOString() })
        .eq('id', clubId)

      return NextResponse.json({
        success: true,
        syncLogId: syncLog.id,
        matchesFound: filteredMatches.length,
        matchesImported,
        matchesUpdated,
        matchesSkipped,
        errors,
      })
    } catch (error: any) {
      // Update sync log as failed
      await db
        .from('play_cricket_sync_logs')
        .update({
          status: 'failed',
          errors: [{ error: error.message || 'Unknown error' }],
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      throw error
    }
  } catch (error: any) {
    console.error('Error importing from Play Cricket:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
