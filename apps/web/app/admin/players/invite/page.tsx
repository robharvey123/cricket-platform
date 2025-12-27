'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  user_id?: string;
  invitation_status?: 'not_invited' | 'pending' | 'accepted';
}

export default function InvitePlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteMethod, setInviteMethod] = useState<'email' | 'whatsapp' | 'both'>('both')
  const [clubName, setClubName] = useState('')
  const [inviteLink, setInviteLink] = useState('')

  useEffect(() => {
    fetchPlayers()
    fetchClubInfo()
  }, [])

  async function fetchPlayers() {
    try {
      const response = await fetch('/api/players?include_contact=true')
      if (response.ok) {
        const data = await response.json()
        setPlayers(data.players || [])
      }
    } catch (error) {
      console.error('Failed to fetch players:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchClubInfo() {
    try {
      const response = await fetch('/api/club/info')
      if (response.ok) {
        const data = await response.json()
        setClubName(data.club.name)
        // Generate invite link based on club slug
        const baseUrl = window.location.origin
        setInviteLink(`${baseUrl}/join/${data.club.slug}`)
        return
      }
      const fallback = await fetch('/api/onboarding/status')
      if (fallback.ok) {
        const data = await fallback.json()
        setClubName(data.club.name)
        const baseUrl = window.location.origin
        setInviteLink(`${baseUrl}/join/${data.club.slug}`)
      }
    } catch (error) {
      console.error('Failed to fetch club info:', error)
    }
  }

  function togglePlayer(playerId: string) {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  function selectAll() {
    const uninvitedPlayers = players.filter(
      (p) => !p.user_id && (p.email || p.phone)
    )
    setSelectedPlayers(new Set(uninvitedPlayers.map((p) => p.id)))
  }

  function deselectAll() {
    setSelectedPlayers(new Set())
  }

  async function sendInvitations() {
    if (selectedPlayers.size === 0) {
      setMessage('Please select at least one player to invite')
      return
    }

    setSending(true)
    setMessage('')

    try {
      const response = await fetch('/api/players/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayers),
          method: inviteMethod,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(
          `✅ Invitations sent successfully! ${data.sent} sent, ${data.failed || 0} failed.`
        )
        setSelectedPlayers(new Set())
        fetchPlayers()
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const uninvitedPlayers = players.filter((p) => !p.user_id && (p.email || p.phone))
  const invitedPlayers = players.filter((p) => p.user_id || p.invitation_status === 'pending')
  const selectedCount = selectedPlayers.size

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
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backLink}>
            ← Back
          </button>
          <h1 className={styles.title}>Invite Players to {clubName}</h1>
          <p className={styles.subtitle}>
            Send personalized invitations via email or WhatsApp
          </p>
        </div>

        {/* Instructions Card */}
        <div className={`${styles.card} ${styles.infoCard}`}>
          <h3 className={styles.infoTitle}>📱 How player invitations work:</h3>
          <div className={styles.infoList}>
            <p>
              <strong>1. Select players:</strong> Choose which players to invite from the list below
            </p>
            <p>
              <strong>2. Choose method:</strong> Send via email, WhatsApp, or both
            </p>
            <p>
              <strong>3. Players receive link:</strong> They get a personalized invitation with a join link
            </p>
            <p>
              <strong>4. Players sign up:</strong> They create an account and get linked to their player profile
            </p>
            <p>
              <strong>5. Access granted:</strong> Players can view their stats, leaderboards, and profile
            </p>
          </div>

          <div className={styles.inviteLinkBox}>
            <p className={styles.controlsHint}>Your club invite link:</p>
            <div className={styles.inviteRow}>
              <input
                type="text"
                value={inviteLink}
                readOnly
                className={styles.inviteInput}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  alert('Link copied!')
                }}
                className={styles.copyButton}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Invitation Controls */}
        <div className={styles.card}>
          <div className={styles.controlsHeader}>
            <div>
              <h2 className={styles.controlsTitle}>
                Uninvited Players ({uninvitedPlayers.length})
              </h2>
              <p className={styles.controlsHint}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'Select players to invite'}
              </p>
            </div>
            <div className={styles.controlButtons}>
              <button
                onClick={selectAll}
                className={styles.secondaryButton}
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className={styles.secondaryButton}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Invite Method Selection */}
          <div className={styles.methodCard}>
            <label className={styles.controlsHint}>Invitation Method:</label>
            <div className={styles.methodOptions}>
              <label className={styles.methodOption}>
                <input
                  type="radio"
                  value="email"
                  checked={inviteMethod === 'email'}
                  onChange={(e) => setInviteMethod(e.target.value as any)}
                  className={styles.radio}
                />
                📧 Email Only
              </label>
              <label className={styles.methodOption}>
                <input
                  type="radio"
                  value="whatsapp"
                  checked={inviteMethod === 'whatsapp'}
                  onChange={(e) => setInviteMethod(e.target.value as any)}
                  className={styles.radio}
                />
                💬 WhatsApp Only
              </label>
              <label className={styles.methodOption}>
                <input
                  type="radio"
                  value="both"
                  checked={inviteMethod === 'both'}
                  onChange={(e) => setInviteMethod(e.target.value as any)}
                  className={styles.radio}
                />
                📧💬 Both
              </label>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={sendInvitations}
            disabled={sending || selectedCount === 0}
            className={styles.sendButton}
          >
            {sending
              ? 'Sending Invitations...'
              : `Send ${selectedCount} Invitation${selectedCount !== 1 ? 's' : ''}`}
          </button>

          {/* Message */}
          {message && (
            <div
              className={`${styles.message} ${
                message.startsWith('✅') ? styles.messageSuccess : styles.messageError
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Players List */}
        <div className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedCount === uninvitedPlayers.length && uninvitedPlayers.length > 0}
                    onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                  />
                </th>
                <th>Player</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {uninvitedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    <p>No players available to invite</p>
                    <p>
                      Add player contact details in the{' '}
                      <button
                        onClick={() => router.push('/admin/players')}
                        className={styles.backLink}
                      >
                        Players page
                      </button>
                    </p>
                  </td>
                </tr>
              ) : (
                uninvitedPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className={selectedPlayers.has(player.id) ? styles.rowSelected : ''}
                  >
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={() => togglePlayer(player.id)}
                      />
                    </td>
                    <td>
                      {player.first_name} {player.last_name}
                    </td>
                    <td>
                      {player.email || (
                        <span className={styles.messageError}>Missing</span>
                      )}
                    </td>
                    <td>
                      {player.phone || (
                        <span className={styles.controlsHint}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        Not Invited
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Invited Players */}
        {invitedPlayers.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.controlsTitle}>
              Already Invited/Joined ({invitedPlayers.length})
            </h3>
            <div className={styles.inviteList}>
              {invitedPlayers.map((player) => (
                <div
                  key={player.id}
                  className={styles.inviteItem}
                >
                  <span>
                    {player.first_name} {player.last_name}
                  </span>
                  <span
                    className={`${styles.statusBadge} ${
                      player.user_id ? styles.statusJoined : styles.statusPending
                    }`}
                  >
                    {player.user_id ? '✓ Joined' : '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
