'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../../lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Season = {
  id: string
  name: string
  is_active: boolean
}

export default function EditTeamPage() {
  const params = useParams()
  const teamId = params.id as string

  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [playCricketTeamId, setPlayCricketTeamId] = useState('')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userRole } = await supabase
          .from('user_org_roles')
          .select('club_id')
          .eq('user_id', user?.id)
          .single()

        if (!userRole?.club_id) {
          setError('Could not determine your club')
          setLoading(false)
          return
        }

        // Fetch seasons
        const { data: seasonsData } = await supabase
          .from('seasons')
          .select('id, name, is_active')
          .eq('club_id', userRole.club_id)
          .order('start_date', { ascending: false })

        if (seasonsData) {
          setSeasons(seasonsData)
        }

        // Fetch team
        const { data: team, error: fetchError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()

        if (fetchError) {
          setError('Team not found')
          return
        }

        if (team) {
          setName(team.name)
          setSeasonId(team.season_id)
          setPlayCricketTeamId(team.play_cricket_team_id || '')
        }
      } catch (err) {
        setError('Failed to load team')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [teamId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!seasonId) {
        setError('Please select a season')
        return
      }

      // Update team
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          season_id: seasonId,
          name: name,
          play_cricket_team_id: playCricketTeamId || null,
        })
        .eq('id', teamId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push('/admin/teams')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this team? This will also delete all associated matches and statistics.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      router.push('/admin/teams')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Edit Team
        </h1>
        <p style={{ color: '#6b7280' }}>
          Update team details
        </p>
      </div>

      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="seasonId"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Season *
            </label>
            <select
              id="seasonId"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Select a season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Team Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 1st XI, 2nd XI"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="playCricketTeamId"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Play-Cricket Team ID (optional)
            </label>
            <input
              id="playCricketTeamId"
              type="text"
              value={playCricketTeamId}
              onChange={(e) => setPlayCricketTeamId(e.target.value)}
              placeholder="e.g., 123456"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
              Used for importing match data from Play-Cricket API
            </p>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: saving ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/admin/teams"
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Cancel
            </Link>
          </div>

          <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Deleting a team will also delete all associated matches and statistics.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Delete Team
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
