'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Match {
  id: string
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
}

export default function PublicMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultFilter, setResultFilter] = useState<string>('all')

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

      // Only show published matches on public page
      const publishedMatches = (data.matches || []).filter((m: Match) => m.published)
      setMatches(publishedMatches)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredMatches = resultFilter === 'all'
    ? matches
    : matches.filter(m => m.result === resultFilter)

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
            <span className={styles.kicker}>Match Center</span>
            <h1 className={styles.title}>Matches</h1>
            <p className={styles.subtitle}>
              View all published match results and scorecards
            </p>
          </div>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <div className={styles.filters}>
          <label className={styles.filterLabel}>Filter by result:</label>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Results</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="tied">Tied</option>
            <option value="no_result">No Result</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>

        {filteredMatches.length === 0 ? (
          <section className={styles.card}>
            <p className={styles.emptyText}>
              {resultFilter === 'all'
                ? 'No matches published yet. Check back soon!'
                : `No ${resultFilter} matches found.`}
            </p>
          </section>
        ) : (
          <div className={styles.matchesGrid}>
            {filteredMatches.map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className={styles.matchCard}
              >
                <div className={styles.matchDate}>
                  {new Date(match.match_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className={styles.matchTeams}>
                  <div className={styles.teamName}>Brookweald CC</div>
                  <div className={styles.vs}>vs</div>
                  <div className={styles.teamName}>{match.opponent_name}</div>
                </div>
                <div className={styles.matchDetails}>
                  <span className={styles.matchType}>{match.match_type}</span>
                  {match.venue && (
                    <>
                      <span className={styles.separator}>•</span>
                      <span className={styles.venue}>{match.venue}</span>
                    </>
                  )}
                </div>
                <div className={styles.matchResult}>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
