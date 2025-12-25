'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface PlayerStats {
  matches_played: number
  total_runs: number
  batting_average: number | null
  batting_strike_rate: number | null
  highest_score: number | null
  fifties: number
  hundreds: number
  total_wickets: number
  bowling_average: number | null
  bowling_economy: number | null
  best_bowling: string | null
  maidens: number
  catches: number
  stumpings: number
  run_outs: number
  total_points: number
  batting_points: number
  bowling_points: number
  fielding_points: number
}

interface Player {
  id: string
  first_name: string
  last_name: string
  role: string | null
  batting_style: string | null
  bowling_style: string | null
  season_stats: PlayerStats | null
}

interface MatchPerformance {
  match_id: string
  match_date: string
  opponent_name: string
  runs: number
  balls_faced: number | null
  fours: number
  sixes: number
  is_out: boolean
  wickets: number
  overs: number
  runs_conceded: number
  economy: number | null
  catches: number
  run_outs: number
  total_points: number
}

export default function PublicPlayerProfilePage() {
  const params = useParams()
  const playerId = params.id as string
  const [player, setPlayer] = useState<Player | null>(null)
  const [performances, setPerformances] = useState<MatchPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayer()
  }, [playerId])

  const fetchPlayer = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch player')
      }

      setPlayer(data.player)
      setPerformances(data.recent_performances || [])
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
          <div className={styles.loading}>Loading player...</div>
        </div>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Link href="/leaderboards" className={styles.backLink}>
            ← Back to Leaderboards
          </Link>
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error || 'Player not found'}
          </div>
        </div>
      </div>
    )
  }

  const stats = player.season_stats

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Link href="/leaderboards" className={styles.backLink}>
          ← Back to Leaderboards
        </Link>

        <div className={styles.playerHeader}>
          <div className={styles.playerAvatar}>
            <div className={styles.avatarCircle}>
              {player.first_name[0]}{player.last_name[0]}
            </div>
          </div>
          <div className={styles.playerInfo}>
            <h1 className={styles.playerName}>
              {player.first_name} {player.last_name}
            </h1>
            {player.role && (
              <div className={styles.playerMeta}>
                <span className={styles.badge}>{player.role}</span>
                {player.batting_style && (
                  <span className={styles.metaItem}>{player.batting_style}</span>
                )}
                {player.bowling_style && (
                  <span className={styles.metaItem}>{player.bowling_style}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {stats ? (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Matches</div>
                <div className={styles.statValue}>{stats.matches_played}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Points</div>
                <div className={`${styles.statValue} ${styles.pointsValue}`}>
                  {stats.total_points}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Runs</div>
                <div className={styles.statValue}>{stats.total_runs}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Wickets</div>
                <div className={styles.statValue}>{stats.total_wickets}</div>
              </div>
            </div>

            <div className={styles.statsSection}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Batting Statistics</h2>
                <div className={styles.statsTable}>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Runs</span>
                    <span className={styles.statRowValue}>{stats.total_runs}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Average</span>
                    <span className={styles.statRowValue}>
                      {stats.batting_average ? stats.batting_average.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Strike Rate</span>
                    <span className={styles.statRowValue}>
                      {stats.batting_strike_rate ? stats.batting_strike_rate.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Highest Score</span>
                    <span className={styles.statRowValue}>
                      {stats.highest_score !== null ? stats.highest_score : '-'}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Fifties</span>
                    <span className={styles.statRowValue}>{stats.fifties}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Hundreds</span>
                    <span className={styles.statRowValue}>{stats.hundreds}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Batting Points</span>
                    <span className={`${styles.statRowValue} ${styles.battingPoints}`}>
                      {stats.batting_points}
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Bowling Statistics</h2>
                <div className={styles.statsTable}>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Wickets</span>
                    <span className={styles.statRowValue}>{stats.total_wickets}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Average</span>
                    <span className={styles.statRowValue}>
                      {stats.bowling_average ? stats.bowling_average.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Economy</span>
                    <span className={styles.statRowValue}>
                      {stats.bowling_economy ? stats.bowling_economy.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Best Bowling</span>
                    <span className={styles.statRowValue}>
                      {stats.best_bowling || '-'}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Maidens</span>
                    <span className={styles.statRowValue}>{stats.maidens}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Bowling Points</span>
                    <span className={`${styles.statRowValue} ${styles.bowlingPoints}`}>
                      {stats.bowling_points}
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Fielding Statistics</h2>
                <div className={styles.statsTable}>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Catches</span>
                    <span className={styles.statRowValue}>{stats.catches}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Stumpings</span>
                    <span className={styles.statRowValue}>{stats.stumpings}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Run Outs</span>
                    <span className={styles.statRowValue}>{stats.run_outs}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statRowLabel}>Fielding Points</span>
                    <span className={`${styles.statRowValue} ${styles.fieldingPoints}`}>
                      {stats.fielding_points}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {performances.length > 0 && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Recent Performances</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Opponent</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>4s/6s</th>
                        <th>Wkts</th>
                        <th>Overs</th>
                        <th>Econ</th>
                        <th>C/RO</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performances.map((perf) => (
                        <tr key={perf.match_id}>
                          <td>
                            {new Date(perf.match_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td>
                            <Link href={`/matches/${perf.match_id}`} className={styles.matchLink}>
                              vs {perf.opponent_name}
                            </Link>
                          </td>
                          <td>
                            {perf.runs}
                            {!perf.is_out && '*'}
                          </td>
                          <td>{perf.balls_faced || '-'}</td>
                          <td className={styles.muted}>
                            {perf.fours}/{perf.sixes}
                          </td>
                          <td>{perf.wickets || '-'}</td>
                          <td>{perf.overs || '-'}</td>
                          <td>{perf.economy ? perf.economy.toFixed(2) : '-'}</td>
                          <td className={styles.muted}>
                            {perf.catches || 0}/{perf.run_outs || 0}
                          </td>
                          <td><strong>{perf.total_points}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : (
          <section className={styles.card}>
            <p className={styles.noStats}>No statistics available for this player yet.</p>
          </section>
        )}
      </div>
    </div>
  )
}
