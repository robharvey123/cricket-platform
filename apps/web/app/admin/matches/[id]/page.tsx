'use client'

import { useEffect, useState } from 'react'
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
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
  innings: Innings[]
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch match')
      }

      setMatch(data.match)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!match) return

    setPublishing(true)
    setError(null)

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
    } catch (err: any) {
      setError(err.message)
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
                    {innings.batting_team === 'home' ? 'Brookweald CC' : match.opponent_name}
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

                {innings.batting_cards.length > 0 && (
                  <div className={styles.tableBlock}>
                    <div className={styles.tableHeader}>
                      <h3>Batting</h3>
                      <span className={styles.muted}>
                        {innings.batting_team === 'home' ? 'Brookweald innings' : 'Opposition innings'}
                      </span>
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
                            <th>Type</th>
                            <th>Bowler</th>
                            <th>Fielder</th>
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
                                  {card.is_out
                                    ? (card.dismissal_type || card.dismissal_text || 'out')
                                    : 'not out'}
                                </td>
                                <td className={styles.muted}>
                                  {card.dismissal_bowler_name || '-'}
                                </td>
                                <td className={styles.muted}>
                                  {card.dismissal_fielder_name || '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {innings.bowling_cards.length > 0 && (
                  <div className={styles.tableBlock}>
                    <div className={styles.tableHeader}>
                      <h3>Bowling</h3>
                      <span className={styles.muted}>
                        {innings.batting_team === 'home' ? 'Opposition bowlers' : 'Brookweald bowlers'}
                      </span>
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
      </div>
    </div>
  )
}
