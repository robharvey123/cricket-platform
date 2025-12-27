'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface Match {
  id: string
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
  teams?: {
    id: string
    name: string
  } | null
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch matches')
      }

      setMatches(data.matches || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (matchId: string, opponentName: string) => {
    if (!confirm(`Are you sure you want to delete the match vs ${opponentName}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete match')
      }

      // Refresh matches list
      fetchMatches()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedMatchIds.length === 0) return

    if (!confirm(`Delete ${selectedMatchIds.length} match(es)? This action cannot be undone.`)) {
      return
    }

    setError(null)

    const results = await Promise.allSettled(
      selectedMatchIds.map((matchId) =>
        fetch(`/api/matches/${matchId}`, { method: 'DELETE' })
      )
    )

    const failedDeletes = results.filter(
      (result) => result.status === 'rejected'
    )

    if (failedDeletes.length > 0) {
      setError(`Failed to delete ${failedDeletes.length} match(es).`)
    }

    setSelectedMatchIds([])
    fetchMatches()
  }

  const teamOptions = useMemo(() => {
    return Array.from(
      new Set((matches || []).map((match) => match.teams?.name).filter(Boolean))
    ).sort()
  }, [matches])

  const resultOptions = useMemo(() => {
    return Array.from(
      new Set((matches || []).map((match) => match.result).filter(Boolean))
    ).sort()
  }, [matches])

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set((matches || []).map((match) => match.match_type).filter(Boolean))
    ).sort()
  }, [matches])

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    let filtered = (matches || []).filter((match) => {
      const teamName = match.teams?.name || ''
      const matchesSearch =
        normalizedSearch.length === 0 ||
        match.opponent_name.toLowerCase().includes(normalizedSearch) ||
        (match.venue || '').toLowerCase().includes(normalizedSearch) ||
        (match.match_type || '').toLowerCase().includes(normalizedSearch) ||
        teamName.toLowerCase().includes(normalizedSearch)

      if (!matchesSearch) {
        return false
      }

      if (teamFilter !== 'all' && teamName !== teamFilter) {
        return false
      }

      if (resultFilter !== 'all' && match.result !== resultFilter) {
        return false
      }

      if (typeFilter !== 'all' && match.match_type !== typeFilter) {
        return false
      }

      if (statusFilter === 'published' && !match.published) {
        return false
      }

      if (statusFilter === 'draft' && match.published) {
        return false
      }

      return true
    })

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        case 'opponent_asc':
          return a.opponent_name.localeCompare(b.opponent_name)
        case 'opponent_desc':
          return b.opponent_name.localeCompare(a.opponent_name)
        case 'team_asc':
          return (a.teams?.name || '').localeCompare(b.teams?.name || '')
        case 'team_desc':
          return (b.teams?.name || '').localeCompare(a.teams?.name || '')
        case 'result_asc':
          return a.result.localeCompare(b.result)
        case 'result_desc':
          return b.result.localeCompare(a.result)
        case 'date_desc':
        default:
          return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      }
    })

    return filtered
  }, [
    matches,
    resultFilter,
    search,
    sortBy,
    statusFilter,
    teamFilter,
    typeFilter
  ])

  const visibleMatchIds = useMemo(
    () => filteredMatches.map((match) => match.id),
    [filteredMatches]
  )
  const selectedMatchIdSet = useMemo(
    () => new Set(selectedMatchIds),
    [selectedMatchIds]
  )
  const allVisibleSelected =
    visibleMatchIds.length > 0 &&
    visibleMatchIds.every((id) => selectedMatchIdSet.has(id))

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading matches...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Club Records</span>
            <h1 className={styles.title}>Matches</h1>
            <p className={styles.subtitle}>Review scorecards, results, and stats.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/admin/matches/new" className={styles.primaryButton}>
              Create Match
            </Link>
            <Link href="/admin/matches/import-pdf" className={styles.secondaryButton}>
              Import from PDF
            </Link>
          </div>
        </header>

        <section className={styles.filtersCard}>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              Search
              <input
                className={styles.searchInput}
                placeholder="Opponent, venue, or team..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className={styles.filterLabel}>
              Team
              <select
                className={styles.select}
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
              >
                <option value="all">All teams</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterLabel}>
              Result
              <select
                className={styles.select}
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value)}
              >
                <option value="all">All results</option>
                {resultOptions.map((result) => (
                  <option key={result} value={result}>
                    {result}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterLabel}>
              Type
              <select
                className={styles.select}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterLabel}>
              Status
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>

            <label className={styles.filterLabel}>
              Sort by
              <select
                className={styles.select}
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="date_desc">Date (newest)</option>
                <option value="date_asc">Date (oldest)</option>
                <option value="opponent_asc">Opponent (A–Z)</option>
                <option value="opponent_desc">Opponent (Z–A)</option>
                <option value="team_asc">Team (A–Z)</option>
                <option value="team_desc">Team (Z–A)</option>
                <option value="result_asc">Result (A–Z)</option>
                <option value="result_desc">Result (Z–A)</option>
              </select>
            </label>
          </div>
        </section>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {filteredMatches.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No matches yet</h2>
            <p>Import a scorecard PDF to get your first match on the board.</p>
            <Link href="/admin/matches/import-pdf" className={styles.primaryButton}>
              Import your first match
            </Link>
          </section>
        ) : (
          <section className={styles.tableCard}>
            <div className={styles.bulkBar}>
              <div className={styles.bulkInfo}>
                {selectedMatchIds.length > 0
                  ? `${selectedMatchIds.length} selected`
                  : 'Select matches to delete'}
              </div>
              <button
                className={styles.bulkDeleteButton}
                onClick={handleBulkDelete}
                disabled={selectedMatchIds.length === 0}
              >
                Delete Selected
              </button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedMatchIds(visibleMatchIds)
                          } else {
                            setSelectedMatchIds([])
                          }
                        }}
                      />
                    </th>
                    <th>Date</th>
                    <th>Team</th>
                    <th>Opponent</th>
                    <th>Venue</th>
                    <th>Type</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th className={styles.tableAction}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match) => {
                    const resultClass =
                      match.result === 'won'
                        ? styles.badgeSuccess
                        : match.result === 'lost'
                          ? styles.badgeDanger
                          : styles.badgeMuted

                    return (
                      <tr key={match.id} className={styles.row}>
                        <td className={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            checked={selectedMatchIdSet.has(match.id)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const next = new Set(selectedMatchIdSet)
                              if (event.target.checked) {
                                next.add(match.id)
                              } else {
                                next.delete(match.id)
                              }
                              setSelectedMatchIds(Array.from(next))
                            }}
                          />
                        </td>
                        <td
                          className={styles.cellButton}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          {new Date(match.match_date).toLocaleDateString()}
                        </td>
                        <td
                          className={styles.cellButton}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          {match.teams?.name || 'Unknown team'}
                        </td>
                        <td
                          className={styles.cellButton}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          {match.opponent_name}
                        </td>
                        <td
                          className={styles.cellMuted}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          {match.venue || '-'}
                        </td>
                        <td
                          className={styles.cellButton}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            {match.match_type}
                          </span>
                        </td>
                        <td
                          className={styles.cellButton}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          <span className={`${styles.badge} ${resultClass}`}>
                            {match.result}
                          </span>
                        </td>
                        <td
                          className={styles.cellButton}
                          onClick={() => router.push(`/admin/matches/${match.id}`)}
                        >
                          <span
                            className={`${styles.badge} ${
                              match.published ? styles.badgeInfo : styles.badgeWarning
                            }`}
                          >
                            {match.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className={styles.tableActionCell}>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.secondaryButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/admin/matches/${match.id}/edit`)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(match.id, match.opponent_name)
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
