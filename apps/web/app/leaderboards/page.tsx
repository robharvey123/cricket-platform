'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface LeaderboardEntry {
  player_id: string
  first_name: string
  last_name: string
  matches_played: number
  total_runs?: number
  batting_average?: number
  batting_strike_rate?: number
  total_wickets?: number
  bowling_average?: number
  bowling_economy?: number
  total_points?: number
  batting_points?: number
  bowling_points?: number
  fielding_points?: number
}

interface LeaderboardData {
  batting: {
    most_runs: LeaderboardEntry[]
    best_average: LeaderboardEntry[]
  }
  bowling: {
    most_wickets: LeaderboardEntry[]
    best_economy: LeaderboardEntry[]
  }
  points: LeaderboardEntry[]
}

export default function PublicLeaderboardsPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'points'>('batting')

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  const fetchLeaderboards = async () => {
    try {
      const response = await fetch('/api/leaderboards')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch leaderboards')
      }

      setData(result)
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

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error || 'Failed to load leaderboards'}
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
            <span className={styles.kicker}>Season Stats</span>
            <h1 className={styles.title}>Leaderboards</h1>
            <p className={styles.subtitle}>
              Top performers across batting, bowling, and fantasy points
            </p>
          </div>
        </header>

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
            Fantasy Points
          </button>
        </div>

        {activeTab === 'batting' && (
          <div className={styles.tabContent}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Most Runs</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Matches</th>
                      <th>Runs</th>
                      <th>Average</th>
                      <th>Strike Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batting.most_runs.map((entry, idx) => (
                      <tr key={entry.player_id}>
                        <td className={styles.rank}>{idx + 1}</td>
                        <td>
                          <Link href={`/players/${entry.player_id}`} className={styles.playerLink}>
                            {entry.first_name} {entry.last_name}
                          </Link>
                        </td>
                        <td>{entry.matches_played}</td>
                        <td><strong>{entry.total_runs}</strong></td>
                        <td>{entry.batting_average ? entry.batting_average.toFixed(2) : '-'}</td>
                        <td>{entry.batting_strike_rate ? entry.batting_strike_rate.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Best Average</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Matches</th>
                      <th>Average</th>
                      <th>Runs</th>
                      <th>Strike Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batting.best_average.map((entry, idx) => (
                      <tr key={entry.player_id}>
                        <td className={styles.rank}>{idx + 1}</td>
                        <td>
                          <Link href={`/players/${entry.player_id}`} className={styles.playerLink}>
                            {entry.first_name} {entry.last_name}
                          </Link>
                        </td>
                        <td>{entry.matches_played}</td>
                        <td><strong>{entry.batting_average ? entry.batting_average.toFixed(2) : '-'}</strong></td>
                        <td>{entry.total_runs}</td>
                        <td>{entry.batting_strike_rate ? entry.batting_strike_rate.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'bowling' && (
          <div className={styles.tabContent}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Most Wickets</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Matches</th>
                      <th>Wickets</th>
                      <th>Average</th>
                      <th>Economy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bowling.most_wickets.map((entry, idx) => (
                      <tr key={entry.player_id}>
                        <td className={styles.rank}>{idx + 1}</td>
                        <td>
                          <Link href={`/players/${entry.player_id}`} className={styles.playerLink}>
                            {entry.first_name} {entry.last_name}
                          </Link>
                        </td>
                        <td>{entry.matches_played}</td>
                        <td><strong>{entry.total_wickets}</strong></td>
                        <td>{entry.bowling_average ? entry.bowling_average.toFixed(2) : '-'}</td>
                        <td>{entry.bowling_economy ? entry.bowling_economy.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Best Economy</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Matches</th>
                      <th>Economy</th>
                      <th>Wickets</th>
                      <th>Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bowling.best_economy.map((entry, idx) => (
                      <tr key={entry.player_id}>
                        <td className={styles.rank}>{idx + 1}</td>
                        <td>
                          <Link href={`/players/${entry.player_id}`} className={styles.playerLink}>
                            {entry.first_name} {entry.last_name}
                          </Link>
                        </td>
                        <td>{entry.matches_played}</td>
                        <td><strong>{entry.bowling_economy ? entry.bowling_economy.toFixed(2) : '-'}</strong></td>
                        <td>{entry.total_wickets}</td>
                        <td>{entry.bowling_average ? entry.bowling_average.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'points' && (
          <div className={styles.tabContent}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Top Fantasy Points Scorers</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Matches</th>
                      <th>Total Points</th>
                      <th>Batting</th>
                      <th>Bowling</th>
                      <th>Fielding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.points.map((entry, idx) => (
                      <tr key={entry.player_id}>
                        <td className={styles.rank}>{idx + 1}</td>
                        <td>
                          <Link href={`/players/${entry.player_id}`} className={styles.playerLink}>
                            {entry.first_name} {entry.last_name}
                          </Link>
                        </td>
                        <td>{entry.matches_played}</td>
                        <td><strong className={styles.totalPoints}>{entry.total_points}</strong></td>
                        <td className={styles.battingPoints}>{entry.batting_points || 0}</td>
                        <td className={styles.bowlingPoints}>{entry.bowling_points || 0}</td>
                        <td className={styles.fieldingPoints}>{entry.fielding_points || 0}</td>
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
