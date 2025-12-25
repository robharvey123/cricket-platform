'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from './page.module.css'

interface Player {
  first_name: string
  last_name: string
}

interface BattingCardPlayer extends Player {
  id?: string
}

interface BowlingCardPlayer extends Player {
  id?: string
}

interface BattingCard {
  id: string
  position: number | null
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  dismissal_text: string | null
  is_out: boolean
  strike_rate: number | null
  derived: boolean
  player_id?: string
  players: BattingCardPlayer
}

interface BowlingCard {
  id: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  economy: number | null
  derived: boolean
  player_id?: string
  players: BowlingCardPlayer
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

export default function PublicMatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
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

      // Only show published matches
      if (!data.match.published) {
        throw new Error('This match is not published yet')
      }

      setMatch(data.match)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
          <Link href="/matches" className={styles.backLink}>
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
        <Link href="/matches" className={styles.backLink}>
          ← Back to Matches
        </Link>

        <section className={styles.matchHeader}>
          <div className={styles.matchHeaderContent}>
            <h1 className={styles.matchTitle}>
              Brookweald CC vs {match.opponent_name}
            </h1>
            <div className={styles.matchMeta}>
              <span className={styles.matchDate}>
                {new Date(match.match_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              {match.venue && (
                <>
                  <span className={styles.separator}>•</span>
                  <span className={styles.venue}>{match.venue}</span>
                </>
              )}
              <span className={styles.separator}>•</span>
              <span className={styles.matchType}>{match.match_type}</span>
            </div>
          </div>
          <span
            className={`${styles.resultBadge} ${
              match.result === 'won'
                ? styles.resultWon
                : match.result === 'lost'
                  ? styles.resultLost
                  : styles.resultNeutral
            }`}
          >
            {match.result.toUpperCase()}
          </span>
        </section>

        {hasInnings ? (
          match.innings
            .sort((a, b) => a.innings_number - b.innings_number)
            .map((innings) => (
              <section key={innings.id} className={styles.card}>
                <div className={styles.inningsHeader}>
                  <h2 className={styles.inningsTitle}>
                    Innings {innings.innings_number} -{' '}
                    {innings.batting_team === 'home' ? 'Brookweald CC' : match.opponent_name}
                  </h2>
                  {innings.total_runs !== null && (
                    <div className={styles.score}>
                      <span className={styles.scoreRuns}>{innings.total_runs}/{innings.wickets}</span>
                      <span className={styles.scoreOvers}>({innings.overs} overs)</span>
                      {innings.extras !== null && innings.extras > 0 && (
                        <span className={styles.extras}>Extras: {innings.extras}</span>
                      )}
                    </div>
                  )}
                </div>

                {innings.batting_cards.length > 0 && (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Batting</h3>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Batter</th>
                            <th>Runs</th>
                            <th>Balls</th>
                            <th>4s</th>
                            <th>6s</th>
                            <th>SR</th>
                            <th>Dismissal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {innings.batting_cards
                            .filter(card => !card.derived || card.runs > 0)
                            .map((card) => (
                              <tr key={card.id}>
                                <td className={styles.playerName}>
                                  {innings.batting_team === 'home' && card.player_id ? (
                                    <Link href={`/players/${card.player_id}`} className={styles.playerLink}>
                                      {card.players.first_name} {card.players.last_name}
                                    </Link>
                                  ) : (
                                    <span>{card.players.first_name} {card.players.last_name}</span>
                                  )}
                                </td>
                                <td><strong>{card.runs}</strong></td>
                                <td>{card.balls_faced || '-'}</td>
                                <td>{card.fours}</td>
                                <td>{card.sixes}</td>
                                <td>{card.strike_rate ? card.strike_rate.toFixed(1) : '-'}</td>
                                <td className={styles.dismissal}>
                                  {card.is_out ? card.dismissal_text : 'not out'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {innings.bowling_cards.length > 0 && (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Bowling</h3>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Bowler</th>
                            <th>Overs</th>
                            <th>Maidens</th>
                            <th>Runs</th>
                            <th>Wickets</th>
                            <th>Economy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {innings.bowling_cards
                            .filter(card => !card.derived || card.wickets > 0)
                            .map((card) => (
                              <tr key={card.id}>
                                <td className={styles.playerName}>
                                  {innings.batting_team === 'away' && card.player_id ? (
                                    <Link href={`/players/${card.player_id}`} className={styles.playerLink}>
                                      {card.players.first_name} {card.players.last_name}
                                    </Link>
                                  ) : (
                                    <span>{card.players.first_name} {card.players.last_name}</span>
                                  )}
                                </td>
                                <td>{card.overs}</td>
                                <td>{card.maidens}</td>
                                <td>{card.runs_conceded}</td>
                                <td><strong>{card.wickets}</strong></td>
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
            <p className={styles.noData}>No scorecard data available for this match.</p>
          </section>
        )}
      </div>
    </div>
  )
}
