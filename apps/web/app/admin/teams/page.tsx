'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Team {
  id: string
  name: string
  created_at: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })

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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const url = editingTeam
        ? `/api/teams/${editingTeam.id}`
        : '/api/teams'
      const method = editingTeam ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save team')
      }

      setFormData({ name: '' })
      setShowForm(false)
      setEditingTeam(null)
      fetchTeams()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (team: Team) => {
    setEditingTeam(team)
    setFormData({
      name: team.name
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return

    try {
      const response = await fetch(`/api/teams/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete team')
      }

      fetchTeams()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading teams...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Club Structure</span>
            <h1 className={styles.title}>Teams</h1>
            <p className={styles.subtitle}>
              Manage your cricket teams and squads.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingTeam(null)
              setFormData({ name: '' })
            }}
            className={styles.primaryButton}
          >
            {showForm ? 'Cancel' : 'Add Team'}
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
              {editingTeam ? 'Edit Team' : 'Add New Team'}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Team Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 1st XI, 2nd XI, Under 19s"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingTeam(null)
                    setFormData({ name: '' })
                  }}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {teams.length === 0 ? (
          <section className={styles.emptyCard}>
            <h2>No teams yet</h2>
            <p>Create your first team to start organizing matches and players.</p>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={styles.tableBlock}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.id}>
                        <td>
                          <strong>{team.name}</strong>
                        </td>
                        <td>{new Date(team.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleEdit(team)}
                              className={styles.linkButton}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(team.id)}
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
