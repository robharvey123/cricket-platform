'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import styles from './page.module.css'

interface Player {
  first_name: string
  last_name: string
}

interface BattingCard {
  id: string
  position: number | null
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  dismissal_type: string | null
  dismissal_text: string | null
  dismissal_bowler_name?: string | null
  dismissal_fielder_name?: string | null
  is_out: boolean
  strike_rate: number | null
  derived: boolean
  players?: Player | null
  player_id?: string | null
}

interface BowlingCard {
  id: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  economy: number | null
  derived: boolean
  players?: Player | null
  player_id?: string | null
}

interface FieldingCard {
  id: string
  catches: number
  stumpings: number
  run_outs: number
  drops: number
  misfields: number
  players?: Player | null
  player_id?: string | null
}

interface Innings {
  id: string
  innings_number: number
  batting_team: string
  total_runs: number | null
  wickets: number | null
  overs: number | null
  extras: number | null
  batting_cards: BattingCard[]
  bowling_cards: BowlingCard[]
}

interface Match {
  id: string
  club_id?: string | null
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
  source_match_id?: string | null
  innings: Innings[]
  fielding_cards?: FieldingCard[]
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullScorecard, setFullScorecard] = useState<any | null>(null)
  const [scorecardError, setScorecardError] = useState<string | null>(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [publishCountdown, setPublishCountdown] = useState<number | null>(null)
  const [publishStage, setPublishStage] = useState<'publishing' | 'countdown' | null>(null)
  const publishCountdownTotal = 3
  const fieldingPrefillRef = useRef(false)

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  useEffect(() => {
    if (publishCountdown === null || publishStage !== 'countdown') return
    if (publishCountdown <= 0) {
      router.push('/admin/matches')
      return
    }
    const timer = setTimeout(() => {
      setPublishCountdown((current) => (current === null ? null : current - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [publishCountdown, router])

  useEffect(() => {
    if (!match?.club_id || !match?.source_match_id) return
    fetchFullScorecard(match.club_id, match.source_match_id)
  }, [match?.club_id, match?.source_match_id])

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch match')
      }

      const nextMatch = data.match
      setMatch(nextMatch)

      const needsFieldingPrefill = nextMatch?.source_match_id &&
        Array.isArray(nextMatch?.fielding_cards) &&
        nextMatch.fielding_cards.length > 0 &&
        nextMatch.fielding_cards.every((card: any) =>
          (card.catches || 0) === 0 &&
          (card.run_outs || 0) === 0 &&
          (card.stumpings || 0) === 0 &&
          (card.drops || 0) === 0 &&
          (card.misfields || 0) === 0
        )

      if (!fieldingPrefillRef.current && needsFieldingPrefill) {
        fieldingPrefillRef.current = true
        try {
          await fetch(`/api/matches/${matchId}/fielding`, { method: 'POST' })
          await fetchMatch()
        } catch {
          // Ignore fielding prefill errors
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchFullScorecard = async (clubId: string, sourceMatchId: string) => {
    setScorecardLoading(true)
    setScorecardError(null)
    try {
      const response = await fetch(
        `/api/play-cricket/match-detail?clubId=${clubId}&matchId=${sourceMatchId}`
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load scorecard')
      }
      setFullScorecard(data.match_detail || null)
    } catch (err: any) {
      setScorecardError(err.message)
    } finally {
      setScorecardLoading(false)
    }
  }

  const normalizeEntries = (value: any) => (Array.isArray(value) ? value : value ? [value] : [])

  const handlePublish = async () => {
    if (!match) return

    setPublishing(true)
    setError(null)
    setPublishStage('publishing')

    try {
      // Update match to published
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...match, published: true })
      })

      if (!response.ok) {
        throw new Error('Failed to publish match')
      }

      // Recalculate stats
      const statsResponse = await fetch('/api/stats/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.error('Stats calculation error:', statsData)
        throw new Error(statsData.error || 'Failed to calculate stats')
      }

      const statsResult = await statsResponse.json()
      console.log('Stats calculated:', statsResult.message)
      console.log('Players processed:', statsResult.processed)
      console.log('Matches processed:', statsResult.matches)

      // Refresh match data
      await fetchMatch()
      setPublishCountdown(publishCountdownTotal)
      setPublishStage('countdown')
    } catch (err: any) {
      setError(err.message)
      setPublishStage(null)
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!match) return

    if (!confirm(`Are you sure you want to delete the match vs ${match.opponent_name}? This action cannot be undone.`)) {
      return
    }

    setError(null)

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete match')
      }

      // Redirect to matches list
      router.push('/admin/matches')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading match...</div>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Link href="/admin/matches" className={styles.backLink}>
            ← Back to Matches
          </Link>
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error || 'Match not found'}
          </div>
        </div>
      </div>
    )
  }

  const hasInnings = match.innings && match.innings.length > 0
  const hasFielding = (match.fielding_cards || []).length > 0

  const parseDismissalNames = (text: string | null | undefined) => {
    if (!text) return { bowler: '', fielder: '' }
    const lower = text.toLowerCase()
    let bowler = ''
    let fielder = ''
    const bowlerMatch = lower.includes(' b ')
      ? text.split(/ b /i).slice(1).join(' b ').trim()
      : ''
    if (bowlerMatch) {
      bowler = bowlerMatch
    }
    const fielderMatch = lower.includes(' ct ')
      ? text.split(/ ct /i).slice(1).join(' ct ').split(/ b /i)[0].trim()
      : lower.includes(' c ')
        ? text.split(/ c /i).slice(1).join(' c ').split(/ b /i)[0].trim()
        : ''
    if (fielderMatch) {
      fielder = fielderMatch
    }
    if (!fielder && lower.includes('run out')) {
      const match = text.match(/\((.*?)\)/)
      if (match && match[1]) {
        fielder = match[1]
      }
    }
    return { bowler, fielder }
  }

  const shortDismissal = (value: string | null | undefined) => {
    const normalized = (value || '').toLowerCase()
    if (normalized === 'caught') return 'ct'
    if (normalized === 'bowled') return 'b'
    if (normalized === 'lbw') return 'lbw'
    if (normalized === 'run out') return 'run out'
    if (normalized === 'stumped') return 'st'
    if (normalized === 'hit wicket') return 'hit wicket'
    if (normalized === 'retired') return 'retired'
    if (normalized === 'not out') return 'not out'
    return normalized || ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <Link href="/admin/matches" className={styles.backLink}>
            ← Back to Matches
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            {!match.published && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={styles.publishButton}
              >
                {publishing ? 'Publishing...' : 'Publish Match'}
              </button>
            )}
            <Link href={`/admin/matches/${matchId}/edit`} className={styles.primaryButton}>
              Edit Match
            </Link>
            <button
              onClick={handleDelete}
              className={styles.deleteButton}
            >
              Delete Match
            </button>
          </div>
        </div>

        {publishStage && (
          <div className={`${styles.alert} ${styles.alertInfo}`}>
            <div className={styles.countdownRow}>
              <span>
                {publishStage === 'publishing'
                  ? 'Publishing match and recalculating stats...'
                  : `Published. Returning to Matches in ${publishCountdown}s...`}
              </span>
              {publishStage === 'countdown' && (
                <span className={styles.countdownValue}>{publishCountdown}s</span>
              )}
            </div>
            <div className={styles.countdownTrack}>
              <div
                className={`${styles.countdownFill} ${publishStage === 'publishing' ? styles.countdownFillIndeterminate : ''}`}
                style={{
                  width: publishStage === 'countdown'
                    ? `${((publishCountdownTotal - (publishCountdown || 0)) / publishCountdownTotal) * 100}%`
                    : undefined
                }}
              />
            </div>
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.matchHeader}>
            <div>
              <h1>vs {match.opponent_name}</h1>
              <p>
                {new Date(match.match_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <span
              className={`${styles.badge} ${
                match.result === 'won'
                  ? styles.badgeSuccess
                  : match.result === 'lost'
                    ? styles.badgeDanger
                    : styles.badgeMuted
              }`}
            >
              {match.result}
            </span>
          </div>

          <div className={styles.metaGrid}>
            <div>
              <span>Venue</span>
              <strong>{match.venue || 'TBD'}</strong>
            </div>
            <div>
              <span>Match Type</span>
              <strong className={styles.capitalize}>{match.match_type}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{match.published ? 'Published' : 'Draft'}</strong>
            </div>
          </div>
        </section>

        {hasInnings ? (
          match.innings
            .sort((a, b) => a.innings_number - b.innings_number)
            .map((innings) => (
              <section key={innings.id} className={styles.card}>
                <div className={styles.sectionHeader}>
                  <h2>
                    Innings {innings.innings_number} -{' '}
                    {innings.batting_team === 'home' ? 'Brookweald Batting' : 'Brookweald Bowling'}
                  </h2>
                  <span className={styles.pill}>Scorecard</span>
                </div>

                {innings.total_runs !== null && (
                  <div className={styles.scorePill}>
                    <strong>
                      {innings.total_runs}/{innings.wickets}
                    </strong>
                    <span>({innings.overs} overs)</span>
                    {innings.extras !== null && innings.extras > 0 && (
                      <span className={styles.muted}>Extras: {innings.extras}</span>
                    )}
                  </div>
                )}

                {innings.batting_team === 'home' && innings.batting_cards.length > 0 && (
                  <div className={styles.tableBlock}>
                    <div className={styles.tableHeader}>
                      <h3>Batting</h3>
                      <span className={styles.muted}>Brookweald batting</span>
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Batter</th>
                            <th>R</th>
                            <th>B</th>
                            <th>4s</th>
                            <th>6s</th>
                            <th>SR</th>
                            <th>Fielder</th>
                            <th>Bowler</th>
                            <th>How Out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {innings.batting_cards
                            .filter(card => !card.derived || card.runs > 0)
                            .map((card) => (
                              <tr key={card.id}>
                                <td>
                                  {card.players
                                    ? `${card.players.first_name} ${card.players.last_name}`
                                    : card.player_id
                                      ? `Player ${card.player_id.slice(0, 6)}`
                                      : 'Unknown Player'}
                                </td>
                                <td>{card.runs}</td>
                                <td>{card.balls_faced || '-'}</td>
                                <td>{card.fours}</td>
                                <td>{card.sixes}</td>
                                <td>{card.strike_rate ? card.strike_rate.toFixed(1) : '-'}</td>
                                <td className={styles.muted}>
                                  {card.dismissal_fielder_name ||
                                    parseDismissalNames(card.dismissal_text).fielder ||
                                    '-'}
                                </td>
                                <td className={styles.muted}>
                                  {card.dismissal_bowler_name ||
                                    parseDismissalNames(card.dismissal_text).bowler ||
                                    '-'}
                                </td>
                                <td className={styles.muted}>
                                  {card.is_out
                                    ? (shortDismissal(card.dismissal_type) || card.dismissal_text || 'out')
                                    : 'not out'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {innings.batting_team === 'away' && innings.bowling_cards.length > 0 && (
                  <div className={styles.tableBlock}>
                    <div className={styles.tableHeader}>
                      <h3>Bowling</h3>
                      <span className={styles.muted}>Brookweald bowling</span>
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Bowler</th>
                            <th>O</th>
                            <th>M</th>
                            <th>R</th>
                            <th>W</th>
                            <th>Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {innings.bowling_cards
                            .filter(card => !card.derived || card.wickets > 0)
                            .map((card) => (
                              <tr key={card.id}>
                                <td>
                                  {card.players
                                    ? `${card.players.first_name} ${card.players.last_name}`
                                    : card.player_id
                                      ? `Player ${card.player_id.slice(0, 6)}`
                                      : 'Unknown Player'}
                                </td>
                                <td>{card.overs}</td>
                                <td>{card.maidens}</td>
                                <td>{card.runs_conceded}</td>
                                <td>{card.wickets}</td>
                                <td>{card.economy ? card.economy.toFixed(2) : '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            ))
        ) : (
          <section className={styles.card}>
            <h2>Match Details</h2>
            <p className={styles.muted}>No scorecard data available for this match yet.</p>
          </section>
        )}

        {hasFielding && (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Fielding</h2>
              <span className={styles.muted}>Brookweald fielding summary</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Catches</th>
                    <th>Run outs</th>
                    <th>Stumpings</th>
                    <th>Drops</th>
                    <th>Misfields</th>
                  </tr>
                </thead>
                <tbody>
                  {(match.fielding_cards || []).map((card) => (
                    <tr key={card.id}>
                      <td>
                        {card.players
                          ? `${card.players.first_name} ${card.players.last_name}`
                          : card.player_id
                            ? `Player ${card.player_id.slice(0, 6)}`
                            : 'Unknown Player'}
                      </td>
                      <td>{card.catches}</td>
                      <td>{card.run_outs}</td>
                      <td>{card.stumpings}</td>
                      <td>{card.drops}</td>
                      <td>{card.misfields}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(fullScorecard || scorecardLoading || scorecardError) && (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Full Scorecard</h2>
              <span className={styles.muted}>Play Cricket read-only data</span>
            </div>
            {scorecardLoading && (
              <p className={styles.muted}>Loading scorecard...</p>
            )}
            {scorecardError && (
              <p className={styles.errorText}>{scorecardError}</p>
            )}
            {fullScorecard && (
              <div className={styles.tableBlock}>
                {(fullScorecard.innings || []).map((innings: any, idx: number) => {
                  const battingEntries = normalizeEntries(
                    innings.bat || innings.batting || innings.batting_cards || innings.batters || innings.batsmen
                  )
                  const bowlingEntries = normalizeEntries(
                    innings.bowl || innings.bowling || innings.bowling_cards || innings.bowlers
                  )

                  return (
                    <div key={`${innings.team_batting_name || 'innings'}-${idx}`} className={styles.tableBlock}>
                      <div className={styles.tableHeader}>
                        <h3>{innings.team_batting_name || `Innings ${idx + 1}`}</h3>
                        <span className={styles.muted}>Full scorecard</span>
                      </div>

                      {battingEntries.length > 0 && (
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Batter</th>
                                <th>R</th>
                                <th>B</th>
                                <th>4s</th>
                                <th>6s</th>
                                <th>How Out</th>
                                <th>Fielder</th>
                                <th>Bowler</th>
                              </tr>
                            </thead>
                            <tbody>
                              {battingEntries.map((entry: any, entryIdx: number) => (
                                <tr key={`${entry.batsman_name || entry.player_name || 'batter'}-${entryIdx}`}>
                                  <td>{entry.batsman_name || entry.player_name || entry.name || '-'}</td>
                                  <td>{entry.runs ?? entry.r ?? '-'}</td>
                                  <td>{entry.balls ?? entry.balls_faced ?? entry.b ?? '-'}</td>
                                  <td>{entry.fours ?? entry['4s'] ?? '-'}</td>
                                  <td>{entry.sixes ?? entry['6s'] ?? '-'}</td>
                                  <td>{entry.how_out || entry.dismissal || '-'}</td>
                                  <td>{entry.fielder_name || entry.fielder || '-'}</td>
                                  <td>{entry.bowler_name || entry.bowler || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {bowlingEntries.length > 0 && (
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Bowler</th>
                                <th>O</th>
                                <th>M</th>
                                <th>R</th>
                                <th>W</th>
                                <th>Wd</th>
                                <th>Nb</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bowlingEntries.map((entry: any, entryIdx: number) => (
                                <tr key={`${entry.bowler_name || entry.player_name || 'bowler'}-${entryIdx}`}>
                                  <td>{entry.bowler_name || entry.player_name || entry.name || '-'}</td>
                                  <td>{entry.overs ?? entry.o ?? '-'}</td>
                                  <td>{entry.maidens ?? entry.m ?? '-'}</td>
                                  <td>{entry.runs ?? entry.r ?? entry.runs_conceded ?? '-'}</td>
                                  <td>{entry.wickets ?? entry.w ?? '-'}</td>
                                  <td>{entry.wides ?? entry.wd ?? '-'}</td>
                                  <td>{entry.no_balls ?? entry.nb ?? '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
