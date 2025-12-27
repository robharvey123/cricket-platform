'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Team {
  id: string
  name: string
  created_at: string
}

interface Captain {
  id: string
  user_id: string
  email: string
  assigned_at: string
}

interface ClubUser {
  user_id: string
  email: string
  role: string
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
  const [managingCaptains, setManagingCaptains] = useState<string | null>(null)
  const [captains, setCaptains] = useState<Record<string, Captain[]>>({})
  const [clubUsers, setClubUsers] = useState<ClubUser[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')

  useEffect(() => {
    fetchTeams()
    fetchClubUsers()
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

  const fetchClubUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setClubUsers(data.users || [])
    } catch (err: any) {
      console.error('Failed to fetch users:', err)
    }
  }

  const fetchTeamCaptains = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/captains`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch captains')
      }

      setCaptains(prev => ({
        ...prev,
        [teamId]: data.captains || []
      }))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleManageCaptains = async (teamId: string) => {
    setManagingCaptains(teamId)
    setSelectedUser('')
    await fetchTeamCaptains(teamId)
  }

  const handleAssignCaptain = async (teamId: string) => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/teams/${teamId}/captains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign captain')
      }

      setSelectedUser('')
      await fetchTeamCaptains(teamId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveCaptain = async (teamId: string, captainId: string) => {
    if (!confirm('Remove this captain from the team?')) return

    try {
      const response = await fetch(`/api/teams/${teamId}/captains?captainId=${captainId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove captain')
      }

      await fetchTeamCaptains(teamId)
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
                      <Fragment key={team.id}>
                        <tr>
                          <td>
                            <strong>{team.name}</strong>
                          </td>
                          <td>{new Date(team.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className={styles.actions}>
                              <Link
                                href={`/admin/teams/${team.id}`}
                                className={styles.linkButton}
                              >
                                Analytics
                              </Link>
                              <button
                                onClick={() => handleManageCaptains(team.id)}
                                className={styles.linkButton}
                              >
                                Captains
                              </button>
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
                        {managingCaptains === team.id && (
                          <tr>
                            <td colSpan={3} className={styles.captainManagement}>
                              <div className={styles.captainSection}>
                                <h3>Team Captains</h3>

                                {captains[team.id] && captains[team.id]!.length > 0 && (
                                  <div className={styles.captainList}>
                                    {captains[team.id]!.map((captain) => (
                                      <div key={captain.id} className={styles.captainItem}>
                                        <span>{captain.email}</span>
                                        <button
                                          onClick={() => handleRemoveCaptain(team.id, captain.id)}
                                          className={styles.removeCaptainButton}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className={styles.assignCaptainForm}>
                                  <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className={styles.select}
                                  >
                                    <option value="">Select a user to assign as captain</option>
                                    {clubUsers
                                      .filter(u => !captains[team.id]?.some(c => c.user_id === u.user_id))
                                      .map((user) => (
                                        <option key={user.user_id} value={user.user_id}>
                                          {user.email} ({user.role})
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={() => handleAssignCaptain(team.id)}
                                    disabled={!selectedUser}
                                    className={styles.primaryButton}
                                  >
                                    Assign Captain
                                  </button>
                                  <button
                                    onClick={() => setManagingCaptains(null)}
                                    className={styles.secondaryButton}
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
