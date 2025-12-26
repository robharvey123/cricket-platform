'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useUserRole } from '../../../../lib/hooks/useUserRole'
import {
  LineChartComponent,
  BarChartComponent,
  AreaChartComponent,
  ScatterChartComponent,
} from '../../../../components/charts'
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
  drops: number
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
  stumpings?: number
  run_outs?: number
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

interface MergePlayerOption {
  id: string
  first_name: string
  last_name: string
  user_id: string | null
}

export default function PlayerProfilePage() {
  const params = useParams()
  const playerId = params.id as string
  const { role } = useUserRole()

  const [player, setPlayer] = useState<Player | null>(null)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [careerTotals, setCareerTotals] = useState<SeasonStats | null>(null)
  const [recentPerformances, setRecentPerformances] = useState<MatchPerformance[]>([])
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mergeOptions, setMergeOptions] = useState<MergePlayerOption[]>([])
  const [mergeTargetId, setMergeTargetId] = useState<string>('none')
  const [merging, setMerging] = useState(false)
  const [mergeMessage, setMergeMessage] = useState<string | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayerData()
  }, [playerId])

  useEffect(() => {
    if (role === 'admin') {
      fetchMergeOptions()
    }
  }, [role, playerId])

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

  const fetchMergeOptions = async () => {
    try {
      const response = await fetch('/api/players/options')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch players')
      }

      const options = (data.players || []).filter((option: MergePlayerOption) => option.id !== playerId)
      setMergeOptions(options)
    } catch (err: any) {
      setMergeError(err.message)
    }
  }

  const handleMerge = async () => {
    if (mergeTargetId === 'none') {
      setMergeError('Select a duplicate player to merge.')
      return
    }

    if (!confirm('Merge the selected player into this profile? This cannot be undone.')) {
      return
    }

    setMerging(true)
    setMergeError(null)
    setMergeMessage(null)

    try {
      const response = await fetch('/api/players/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryPlayerId: playerId,
          duplicatePlayerId: mergeTargetId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to merge players')
      }

      setMergeMessage(data.message || 'Players merged.')
      setMergeTargetId('none')
      await fetchMergeOptions()
      await fetchPlayerData()
    } catch (err: any) {
      setMergeError(err.message)
    } finally {
      setMerging(false)
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
  const performanceSeries = recentPerformances.slice().reverse().map((perf, index) => {
    const balls = perf.balls_faced || 0
    const runs = perf.runs || 0
    const overs = perf.overs_bowled || 0
    const strikeRate = balls > 0 ? Number(((runs / balls) * 100).toFixed(1)) : 0
    const economy = overs > 0 ? Number((perf.runs_conceded / overs).toFixed(2)) : 0
    return {
      match: `M${index + 1}`,
      points: perf.total_points || 0,
      batting: perf.batting_points || 0,
      bowling: perf.bowling_points || 0,
      fielding: perf.fielding_points || 0,
      runs,
      balls,
      wickets: perf.wickets || 0,
      overs,
      runsConceded: perf.runs_conceded || 0,
      strikeRate,
      economy,
      catches: perf.catches || 0,
      stumpings: perf.stumpings || 0,
      runOuts: perf.run_outs || 0,
      fieldingPoints: perf.fielding_points || 0
    }
  })
  const hasFieldingSeries = performanceSeries.some(
    (perf) => perf.catches + perf.stumpings + perf.runOuts > 0
  )

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

        {recentPerformances.length > 0 && (
          <section className={styles.chartsSection}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Performance Snapshot</h2>
                <p className={styles.muted}>Last {recentPerformances.length} matches</p>
              </div>
              <span className={styles.pill}>Form</span>
            </div>
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Points Momentum</h3>
                <p className={styles.chartMeta}>Total points per match</p>
                <LineChartComponent
                  data={performanceSeries}
                  xKey="match"
                  lines={[{ dataKey: 'points', name: 'Points', color: '#0ea5e9' }]}
                  height={220}
                  showGrid
                  showLegend={false}
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Points Breakdown</h3>
                <p className={styles.chartMeta}>Batting vs bowling vs fielding</p>
                <AreaChartComponent
                  data={performanceSeries}
                  xKey="match"
                  areas={[
                    { dataKey: 'batting', name: 'Batting', color: '#0ea5e9', stackId: '1' },
                    { dataKey: 'bowling', name: 'Bowling', color: '#10b981', stackId: '1' },
                    { dataKey: 'fielding', name: 'Fielding', color: '#f59e0b', stackId: '1' },
                  ]}
                  height={220}
                  showGrid
                  showLegend
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Batting Rhythm</h3>
                <p className={styles.chartMeta}>Runs vs balls faced</p>
                <LineChartComponent
                  data={performanceSeries}
                  xKey="match"
                  lines={[
                    { dataKey: 'runs', name: 'Runs', color: '#8b5cf6' },
                    { dataKey: 'balls', name: 'Balls', color: '#94a3b8' }
                  ]}
                  height={220}
                  showGrid
                  showLegend
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Bowling Impact</h3>
                <p className={styles.chartMeta}>Wickets and economy</p>
                <LineChartComponent
                  data={performanceSeries}
                  xKey="match"
                  lines={[
                    { dataKey: 'wickets', name: 'Wickets', color: '#10b981' },
                    { dataKey: 'economy', name: 'Economy', color: '#f97316' }
                  ]}
                  height={220}
                  showGrid
                  showLegend
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Fielding Actions</h3>
                <p className={styles.chartMeta}>Catches, stumpings, run outs</p>
                {hasFieldingSeries ? (
                  <BarChartComponent
                    data={performanceSeries}
                    xKey="match"
                    bars={[
                      { dataKey: 'catches', name: 'Catches', color: '#2563eb', stackId: '1' },
                      { dataKey: 'stumpings', name: 'Stumpings', color: '#f59e0b', stackId: '1' },
                      { dataKey: 'runOuts', name: 'Run Outs', color: '#10b981', stackId: '1' }
                    ]}
                    height={220}
                    showGrid
                    showLegend
                  />
                ) : (
                  <p className={styles.muted}>No fielding data available yet.</p>
                )}
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Fielding Points</h3>
                <p className={styles.chartMeta}>Impact per match</p>
                <LineChartComponent
                  data={performanceSeries}
                  xKey="match"
                  lines={[{ dataKey: 'fieldingPoints', name: 'Fielding Points', color: '#f59e0b' }]}
                  height={220}
                  showGrid
                  showLegend={false}
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Strike Rate Trend</h3>
                <p className={styles.chartMeta}>Runs per 100 balls</p>
                <LineChartComponent
                  data={performanceSeries}
                  xKey="match"
                  lines={[{ dataKey: 'strikeRate', name: 'Strike Rate', color: '#6366f1' }]}
                  height={220}
                  showGrid
                  showLegend={false}
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Efficiency Map</h3>
                <p className={styles.chartMeta}>Runs vs points per match</p>
                <ScatterChartComponent
                  data={performanceSeries}
                  xKey="runs"
                  yKey="points"
                  height={220}
                  xAxisLabel="Runs"
                  yAxisLabel="Points"
                  color="#0ea5e9"
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Bowling Economy</h3>
                <p className={styles.chartMeta}>Runs conceded per over</p>
                <LineChartComponent
                  data={performanceSeries}
                  xKey="match"
                  lines={[{ dataKey: 'economy', name: 'Economy', color: '#f97316' }]}
                  height={220}
                  showGrid
                  showLegend={false}
                />
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Wickets vs Runs</h3>
                <p className={styles.chartMeta}>Bowling impact per match</p>
                <ScatterChartComponent
                  data={performanceSeries}
                  xKey="runsConceded"
                  yKey="wickets"
                  height={220}
                  xAxisLabel="Runs Conceded"
                  yAxisLabel="Wickets"
                  color="#10b981"
                />
              </div>
            </div>
          </section>
        )}

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
            {(stats.catches > 0 || stats.stumpings > 0 || stats.run_outs > 0 || stats.drops > 0 || stats.fielding_points > 0) && (
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
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Drops</span>
                    <span className={styles.statValue}>{stats.drops}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Fielding Points</span>
                    <span className={styles.statValue}>{stats.fielding_points?.toFixed(1) || '0.0'}</span>
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

        {role === 'admin' && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Merge Duplicate Player</h2>
              <span className={styles.pill}>Admin only</span>
            </div>
            <p className={styles.muted}>
              Move stats and match records from a duplicate player into this profile. The duplicate record will be removed
              and stats need to be recalculated.
            </p>
            {mergeError && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                {mergeError}
              </div>
            )}
            {mergeMessage && (
              <div className={`${styles.alert} ${styles.alertSuccess}`}>
                {mergeMessage}
              </div>
            )}
            <div className={styles.mergeRow}>
              <select
                className={styles.select}
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
              >
                <option value="none">Select duplicate player</option>
                {mergeOptions.map((option) => {
                  const name = `${option.first_name || ''} ${option.last_name || ''}`.trim() || 'Unknown Player'
                  const suffix = option.id.slice(0, 6)
                  const linkedLabel = option.user_id ? ' (linked)' : ''
                  return (
                    <option key={option.id} value={option.id}>
                      {name} • {suffix}{linkedLabel}
                    </option>
                  )
                })}
              </select>
              <button
                className={styles.dangerButton}
                onClick={handleMerge}
                disabled={merging}
              >
                {merging ? 'Merging...' : 'Merge into this player'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
