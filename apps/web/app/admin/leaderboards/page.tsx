'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { exportLeaderboardCSV } from '../../../lib/export-utils'
import {
  BarChartComponent,
  LineChartComponent,
  ScatterChartComponent
} from '../../../components/charts'

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
  catches: number
  stumpings: number
  run_outs: number
  drops: number
  fielding_points: number
  players: Player
}

interface Team {
  id: string
  name: string
}

export default function LeaderboardsPage() {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'points' | 'fielding'>('batting')
  const [battingLeaders, setBattingLeaders] = useState<LeaderboardEntry[]>([])
  const [bowlingLeaders, setBowlingLeaders] = useState<LeaderboardEntry[]>([])
  const [pointsLeaders, setPointsLeaders] = useState<LeaderboardEntry[]>([])
  const [averageLeaders, setAverageLeaders] = useState<LeaderboardEntry[]>([])
  const [economyLeaders, setEconomyLeaders] = useState<LeaderboardEntry[]>([])
  const [fieldingLeaders, setFieldingLeaders] = useState<LeaderboardEntry[]>([])
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamFilter, setTeamFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null)

  const formatPlayerName = (entry: LeaderboardEntry) =>
    entry.players?.full_name ||
    `${entry.players?.first_name || ''} ${entry.players?.last_name || ''}`.trim() ||
    'Unknown Player'

  useEffect(() => {
    fetchLeaderboards(teamFilter)
  }, [teamFilter])

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch teams')
      }

      setTeams(data.teams || [])
    } catch (err: any) {
      console.error('Failed to load teams:', err.message)
    }
  }

  const fetchLeaderboards = async (teamId = 'all') => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (teamId && teamId !== 'all') {
        params.set('teamId', teamId)
      }
      const response = await fetch(`/api/leaderboards${params.toString() ? `?${params.toString()}` : ''}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboards')
      }

      setBattingLeaders(data.batting)
      setBowlingLeaders(data.bowling)
      setPointsLeaders(data.points)
      setAverageLeaders(data.average)
      setEconomyLeaders(data.economy)
      setFieldingLeaders(data.fielding || [])
      setActiveSeason(data.activeSeason)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    setRecalcMessage(null)

    try {
      const response = await fetch('/api/stats/calculate', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate stats')
      }

      setRecalcMessage(`Recalculated ${data.processed || 0} player(s) across ${data.matches || 0} match(es).`)
      await fetchLeaderboards()
    } catch (err: any) {
      setRecalcMessage(err.message)
    } finally {
      setRecalculating(false)
    }
  }

  const handleExport = () => {
    let data: any[] = []
    let type: 'batting' | 'bowling' | 'points' = 'batting'

    if (activeTab === 'batting') {
      data = battingLeaders.map((entry, index) => ({
        rank: index + 1,
        player_name: entry.players?.full_name || `${entry.players?.first_name} ${entry.players?.last_name}`,
        total_runs: entry.runs_scored,
        innings_count: entry.innings_batted,
        batting_average: entry.batting_average,
        strike_rate: entry.batting_strike_rate,
        highest_score: entry.highest_score,
      }))
      type = 'batting'
    } else if (activeTab === 'bowling') {
      data = bowlingLeaders.map((entry, index) => ({
        rank: index + 1,
        player_name: entry.players?.full_name || `${entry.players?.first_name} ${entry.players?.last_name}`,
        total_wickets: entry.wickets,
        overs_bowled: entry.overs_bowled,
        bowling_average: entry.bowling_average,
        economy: entry.bowling_economy,
      }))
      type = 'bowling'
    } else {
      data = pointsLeaders.map((entry, index) => ({
        rank: index + 1,
        player_name: entry.players?.full_name || `${entry.players?.first_name} ${entry.players?.last_name}`,
        total_points: entry.total_points,
        batting_points: 0, // TODO: Add these fields to the data model
        bowling_points: 0,
        fielding_points: 0,
      }))
      type = 'points'
    }

    exportLeaderboardCSV(data, type, activeSeason?.name || 'season')
  }

  const battingChartData = battingLeaders.slice(0, 8).map((entry) => ({
    player: formatPlayerName(entry),
    runs: entry.runs_scored,
    average: entry.batting_average || 0,
    strikeRate: entry.batting_strike_rate || 0,
    highestScore: entry.highest_score
  }))

  const bowlingChartData = bowlingLeaders.slice(0, 8).map((entry) => ({
    player: formatPlayerName(entry),
    wickets: entry.wickets,
    economy: entry.bowling_economy || 0,
    average: entry.bowling_average || 0,
    overs: entry.overs_bowled || 0
  }))

  const pointsChartData = pointsLeaders.slice(0, 8).map((entry) => ({
    player: formatPlayerName(entry),
    points: entry.total_points,
    runs: entry.runs_scored || 0,
    wickets: entry.wickets || 0
  }))

  const fieldingChartData = fieldingLeaders.slice(0, 8).map((entry) => ({
    player: formatPlayerName(entry),
    fieldingPoints: entry.fielding_points || 0,
    catches: entry.catches || 0,
    runOuts: entry.run_outs || 0,
    drops: entry.drops || 0
  }))

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
          <div className={styles.headerActions}>
            <label className={styles.filterControl}>
              <span className={styles.filterLabel}>Team</span>
              <select
                className={styles.filterSelect}
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
              >
                <option value="all">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={styles.recalcButton}
              onClick={handleExport}
              style={{ backgroundColor: '#10b981' }}
            >
              Export CSV
            </button>
            <button
              className={styles.recalcButton}
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              {recalculating ? 'Recalculating...' : 'Recalculate Stats'}
            </button>
          </div>
        </header>

        {recalcMessage && (
          <div className={styles.recalcStatus}>
            {recalcMessage}
          </div>
        )}

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
          <button
            className={`${styles.tab} ${activeTab === 'fielding' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('fielding')}
          >
            Fielding
          </button>
        </div>

        {/* Batting Tab */}
        {activeTab === 'batting' && (
          <div className={styles.tabContent}>
            <section className={styles.chartsSection}>
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Runs Leaders</h3>
                  <p className={styles.chartMeta}>Top 8 by total runs</p>
                  <BarChartComponent
                    data={battingChartData}
                    xKey="player"
                    bars={[{ dataKey: 'runs', name: 'Runs', color: '#0ea5e9' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Batting Efficiency</h3>
                  <p className={styles.chartMeta}>Average and strike rate</p>
                  <LineChartComponent
                    data={battingChartData}
                    xKey="player"
                    lines={[
                      { dataKey: 'average', name: 'Average', color: '#8b5cf6' },
                      { dataKey: 'strikeRate', name: 'Strike Rate', color: '#f97316' }
                    ]}
                    height={260}
                    showGrid
                    showLegend
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Highest Scores</h3>
                  <p className={styles.chartMeta}>Peak innings this season</p>
                  <BarChartComponent
                    data={battingChartData}
                    xKey="player"
                    bars={[{ dataKey: 'highestScore', name: 'Highest Score', color: '#22c55e' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
              </div>
            </section>
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
                              {entry.players?.full_name || 'Unknown Player'}
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
                              {entry.players?.full_name || 'Unknown Player'}
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
            <section className={styles.chartsSection}>
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Wicket Takers</h3>
                  <p className={styles.chartMeta}>Top 8 wicket hauls</p>
                  <BarChartComponent
                    data={bowlingChartData}
                    xKey="player"
                    bars={[{ dataKey: 'wickets', name: 'Wickets', color: '#10b981' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Bowling Efficiency</h3>
                  <p className={styles.chartMeta}>Average and economy</p>
                  <LineChartComponent
                    data={bowlingChartData}
                    xKey="player"
                    lines={[
                      { dataKey: 'average', name: 'Average', color: '#0ea5e9' },
                      { dataKey: 'economy', name: 'Economy', color: '#f97316' }
                    ]}
                    height={260}
                    showGrid
                    showLegend
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Overs Bowled</h3>
                  <p className={styles.chartMeta}>Workload leaders</p>
                  <BarChartComponent
                    data={bowlingChartData}
                    xKey="player"
                    bars={[{ dataKey: 'overs', name: 'Overs', color: '#6366f1' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
              </div>
            </section>
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
                              {entry.players?.full_name || 'Unknown Player'}
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
                              {entry.players?.full_name || 'Unknown Player'}
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
            <section className={styles.chartsSection}>
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Total Points</h3>
                  <p className={styles.chartMeta}>Top 8 point scorers</p>
                  <BarChartComponent
                    data={pointsChartData}
                    xKey="player"
                    bars={[{ dataKey: 'points', name: 'Points', color: '#7c3aed' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>All-round Impact</h3>
                  <p className={styles.chartMeta}>Runs vs wickets (size = points)</p>
                  <ScatterChartComponent
                    data={pointsChartData}
                    xKey="runs"
                    yKey="wickets"
                    zKey="points"
                    height={260}
                    xAxisLabel="Runs"
                    yAxisLabel="Wickets"
                    color="#0ea5e9"
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Runs Contribution</h3>
                  <p className={styles.chartMeta}>Runs among points leaders</p>
                  <BarChartComponent
                    data={pointsChartData}
                    xKey="player"
                    bars={[{ dataKey: 'runs', name: 'Runs', color: '#22c55e' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
              </div>
            </section>
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
                            {entry.players?.full_name || 'Unknown Player'}
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

        {activeTab === 'fielding' && (
          <div className={styles.tabContent}>
            <section className={styles.chartsSection}>
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Fielding Points</h3>
                  <p className={styles.chartMeta}>Top 8 by impact</p>
                  <BarChartComponent
                    data={fieldingChartData}
                    xKey="player"
                    bars={[{ dataKey: 'fieldingPoints', name: 'Fielding Points', color: '#f59e0b' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Catches & Run Outs</h3>
                  <p className={styles.chartMeta}>Primary fielding actions</p>
                  <BarChartComponent
                    data={fieldingChartData}
                    xKey="player"
                    bars={[
                      { dataKey: 'catches', name: 'Catches', color: '#2563eb', stackId: '1' },
                      { dataKey: 'runOuts', name: 'Run Outs', color: '#10b981', stackId: '1' }
                    ]}
                    height={260}
                    showGrid
                    showLegend
                    layout="vertical"
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Drops</h3>
                  <p className={styles.chartMeta}>Areas to improve</p>
                  <BarChartComponent
                    data={fieldingChartData}
                    xKey="player"
                    bars={[{ dataKey: 'drops', name: 'Drops', color: '#ef4444' }]}
                    height={260}
                    showGrid
                    showLegend={false}
                    layout="vertical"
                  />
                </div>
              </div>
            </section>
            <div className={styles.leaderboardGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Fielding Points</h2>
                  <span className={styles.pill}>Season Leaders</span>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rankCol}>#</th>
                        <th>Player</th>
                        <th>Fld Pts</th>
                        <th>Catches</th>
                        <th>Run Outs</th>
                        <th>Drops</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldingLeaders.slice(0, 10).map((entry, idx) => (
                        <tr key={entry.player_id}>
                          <td className={styles.rankCol}>
                            <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                              {entry.players?.full_name || 'Unknown Player'}
                            </Link>
                          </td>
                          <td><strong>{entry.fielding_points?.toFixed(1) || '-'}</strong></td>
                          <td>{entry.catches || 0}</td>
                          <td>{entry.run_outs || 0}</td>
                          <td>{entry.drops || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Most Catches</h2>
                  <span className={styles.muted}>Season leaders</span>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rankCol}>#</th>
                        <th>Player</th>
                        <th>Catches</th>
                        <th>Run Outs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...fieldingLeaders]
                        .sort((a, b) => (b.catches || 0) - (a.catches || 0))
                        .slice(0, 10)
                        .map((entry, idx) => (
                          <tr key={`${entry.player_id}-catch`}>
                            <td className={styles.rankCol}>
                              <span className={`${styles.rank} ${idx < 3 ? styles.rankTop : ''}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td>
                              <Link href={`/admin/players/${entry.player_id}`} className={styles.link}>
                                {entry.players?.full_name || 'Unknown Player'}
                              </Link>
                            </td>
                            <td><strong>{entry.catches || 0}</strong></td>
                            <td>{entry.run_outs || 0}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
