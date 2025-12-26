'use client'

import { useEffect, useState } from 'react'
import { useUserRole } from '../../../lib/hooks/useUserRole'
import { getRoleDisplayName, getRoleBadgeColor, type UserRole } from '../../../lib/permissions'
import styles from './page.module.css'

interface ClubUser {
  user_id: string
  email: string
  name?: string | null
  player_id?: string | null
  player_name?: string | null
  role: UserRole
  created_at: string
  last_sign_in?: string
}

interface Invitation {
  id: string
  email: string
  role: UserRole
  status: string
  invited_by_email: string
  created_at: string
  expires_at: string
}

interface PlayerOption {
  id: string
  name: string
  user_id?: string | null
}

export default function UsersPage() {
  const { permissions } = useUserRole()
  const [users, setUsers] = useState<ClubUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingNameFor, setEditingNameFor] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'player' as UserRole
  })
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, invitationsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users/invitations')
      ])

      const usersData = await usersRes.json()
      const invitationsData = await invitationsRes.json()

      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to fetch users')
      if (!invitationsRes.ok && invitationsRes.status !== 404) {
        console.error('Failed to fetch invitations:', invitationsData.error)
      }

      setUsers(usersData.users || [])
      setPlayers(usersData.players || [])
      setInvitations(invitationsData.invitations || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError(null)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setShowInviteForm(false)
      setInviteForm({ email: '', role: 'player' })
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${getRoleDisplayName(newRole)}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role')
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from this club? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user')
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handlePlayerLink = async (userId: string, playerId: string) => {
    const shouldUnlink = playerId === 'unlinked'
    if (shouldUnlink && !confirm('Unlink this user from their player profile?')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}/player`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: shouldUnlink ? null : playerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link player profile')
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStartEditName = (user: ClubUser) => {
    setEditingNameFor(user.user_id)
    setNameDraft(user.name || '')
  }

  const handleCancelEditName = () => {
    setEditingNameFor(null)
    setNameDraft('')
  }

  const handleSaveName = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update name')
      }

      await fetchData()
      setEditingNameFor(null)
      setNameDraft('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (!permissions?.canEditScoringConfig) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.alert}>
            You do not have permission to access user management.
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading users...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Admin Only</span>
            <h1 className={styles.title}>User Management</h1>
            <p className={styles.subtitle}>
              Manage club members, assign roles, and send invitations
            </p>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className={styles.primaryButton}
          >
            Invite User
          </button>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {/* Invite Form Modal */}
        {showInviteForm && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>Invite New User</h2>
              <form onSubmit={handleInvite} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                    className={styles.input}
                  >
                    <option value="player">Player (View Only)</option>
                    <option value="captain">Captain (Team Management)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={inviting}
                    className={styles.primaryButton}
                  >
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Current Users */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Club Members ({users.length})</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Player Profile</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Last Sign In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.email}</td>
                    <td>
                      {editingNameFor === user.user_id ? (
                        <div className={styles.inlineEdit}>
                          <input
                            className={styles.roleSelect}
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            placeholder="Full name"
                          />
                          <button
                            className={styles.secondaryButton}
                            onClick={() => handleSaveName(user.user_id)}
                          >
                            Save
                          </button>
                          <button
                            className={styles.ghostButton}
                            onClick={handleCancelEditName}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className={styles.inlineEdit}>
                          <span>{user.name || user.email || user.player_name || '-'}</span>
                          <button
                            className={styles.ghostButton}
                            onClick={() => handleStartEditName(user)}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        value={user.player_id || 'unlinked'}
                        onChange={(e) => handlePlayerLink(user.user_id, e.target.value)}
                        className={styles.roleSelect}
                      >
                        <option value="unlinked">Unlinked</option>
                        {players.map((player) => (
                          (() => {
                            const shortId = player.id.slice(0, 6)
                            const label = `${player.name || 'Unnamed player'} • ${shortId}`
                            const linkedLabel = player.user_id
                              ? player.user_id === user.user_id
                                ? ' (linked to this user)'
                                : ' (linked)'
                              : ''
                            return (
                          <option
                            key={player.id}
                            value={player.id}
                            disabled={!!player.user_id && player.user_id !== user.user_id}
                          >
                            {label}
                            {linkedLabel}
                          </option>
                            )
                          })()
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={styles.roleBadge}
                        style={{ background: getRoleBadgeColor(user.role) }}
                      >
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className={styles.muted}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className={styles.muted}>
                      {user.last_sign_in
                        ? new Date(user.last_sign_in).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                          className={styles.roleSelect}
                        >
                          <option value="player">Player</option>
                          <option value="captain">Captain</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveUser(user.user_id, user.email)}
                          className={styles.dangerButton}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Pending Invitations ({invitations.length})</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited By</th>
                    <th>Sent</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>
                        <span
                          className={styles.roleBadge}
                          style={{ background: getRoleBadgeColor(invitation.role) }}
                        >
                          {getRoleDisplayName(invitation.role)}
                        </span>
                      </td>
                      <td className={styles.muted}>{invitation.invited_by_email}</td>
                      <td className={styles.muted}>
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className={styles.muted}>
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${invitation.status}`]}`}>
                          {invitation.status}
                        </span>
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
