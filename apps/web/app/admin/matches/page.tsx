'use client'

import { useEffect, useState } from 'react'
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
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
          <Link href="/admin/matches/import-pdf" className={styles.primaryButton}>
            Import from PDF
          </Link>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {matches.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No matches yet</h2>
            <p>Import a scorecard PDF to get your first match on the board.</p>
            <Link href="/admin/matches/import-pdf" className={styles.primaryButton}>
              Import your first match
            </Link>
          </section>
        ) : (
          <section className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Venue</th>
                    <th>Type</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th className={styles.tableAction}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => {
                    const resultClass =
                      match.result === 'won'
                        ? styles.badgeSuccess
                        : match.result === 'lost'
                          ? styles.badgeDanger
                          : styles.badgeMuted

                    return (
                      <tr key={match.id} className={styles.row}>
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
                          <button
                            className={styles.secondaryButton}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/matches/${match.id}/edit`)
                            }}
                          >
                            Edit
                          </button>
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
