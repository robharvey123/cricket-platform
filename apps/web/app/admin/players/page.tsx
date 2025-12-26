'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface Player {
  id: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  status: string
  season_stats: {
    runs_scored: number
    wickets: number
    total_points: number
    fielding_points: number
    catches: number
    run_outs: number
    drops: number
    batting_average: number | null
    bowling_economy: number | null
    matches_batted: number
    matches_bowled: number
  } | null
}

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStats, setFilterStats] = useState<string>('with')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayers()
  }, [])

  useEffect(() => {
    filterPlayers()
  }, [players, searchTerm, filterRole, filterStats])

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch players')
      }

      setPlayers(data.players || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterPlayers = () => {
    let filtered = [...players]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => {
        const name = (p.full_name || `${p.first_name} ${p.last_name}` || '').toLowerCase()
        return name.includes(searchTerm.toLowerCase())
      })
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(p =>
        p.role?.toLowerCase() === filterRole.toLowerCase()
      )
    }

    if (filterStats === 'with') {
      filtered = filtered.filter((p) => p.season_stats && (
        (p.season_stats.matches_batted || 0) > 0 ||
        (p.season_stats.matches_bowled || 0) > 0
      ))
    } else if (filterStats === 'without') {
      filtered = filtered.filter((p) => !p.season_stats || (
        (p.season_stats.matches_batted || 0) === 0 &&
        (p.season_stats.matches_bowled || 0) === 0
      ))
    }

    setFilteredPlayers(filtered)
  }

  const toggleAll = () => {
    if (filteredPlayers.length === 0) {
      return
    }

    if (selectedIds.size === filteredPlayers.length) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds(new Set(filteredPlayers.map((player) => player.id)))
  }

  const toggleOne = (playerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return
    }

    if (!confirm(`Delete ${selectedIds.size} player(s)? This will remove their stats too.`)) {
      return
    }

    try {
      const response = await fetch('/api/players/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: Array.from(selectedIds) })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete players')
      }

      setSelectedIds(new Set())
      await fetchPlayers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading players...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Squad</span>
            <h1 className={styles.title}>Players</h1>
            <p className={styles.subtitle}>Manage your club roster and view player statistics.</p>
          </div>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Roles</option>
            <option value="batter">Batters</option>
            <option value="bowler">Bowlers</option>
            <option value="all-rounder">All-Rounders</option>
            <option value="wicket-keeper">Wicket-Keepers</option>
          </select>
          <select
            value={filterStats}
            onChange={(e) => setFilterStats(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="with">With stats</option>
            <option value="without">Without stats</option>
            <option value="all">All players</option>
          </select>
          <button
            className={styles.bulkDeleteButton}
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
          >
            Delete Selected ({selectedIds.size})
          </button>
        </div>

        {filteredPlayers.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No players found</h2>
            <p>
              {searchTerm || filterRole !== 'all'
                ? 'Try adjusting your filters.'
                : 'Import matches to automatically create player records.'}
            </p>
          </section>
        ) : (
          <section className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === filteredPlayers.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Player</th>
                    <th>Role</th>
                    <th>Matches</th>
                    <th>Runs</th>
                    <th>Avg</th>
                    <th>Wickets</th>
                    <th>Econ</th>
                    <th>Ct</th>
                    <th>RO</th>
                    <th>Drops</th>
                    <th>Fld Pts</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className={styles.row}
                    >
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(player.id)}
                          onChange={() => toggleOne(player.id)}
                        />
                      </td>
                      <td className={styles.playerName}>
                        <button
                          type="button"
                          className={styles.rowLink}
                          onClick={() => router.push(`/admin/players/${player.id}`)}
                        >
                          <strong>
                            {(player.full_name || `${player.first_name} ${player.last_name}` || 'Unknown Player').trim() || 'Unknown Player'}
                          </strong>
                          <span className={styles.playerIdTag}>
                            • {player.id.slice(0, 6)}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                          {player.role || 'Player'}
                        </span>
                      </td>
                      <td>
                        {player.season_stats
                          ? Math.max(player.season_stats.matches_batted || 0, player.season_stats.matches_bowled || 0)
                          : '-'}
                      </td>
                      <td>{player.season_stats?.runs_scored || '-'}</td>
                      <td>{player.season_stats?.batting_average?.toFixed(1) || '-'}</td>
                      <td>{player.season_stats?.wickets || '-'}</td>
                      <td>{player.season_stats?.bowling_economy?.toFixed(2) || '-'}</td>
                      <td>{player.season_stats?.catches ?? '-'}</td>
                      <td>{player.season_stats?.run_outs ?? '-'}</td>
                      <td>{player.season_stats?.drops ?? '-'}</td>
                      <td>{player.season_stats?.fielding_points?.toFixed(1) || '-'}</td>
                      <td>
                        <strong className={styles.points}>
                          {player.season_stats?.total_points?.toFixed(1) || '-'}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            player.status === 'active' ? styles.badgeSuccess : styles.badgeMuted
                          }`}
                        >
                          {player.status}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={async (event) => {
                            event.stopPropagation()
                            const name = (player.full_name || `${player.first_name} ${player.last_name}` || 'Unknown Player').trim()
                            if (!confirm(`Delete ${name}? This will remove the player and all related stats.`)) {
                              return
                            }
                            try {
                              const response = await fetch(`/api/players/${player.id}`, {
                                method: 'DELETE'
                              })
                              const data = await response.json()

                              if (!response.ok) {
                                throw new Error(data.error || 'Failed to delete player')
                              }

                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                next.delete(player.id)
                                return next
                              })
                              await fetchPlayers()
                            } catch (err: any) {
                              setError(err.message)
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
