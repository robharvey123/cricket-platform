'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Player {
  id: string
  first_name: string
  last_name: string
  full_name: string
  role: string
}

interface LeaderboardEntry {
  player_id: string
  runs_scored: number
  innings_batted: number
  batting_average: number | null
  batting_strike_rate: number | null
  highest_score: number
  wickets: number
  overs_bowled: number
  bowling_average: number | null
  bowling_economy: number | null
  total_points: number
  players: Player
}

export default function LeaderboardsPage() {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'points'>('batting')
  const [battingLeaders, setBattingLeaders] = useState<LeaderboardEntry[]>([])
  const [bowlingLeaders, setBowlingLeaders] = useState<LeaderboardEntry[]>([])
  const [pointsLeaders, setPointsLeaders] = useState<LeaderboardEntry[]>([])
  const [averageLeaders, setAverageLeaders] = useState<LeaderboardEntry[]>([])
  const [economyLeaders, setEconomyLeaders] = useState<LeaderboardEntry[]>([])
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  const fetchLeaderboards = async () => {
    try {
      const response = await fetch('/api/leaderboards')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboards')
      }

      setBattingLeaders(data.batting)
      setBowlingLeaders(data.bowling)
      setPointsLeaders(data.points)
      setAverageLeaders(data.average)
      setEconomyLeaders(data.economy)
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
          <div className={styles.loading}>Loading leaderboards...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Season Rankings</span>
            <h1 className={styles.title}>Leaderboards</h1>
            <p className={styles.subtitle}>
              {activeSeason ? `${activeSeason.name} - ` : ''}Top performers across all disciplines
            </p>
          </div>
        </header>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'batting' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('batting')}
          >
            Batting
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'bowling' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('bowling')}
          >
            Bowling
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'points' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('points')}
          >
            Points
          </button>
        </div>

        {/* Batting Tab */}
        {activeTab === 'batting' && (
          <div className={styles.tabContent}>
            <div className={styles.leaderboardGrid}>
              {/* Most Runs */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Most Runs</h2>
                  <span className={styles.pill}>Season Leaders</span>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rankCol}>#</th>
                        <th>Player</th>
                        <th>Runs</th>
                        <th>Inns</th>
                        <th>Avg</th>
                        <th>HS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingLeaders.slice(0, 10).map((entry, idx) => (
                        <tr key={entry.player_id}>
                          <td className={styles.rankCol}>
                            <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                              {entry.players.full_name}
                            </Link>
                          </td>
                          <td><strong>{entry.runs_scored}</strong></td>
                          <td>{entry.innings_batted}</td>
                          <td>{entry.batting_average?.toFixed(2) || '-'}</td>
                          <td>{entry.highest_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Best Average */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Best Average</h2>
                  <span className={styles.muted}>Min. 3 innings</span>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rankCol}>#</th>
                        <th>Player</th>
                        <th>Avg</th>
                        <th>Runs</th>
                        <th>Inns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {averageLeaders.map((entry, idx) => (
                        <tr key={entry.player_id}>
                          <td className={styles.rankCol}>
                            <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                              {entry.players.full_name}
                            </Link>
                          </td>
                          <td><strong>{entry.batting_average?.toFixed(2)}</strong></td>
                          <td>{entry.runs_scored}</td>
                          <td>{entry.innings_batted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Bowling Tab */}
        {activeTab === 'bowling' && (
          <div className={styles.tabContent}>
            <div className={styles.leaderboardGrid}>
              {/* Most Wickets */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Most Wickets</h2>
                  <span className={styles.pill}>Season Leaders</span>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rankCol}>#</th>
                        <th>Player</th>
                        <th>Wkts</th>
                        <th>Overs</th>
                        <th>Avg</th>
                        <th>Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingLeaders.slice(0, 10).map((entry, idx) => (
                        <tr key={entry.player_id}>
                          <td className={styles.rankCol}>
                            <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                              {entry.players.full_name}
                            </Link>
                          </td>
                          <td><strong>{entry.wickets}</strong></td>
                          <td>{entry.overs_bowled}</td>
                          <td>{entry.bowling_average?.toFixed(2) || '-'}</td>
                          <td>{entry.bowling_economy?.toFixed(2) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Best Economy */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Best Economy</h2>
                  <span className={styles.muted}>Min. 10 overs</span>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rankCol}>#</th>
                        <th>Player</th>
                        <th>Econ</th>
                        <th>Wkts</th>
                        <th>Overs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {economyLeaders.map((entry, idx) => (
                        <tr key={entry.player_id}>
                          <td className={styles.rankCol}>
                            <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                              {entry.players.full_name}
                            </Link>
                          </td>
                          <td><strong>{entry.bowling_economy?.toFixed(2)}</strong></td>
                          <td>{entry.wickets}</td>
                          <td>{entry.overs_bowled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Points Tab */}
        {activeTab === 'points' && (
          <div className={styles.tabContent}>
            <section className={styles.cardWide}>
              <div className={styles.cardHeader}>
                <h2>Top Points Scorers</h2>
                <span className={styles.pill}>Fantasy Rankings</span>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.rankCol}>#</th>
                      <th>Player</th>
                      <th>Total Pts</th>
                      <th>Bat Pts</th>
                      <th>Bowl Pts</th>
                      <th>Field Pts</th>
                      <th>Runs</th>
                      <th>Wkts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsLeaders.map((entry, idx) => (
                      <tr key={entry.player_id}>
                        <td className={styles.rankCol}>
                          <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                            {entry.players.full_name}
                          </Link>
                        </td>
                        <td><strong className={styles.highlight}>{entry.total_points.toFixed(1)}</strong></td>
                        <td>{entry.total_points > 0 ? ((entry as any).batting_points || 0).toFixed(1) : '-'}</td>
                        <td>{entry.total_points > 0 ? ((entry as any).bowling_points || 0).toFixed(1) : '-'}</td>
                        <td>{entry.total_points > 0 ? ((entry as any).fielding_points || 0).toFixed(1) : '-'}</td>
                        <td>{entry.runs_scored || 0}</td>
                        <td>{entry.wickets || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
