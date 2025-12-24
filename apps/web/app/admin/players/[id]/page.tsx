'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from './page.module.css'

interface Player {
  id: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  status: string
}

interface SeasonStats {
  matches_batted: number
  innings_batted: number
  not_outs: number
  runs_scored: number
  balls_faced: number
  fours: number
  sixes: number
  highest_score: number
  fifties: number
  hundreds: number
  ducks: number
  batting_average: number | null
  batting_strike_rate: number | null
  matches_bowled: number
  innings_bowled: number
  overs_bowled: number
  maidens: number
  runs_conceded: number
  wickets: number
  best_bowling_wickets: number
  best_bowling_runs: number
  three_fors: number
  five_fors: number
  bowling_average: number | null
  bowling_economy: number | null
  bowling_strike_rate: number | null
  catches: number
  stumpings: number
  run_outs: number
  total_points: number
  batting_points: number
  bowling_points: number
  fielding_points: number
}

interface MatchPerformance {
  id: string
  runs: number
  balls_faced: number
  wickets: number
  overs_bowled: number
  runs_conceded: number
  catches: number
  total_points: number
  batting_points: number
  bowling_points: number
  fielding_points: number
  matches: {
    id: string
    match_date: string
    opponent_name: string
    result: string
  }
}

export default function PlayerProfilePage() {
  const params = useParams()
  const playerId = params.id as string

  const [player, setPlayer] = useState<Player | null>(null)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [careerTotals, setCareerTotals] = useState<SeasonStats | null>(null)
  const [recentPerformances, setRecentPerformances] = useState<MatchPerformance[]>([])
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayerData()
  }, [playerId])

  const fetchPlayerData = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch player')
      }

      setPlayer(data.player)
      setSeasonStats(data.seasonStats)
      setCareerTotals(data.careerTotals)
      setRecentPerformances(data.recentPerformances || [])
      setActiveSeason(data.activeSeason)
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
          <Link href="/admin/players" className={styles.backLink}>
            ← Back to Players
          </Link>
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error || 'Player not found'}
          </div>
        </div>
      </div>
    )
  }

  const stats = seasonStats || careerTotals

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Link href="/admin/players" className={styles.backLink}>
          ← Back to Players
        </Link>

        <header className={styles.playerHeader}>
          <div>
            <h1 className={styles.playerName}>{player.full_name}</h1>
            <div className={styles.playerMeta}>
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                {player.role || 'Player'}
              </span>
              <span className={`${styles.badge} ${player.status === 'active' ? styles.badgeSuccess : styles.badgeMuted}`}>
                {player.status}
              </span>
            </div>
          </div>
        </header>

        {!stats ? (
          <section className={styles.card}>
            <p className={styles.muted}>No statistics available yet. Import matches to see player stats.</p>
          </section>
        ) : (
          <>
            {/* Season Overview */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>{activeSeason ? `${activeSeason.name} Statistics` : 'Career Statistics'}</h2>
                {seasonStats && (
                  <span className={styles.pill}>Current Season</span>
                )}
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Matches Played</span>
                  <span className={styles.statValue}>{Math.max(stats.matches_batted || 0, stats.matches_bowled || 0)}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Total Points</span>
                  <span className={styles.statValue}>{stats.total_points?.toFixed(1) || '0'}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Runs Scored</span>
                  <span className={styles.statValue}>{stats.runs_scored || 0}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Wickets Taken</span>
                  <span className={styles.statValue}>{stats.wickets || 0}</span>
                </div>
              </div>
            </section>

            {/* Batting Stats */}
            {stats.innings_batted > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Batting</h2>
                  <span className={styles.muted}>{stats.innings_batted} innings</span>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Runs</span>
                    <span className={styles.statValue}>{stats.runs_scored}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Average</span>
                    <span className={styles.statValue}>{stats.batting_average?.toFixed(2) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Strike Rate</span>
                    <span className={styles.statValue}>{stats.batting_strike_rate?.toFixed(1) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>High Score</span>
                    <span className={styles.statValue}>{stats.highest_score}{stats.not_outs > 0 ? '*' : ''}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>50s / 100s</span>
                    <span className={styles.statValue}>{stats.fifties} / {stats.hundreds}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>4s / 6s</span>
                    <span className={styles.statValue}>{stats.fours} / {stats.sixes}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Bowling Stats */}
            {stats.innings_bowled > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Bowling</h2>
                  <span className={styles.muted}>{stats.overs_bowled} overs</span>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Wickets</span>
                    <span className={styles.statValue}>{stats.wickets}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Average</span>
                    <span className={styles.statValue}>{stats.bowling_average?.toFixed(2) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Economy</span>
                    <span className={styles.statValue}>{stats.bowling_economy?.toFixed(2) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Best Figures</span>
                    <span className={styles.statValue}>
                      {stats.best_bowling_wickets}/{stats.best_bowling_runs || '-'}
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>5W / 3W</span>
                    <span className={styles.statValue}>{stats.five_fors} / {stats.three_fors}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Maidens</span>
                    <span className={styles.statValue}>{stats.maidens}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Fielding Stats */}
            {(stats.catches > 0 || stats.stumpings > 0 || stats.run_outs > 0) && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Fielding</h2>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Catches</span>
                    <span className={styles.statValue}>{stats.catches}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Stumpings</span>
                    <span className={styles.statValue}>{stats.stumpings}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Run Outs</span>
                    <span className={styles.statValue}>{stats.run_outs}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Recent Performances */}
            {recentPerformances.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Recent Performances</h2>
                  <span className={styles.muted}>Last {recentPerformances.length} matches</span>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Opponent</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>Wkts</th>
                        <th>Overs</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPerformances.map((perf) => (
                        <tr key={perf.id}>
                          <td>{new Date(perf.matches.match_date).toLocaleDateString()}</td>
                          <td>
                            <Link href={`/admin/matches/${perf.matches.id}`} className={styles.link}>
                              vs {perf.matches.opponent_name}
                            </Link>
                          </td>
                          <td>{perf.runs || '-'}</td>
                          <td>{perf.balls_faced || '-'}</td>
                          <td>{perf.wickets || '-'}</td>
                          <td>{perf.overs_bowled || '-'}</td>
                          <td><strong>{perf.total_points.toFixed(1)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
