'use client'

import { useEffect, useState } from 'react'
import { useUserRole } from '../../../lib/hooks/useUserRole'
import styles from './page.module.css'

interface PlayerProfile {
  id: string
  name: string
  user_id: string | null
  bio: string | null
  preferred_position: string | null
  jersey_number: number | null
  photo_url: string | null
}

interface SeasonStats {
  matches_batted: number
  innings_batted: number
  not_outs: number
  runs_scored: number
  balls_faced: number
  fours: number
  sixes: number
  highest_score: number
  fifties: number
  hundreds: number
  ducks: number
  batting_average: number | null
  batting_strike_rate: number | null
  matches_bowled: number
  innings_bowled: number
  overs_bowled: number
  maidens: number
  runs_conceded: number
  wickets: number
  best_bowling_wickets: number
  best_bowling_runs: number
  three_fors: number
  five_fors: number
  bowling_average: number | null
  bowling_economy: number | null
  bowling_strike_rate: number | null
  catches: number
  stumpings: number
  run_outs: number
  total_points: number
  batting_points: number
  bowling_points: number
  fielding_points: number
}

interface MatchPerformance {
  id: string
  runs: number
  balls_faced: number
  wickets: number
  overs_bowled: number
  runs_conceded: number
  catches: number
  total_points: number
  batting_points: number
  bowling_points: number
  fielding_points: number
  matches: {
    id: string
    match_date: string
    opponent_name: string
    result: string
  }
}

export default function ProfilePage() {
  const { permissions } = useUserRole()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [careerTotals, setCareerTotals] = useState<SeasonStats | null>(null)
  const [recentPerformances, setRecentPerformances] = useState<MatchPerformance[]>([])
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    bio: '',
    preferred_position: '',
    jersey_number: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/players/me')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          // No player profile linked yet
          setProfile(null)
          setLoading(false)
          return
        }
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setProfile(data.player)
      setSeasonStats(data.seasonStats || null)
      setCareerTotals(data.careerTotals || null)
      setRecentPerformances(data.recentPerformances || [])
      setActiveSeason(data.activeSeason || null)
      setFormData({
        bio: data.player.bio || '',
        preferred_position: data.player.preferred_position || '',
        jersey_number: data.player.jersey_number?.toString() || ''
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/players/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: formData.bio || null,
          preferred_position: formData.preferred_position || null,
          jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfile(data.player)
      setEditing(false)
      setSuccess('Profile updated successfully!')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) {
      return
    }

    setPhotoUploading(true)
    setPhotoError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/players/me/photo', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setProfile(data.player)
      setSuccess('Profile photo updated!')
    } catch (err: any) {
      setPhotoError(err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0]?.slice(0, 2).toUpperCase() || ''
    }
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
  }

  const stats = seasonStats || careerTotals

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading profile...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <div>
              <span className={styles.kicker}>Your Profile</span>
              <h1 className={styles.title}>Player Profile</h1>
            </div>
          </header>

          <section className={styles.card}>
            <div className={styles.emptyState}>
              <h2>No Player Profile</h2>
              <p>Your account is not yet linked to a player profile. Please contact an administrator to link your account to a player.</p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.avatar}>
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.name}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarFallback}>
                  {getInitials(profile.name || 'Player')}
                </span>
              )}
            </div>
            <div>
              <span className={styles.kicker}>Your Profile</span>
              <h1 className={styles.title}>{profile.name}</h1>
              <p className={styles.subtitle}>
                Manage your player profile and preferences
              </p>
              <div className={styles.photoActions}>
                <label className={styles.photoUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handlePhotoUpload(event.target.files?.[0] || null)}
                    disabled={photoUploading}
                    className={styles.photoInput}
                  />
                  {photoUploading ? 'Uploading...' : 'Upload photo'}
                </label>
              </div>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className={styles.primaryButton}
            >
              Edit Profile
            </button>
          )}
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {photoError && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {photoError}
          </div>
        )}

        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            {success}
          </div>
        )}

        {editing ? (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Edit Profile</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="jersey_number">Jersey Number</label>
                <input
                  type="number"
                  id="jersey_number"
                  value={formData.jersey_number}
                  onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                  placeholder="e.g., 7"
                  min="1"
                  max="99"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="preferred_position">Preferred Position</label>
                <select
                  id="preferred_position"
                  value={formData.preferred_position}
                  onChange={(e) => setFormData({ ...formData, preferred_position: e.target.value })}
                  className={styles.select}
                >
                  <option value="">Select a position</option>
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicket-keeper">Wicket-keeper</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself, your cricket journey, achievements..."
                  rows={5}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      bio: profile.bio || '',
                      preferred_position: profile.preferred_position || '',
                      jersey_number: profile.jersey_number?.toString() || ''
                    })
                  }}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={styles.profileView}>
              <div className={styles.profileField}>
                <label>Jersey Number</label>
                <div className={styles.profileValue}>
                  {profile.jersey_number || <span className={styles.emptyValue}>Not set</span>}
                </div>
              </div>

              <div className={styles.profileField}>
                <label>Preferred Position</label>
                <div className={styles.profileValue}>
                  {profile.preferred_position || <span className={styles.emptyValue}>Not set</span>}
                </div>
              </div>

              <div className={styles.profileField}>
                <label>Bio</label>
                <div className={styles.profileValue}>
                  {profile.bio ? (
                    <p className={styles.bioText}>{profile.bio}</p>
                  ) : (
                    <span className={styles.emptyValue}>No bio yet</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {stats && (
          <>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>{activeSeason ? `${activeSeason.name} Statistics` : 'Career Statistics'}</h2>
                {seasonStats && (
                  <span className={styles.pill}>Current Season</span>
                )}
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Matches Played</span>
                  <span className={styles.statValue}>{Math.max(stats.matches_batted || 0, stats.matches_bowled || 0)}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Total Points</span>
                  <span className={styles.statValue}>{stats.total_points?.toFixed(1) || '0'}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Runs Scored</span>
                  <span className={styles.statValue}>{stats.runs_scored || 0}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Wickets Taken</span>
                  <span className={styles.statValue}>{stats.wickets || 0}</span>
                </div>
              </div>
            </section>

            {stats.innings_batted > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Batting</h2>
                  <span className={styles.muted}>{stats.innings_batted} innings</span>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Runs</span>
                    <span className={styles.statValue}>{stats.runs_scored}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Average</span>
                    <span className={styles.statValue}>{stats.batting_average?.toFixed(2) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Strike Rate</span>
                    <span className={styles.statValue}>{stats.batting_strike_rate?.toFixed(1) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>High Score</span>
                    <span className={styles.statValue}>{stats.highest_score}{stats.not_outs > 0 ? '*' : ''}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>50s / 100s</span>
                    <span className={styles.statValue}>{stats.fifties} / {stats.hundreds}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>4s / 6s</span>
                    <span className={styles.statValue}>{stats.fours} / {stats.sixes}</span>
                  </div>
                </div>
              </section>
            )}

            {stats.innings_bowled > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Bowling</h2>
                  <span className={styles.muted}>{stats.overs_bowled} overs</span>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Wickets</span>
                    <span className={styles.statValue}>{stats.wickets}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Average</span>
                    <span className={styles.statValue}>{stats.bowling_average?.toFixed(2) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Economy</span>
                    <span className={styles.statValue}>{stats.bowling_economy?.toFixed(2) || '-'}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Best Figures</span>
                    <span className={styles.statValue}>
                      {stats.best_bowling_wickets}/{stats.best_bowling_runs || '-'}
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>5W / 3W</span>
                    <span className={styles.statValue}>{stats.five_fors} / {stats.three_fors}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Maidens</span>
                    <span className={styles.statValue}>{stats.maidens}</span>
                  </div>
                </div>
              </section>
            )}

            {(stats.catches > 0 || stats.stumpings > 0 || stats.run_outs > 0) && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Fielding</h2>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Catches</span>
                    <span className={styles.statValue}>{stats.catches}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Stumpings</span>
                    <span className={styles.statValue}>{stats.stumpings}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Run Outs</span>
                    <span className={styles.statValue}>{stats.run_outs}</span>
                  </div>
                </div>
              </section>
            )}

            {recentPerformances.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Recent Performances</h2>
                  <span className={styles.muted}>Last {recentPerformances.length} matches</span>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Opponent</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>Wkts</th>
                        <th>Overs</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPerformances.map((perf) => (
                        <tr key={perf.id}>
                          <td>{new Date(perf.matches.match_date).toLocaleDateString()}</td>
                          <td>vs {perf.matches.opponent_name}</td>
                          <td>{perf.runs || '-'}</td>
                          <td>{perf.balls_faced || '-'}</td>
                          <td>{perf.wickets || '-'}</td>
                          <td>{perf.overs_bowled || '-'}</td>
                          <td><strong>{perf.total_points.toFixed(1)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
