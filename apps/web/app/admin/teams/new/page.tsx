'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Season = {
  id: string
  name: string
  is_active: boolean
}

export default function NewTeamPage() {
  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [playCricketTeamId, setPlayCricketTeamId] = useState('')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userRole } = await supabase
          .from('user_org_roles')
          .select('club_id')
          .eq('user_id', user?.id)
          .single()

        if (userRole?.club_id) {
          const { data: seasonsData } = await supabase
            .from('seasons')
            .select('id, name, is_active')
            .eq('club_id', userRole.club_id)
            .order('start_date', { ascending: false })

          if (seasonsData) {
            setSeasons(seasonsData)
            // Auto-select the first active season if available
            const activeSeason = seasonsData.find(s => s.is_active)
            if (activeSeason) {
              setSeasonId(activeSeason.id)
            } else if (seasonsData.length > 0) {
              setSeasonId(seasonsData[0].id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load seasons:', err)
      }
    }

    fetchSeasons()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get current user and their club
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userRole } = await supabase
        .from('user_org_roles')
        .select('club_id')
        .eq('user_id', user?.id)
        .single()

      if (!userRole?.club_id) {
        setError('Could not determine your club. Please contact support.')
        return
      }

      if (!seasonId) {
        setError('Please select a season')
        return
      }

      // Create team
      const { error: insertError } = await supabase
        .from('teams')
        .insert({
          club_id: userRole.club_id,
          season_id: seasonId,
          name: name,
          play_cricket_team_id: playCricketTeamId || null,
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push('/admin/teams')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Add New Team
        </h1>
        <p style={{ color: '#6b7280' }}>
          Create a new team for a season
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
            {seasons.length === 0 && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                No seasons available. Please create a season first.
              </p>
            )}
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

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading || seasons.length === 0}
              style={{
                padding: '10px 20px',
                background: loading || seasons.length === 0 ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || seasons.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Team'}
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
        </form>
      </div>
    </div>
  )
}
