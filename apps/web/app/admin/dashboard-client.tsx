'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface DashboardStats {
  totalMatches: number
  totalPlayers: number
  recentMatches: {
    id: string
    match_date: string
    opponent_name: string
    result: string
    total_runs?: number
    total_wickets?: number
  }[]
  topBatsmen: {
    player_name: string
    runs: number
  }[]
  topBowlers: {
    player_name: string
    wickets: number
  }[]
  resultsBreakdown: {
    won: number
    lost: number
    tied: number
    draw: number
  }
}

export default function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const sparklinePath = useMemo(() => {
    return (points: number[]) => {
      if (!points.length) return ''
      const max = Math.max(...points, 1)
      const min = Math.min(...points, 0)
      const range = Math.max(max - min, 1)
      return points
        .map((value, index) => {
          const x = (index / (points.length - 1 || 1)) * 100
          const y = 100 - ((value - min) / range) * 100
          return `${index === 0 ? 'M' : 'L'} ${x},${y}`
        })
        .join(' ')
    }
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
          </div>
        </div>
      </div>
    )
  }

  const recentMatches = stats?.recentMatches || []
  const recentRuns = recentMatches.slice(-6).map((match) => match.total_runs || 0)
  const recentWickets = recentMatches.slice(-6).map((match) => match.total_wickets || 0)
  const topBatsmenData = stats?.topBatsmen?.slice(0, 6) || []
  const maxRuns = Math.max(...topBatsmenData.map((player) => player.runs), 1)
  const totalMatches = stats?.totalMatches || 0
  const wins = stats?.resultsBreakdown?.won || 0
  const losses = stats?.resultsBreakdown?.lost || 0
  const tied = stats?.resultsBreakdown?.tied || 0
  const draw = stats?.resultsBreakdown?.draw || 0
  const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.kicker}>Admin Overview</span>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome to your cricket club management dashboard.
          </p>
        </header>

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div>
              <p className={styles.statLabel}>Total Matches</p>
              <p className={styles.statValue}>{totalMatches}</p>
              <p className={styles.statMeta}>Win rate {winRate}%</p>
            </div>
            <div className={styles.statTrend}>
              <svg viewBox="0 0 100 100" className={styles.sparkline}>
                <path
                  className={styles.sparklineLine}
                  d={sparklinePath(recentRuns)}
                />
              </svg>
              <span className={styles.trendLabel}>Runs trend</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <p className={styles.statLabel}>Total Players</p>
              <p className={styles.statValue}>{stats?.totalPlayers || 0}</p>
              <p className={styles.statMeta}>Active squad size</p>
            </div>
            <div className={styles.statTrend}>
              <svg viewBox="0 0 100 100" className={styles.sparklineAlt}>
                <path
                  className={styles.sparklineLineAlt}
                  d={sparklinePath(recentWickets)}
                />
              </svg>
              <span className={styles.trendLabel}>Wickets trend</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <p className={styles.statLabel}>Matches Won</p>
              <p className={styles.statValue}>{wins}</p>
              <p className={styles.statMeta}>Losses {losses}</p>
            </div>
            <div className={styles.statPill}>
              <span>Momentum</span>
              <strong>{wins >= losses ? 'Up' : 'Down'}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <p className={styles.statLabel}>Results Mix</p>
              <p className={styles.statValue}>{wins + losses + tied + draw}</p>
              <p className={styles.statMeta}>Completed fixtures</p>
            </div>
            <div className={styles.resultSplit}>
              <span>W {wins}</span>
              <span>L {losses}</span>
              <span>T {tied}</span>
              <span>D {draw}</span>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <div className={styles.grid}>
          <Link className={styles.cardLink} href="/admin/matches">
            <h2>Recent Matches</h2>
            <p>View scorecards, import new matches, and publish results.</p>
            <span className={styles.cardCta}>Go to matches →</span>
          </Link>

          <Link className={styles.cardLink} href="/admin/players">
            <h2>Players</h2>
            <p>Keep player profiles, form, and availability tidy.</p>
            <span className={styles.cardCta}>Manage squad →</span>
          </Link>

          <Link className={styles.cardLink} href="/admin/leaderboards">
            <h2>Leaderboards</h2>
            <p>Track season leaders across batting, bowling, and points.</p>
            <span className={styles.cardCta}>View rankings →</span>
          </Link>

          <Link className={styles.cardLink} href="/admin/scoring">
            <h2>Scoring</h2>
            <p>Review scoring rules and refine points configuration.</p>
            <span className={styles.cardCta}>Update scoring →</span>
          </Link>
        </div>

        <section className={styles.insights}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3>Last 6 Matches</h3>
                <p className={styles.muted}>Runs scored by innings</p>
              </div>
              <span className={styles.pill}>Batting</span>
            </div>
            {recentRuns.length ? (
              <div className={styles.sparklineWrap}>
                <svg viewBox="0 0 100 100" className={styles.sparkline}>
                  <path
                    className={styles.sparklineLine}
                    d={sparklinePath(recentRuns)}
                  />
                </svg>
                <div className={styles.sparklineAxis}>
                  {recentRuns.map((run, index) => (
                    <span key={`${run}-${index}`}>{run}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.muted}>No match data available</p>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3>Wickets Taken</h3>
                <p className={styles.muted}>Last 6 match spells</p>
              </div>
              <span className={styles.pillAlt}>Bowling</span>
            </div>
            {recentWickets.length ? (
              <div className={styles.sparklineWrap}>
                <svg viewBox="0 0 100 100" className={styles.sparklineAlt}>
                  <path
                    className={styles.sparklineLineAlt}
                    d={sparklinePath(recentWickets)}
                  />
                </svg>
                <div className={styles.sparklineAxis}>
                  {recentWickets.map((wicket, index) => (
                    <span key={`${wicket}-${index}`}>{wicket}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.muted}>No match data available</p>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3>Top Run Scorers</h3>
                <p className={styles.muted}>Season leaders</p>
              </div>
              <span className={styles.pill}>Batting</span>
            </div>
            {topBatsmenData.length ? (
              <div className={styles.barList}>
                {topBatsmenData.map((player) => (
                  <div key={player.player_name} className={styles.barRow}>
                    <div className={styles.barLabel}>
                      <span>{player.player_name}</span>
                      <strong>{player.runs}</strong>
                    </div>
                    <div className={styles.barTrack}>
                      <span
                        className={styles.barFill}
                        style={{ width: `${(player.runs / maxRuns) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.muted}>No batting data available</p>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3>Results Breakdown</h3>
                <p className={styles.muted}>Season outcomes</p>
              </div>
              <span className={styles.pillAlt}>Results</span>
            </div>
            {totalMatches ? (
              <div className={styles.resultsCard}>
                <div className={styles.stackedBar}>
                  <span
                    className={styles.stackWin}
                    style={{ width: `${(wins / totalMatches) * 100}%` }}
                  />
                  <span
                    className={styles.stackLoss}
                    style={{ width: `${(losses / totalMatches) * 100}%` }}
                  />
                  <span
                    className={styles.stackTie}
                    style={{ width: `${(tied / totalMatches) * 100}%` }}
                  />
                  <span
                    className={styles.stackDraw}
                    style={{ width: `${(draw / totalMatches) * 100}%` }}
                  />
                </div>
                <div className={styles.legend}>
                  <span><i className={styles.legendSwatchWin} /> Wins</span>
                  <span><i className={styles.legendSwatchLoss} /> Losses</span>
                  <span><i className={styles.legendSwatchTie} /> Ties</span>
                  <span><i className={styles.legendSwatchDraw} /> Draws</span>
                </div>
              </div>
            ) : (
              <p className={styles.muted}>No results data available</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
