'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function NewMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    opponent_name: '',
    match_date: '',
    venue: '',
    match_type: 'T20',
    result: 'won'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/matches/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match')
      }

      // Redirect to edit page to add scorecard details
      router.push(`/admin/matches/${data.matchId}/edit`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.backRow}>
          <Link href="/admin/matches" className={styles.backLink}>
            ← Back to Matches
          </Link>
        </div>

        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Match Management</span>
            <h1 className={styles.title}>Create New Match</h1>
            <p className={styles.subtitle}>
              Manually create a match and add scorecard details.
            </p>
          </div>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Match Details</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="opponent_name">Opponent Name</label>
                <input
                  type="text"
                  id="opponent_name"
                  value={formData.opponent_name}
                  onChange={(e) => setFormData({ ...formData, opponent_name: e.target.value })}
                  placeholder="e.g., Wanderers CC"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="match_date">Match Date</label>
                <input
                  type="date"
                  id="match_date"
                  value={formData.match_date}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="venue">Venue</label>
                <input
                  type="text"
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g., Lord's Cricket Ground"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="match_type">Match Type</label>
                <select
                  id="match_type"
                  value={formData.match_type}
                  onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                  className={styles.input}
                >
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="Test">Test</option>
                  <option value="T10">T10</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="result">Result</label>
              <select
                id="result"
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className={styles.input}
              >
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="tied">Tied</option>
                <option value="no_result">No Result</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>

            <div className={styles.helpBox}>
              <p>
                After creating the match, you'll be taken to the scorecard editor where you can add
                detailed innings, batting, bowling, and fielding statistics.
              </p>
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={loading}
                className={styles.primaryButton}
              >
                {loading ? 'Creating...' : 'Create Match & Add Scorecard'}
              </button>
              <Link href="/admin/matches" className={styles.secondaryButton}>
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
