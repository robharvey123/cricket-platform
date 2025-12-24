'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false
  })

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch seasons')
      }

      setSeasons(data.seasons || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const url = editingSeason
        ? `/api/seasons/${editingSeason.id}`
        : '/api/seasons'
      const method = editingSeason ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save season')
      }

      setFormData({ name: '', start_date: '', end_date: '', is_active: false })
      setShowForm(false)
      setEditingSeason(null)
      fetchSeasons()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (season: Season) => {
    setEditingSeason(season)
    setFormData({
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
      is_active: season.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this season?')) return

    try {
      const response = await fetch(`/api/seasons/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete season')
      }

      fetchSeasons()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleActive = async (season: Season) => {
    try {
      const response = await fetch(`/api/seasons/${season.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...season, is_active: !season.is_active })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update season')
      }

      fetchSeasons()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading seasons...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Competition Setup</span>
            <h1 className={styles.title}>Seasons</h1>
            <p className={styles.subtitle}>
              Manage your cricket seasons and set the active season for match tracking.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingSeason(null)
              setFormData({ name: '', start_date: '', end_date: '', is_active: false })
            }}
            className={styles.primaryButton}
          >
            {showForm ? 'Cancel' : 'Add Season'}
          </button>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {showForm && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              {editingSeason ? 'Edit Season' : 'Add New Season'}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Season Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 2024 Season"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="start_date">Start Date</label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="end_date">End Date</label>
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className={styles.checkbox}
                  />
                  <span>Set as active season (only one season can be active at a time)</span>
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  {editingSeason ? 'Update Season' : 'Create Season'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingSeason(null)
                    setFormData({ name: '', start_date: '', end_date: '', is_active: false })
                  }}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {seasons.length === 0 ? (
          <section className={styles.emptyCard}>
            <h2>No seasons yet</h2>
            <p>Create your first season to start tracking matches and statistics.</p>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={styles.tableBlock}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((season) => (
                      <tr key={season.id}>
                        <td>
                          <strong>{season.name}</strong>
                        </td>
                        <td>{new Date(season.start_date).toLocaleDateString()}</td>
                        <td>{new Date(season.end_date).toLocaleDateString()}</td>
                        <td>
                          {season.is_active ? (
                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                              Active
                            </span>
                          ) : (
                            <span className={`${styles.badge} ${styles.badgeMuted}`}>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              onClick={() => toggleActive(season)}
                              className={styles.linkButton}
                            >
                              {season.is_active ? 'Deactivate' : 'Set Active'}
                            </button>
                            <button
                              onClick={() => handleEdit(season)}
                              className={styles.linkButton}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(season.id)}
                              className={`${styles.linkButton} ${styles.dangerButton}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
