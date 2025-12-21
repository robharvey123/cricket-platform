'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { PlayCricketClient } from '../../../../lib/play-cricket/client'
import type { MatchDetail } from '../../../../lib/play-cricket/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Season = {
  id: string
  name: string
  is_active: boolean
}

type Team = {
  id: string
  name: string
  season_id: string
  play_cricket_team_id: string | null
}

export default function ImportMatchPage() {
  const [matchInput, setMatchInput] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchPreview, setMatchPreview] = useState<MatchDetail | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch seasons and teams on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userRole } = await supabase
          .from('user_org_roles')
          .select('club_id')
          .eq('user_id', user?.id)
          .single()

        if (userRole?.club_id) {
          // Fetch seasons
          const { data: seasonsData } = await supabase
            .from('seasons')
            .select('id, name, is_active')
            .eq('club_id', userRole.club_id)
            .order('start_date', { ascending: false })

          if (seasonsData) {
            setSeasons(seasonsData)
            const activeSeason = seasonsData.find(s => s.is_active)
            if (activeSeason) {
              setSeasonId(activeSeason.id)
            }
          }

          // Fetch teams
          const { data: teamsData } = await supabase
            .from('teams')
            .select('id, name, season_id, play_cricket_team_id')
            .eq('club_id', userRole.club_id)
            .order('name')

          if (teamsData) {
            setTeams(teamsData)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      }
    }

    fetchData()
  }, [])

  // Filter teams when season changes
  useEffect(() => {
    if (seasonId) {
      const filtered = teams.filter(t => t.season_id === seasonId)
      setFilteredTeams(filtered)
      if (filtered.length > 0 && !teamId) {
        setTeamId(filtered[0].id)
      }
    }
  }, [seasonId, teams])

  const handleFetchMatch = async () => {
    if (!matchInput.trim()) {
      setError('Please enter a match URL or ID')
      return
    }

    setFetching(true)
    setError(null)
    setMatchPreview(null)

    try {
      // Parse match ID from input
      const matchId = PlayCricketClient.parseMatchUrl(matchInput)
      if (!matchId) {
        setError('Could not parse match ID from input. Please enter a valid Play-Cricket match URL or ID.')
        return
      }

      // Get Play-Cricket credentials from club settings
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userRole } = await supabase
        .from('user_org_roles')
        .select('club_id, clubs(play_cricket_site_id, play_cricket_api_token)')
        .eq('user_id', user?.id)
        .single()

      const siteId = userRole?.clubs?.play_cricket_site_id
      const apiToken = userRole?.clubs?.play_cricket_api_token

      if (!siteId || !apiToken) {
        setError('Play-Cricket API credentials not configured. Please add them in club settings.')
        return
      }

      // Fetch match from Play-Cricket API
      const client = new PlayCricketClient({ siteId, apiToken })
      const match = await client.getMatchDetail(matchId)

      setMatchPreview(match)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch match from Play-Cricket')
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleImport = async () => {
    if (!matchPreview || !seasonId || !teamId) {
      setError('Please select a season and team')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call API route to import match
      const response = await fetch('/api/matches/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchDetail: matchPreview,
          seasonId,
          teamId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import match')
      }

      const { matchId } = await response.json()

      // Redirect to match detail page
      router.push(`/admin/matches/${matchId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Import Match from Play-Cricket
        </h1>
        <p style={{ color: '#6b7280' }}>
          Enter a Play-Cricket match URL or ID to import match data
        </p>
      </div>

      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '800px'
      }}>
        {/* Step 1: Enter Match URL/ID */}
        <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Step 1: Fetch Match Data
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="matchInput"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Match URL or ID
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                id="matchInput"
                type="text"
                value={matchInput}
                onChange={(e) => setMatchInput(e.target.value)}
                placeholder="https://www.play-cricket.com/matches/123456 or 123456"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetchMatch()
                }}
              />
              <button
                onClick={handleFetchMatch}
                disabled={fetching || !matchInput.trim()}
                style={{
                  padding: '10px 20px',
                  background: fetching || !matchInput.trim() ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: fetching || !matchInput.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {fetching ? 'Fetching...' : 'Fetch Match'}
              </button>
            </div>
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              Paste a Play-Cricket match URL or just the match ID
            </p>
          </div>

          {matchPreview && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '6px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
                Match Found ✓
              </h3>
              <div style={{ fontSize: '14px', color: '#15803d' }}>
                <div><strong>{matchPreview.home_team.team_name}</strong> vs <strong>{matchPreview.away_team.team_name}</strong></div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  {new Date(matchPreview.match_date).toLocaleDateString()} • {matchPreview.competition_name}
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  {matchPreview.innings.length} innings • {matchPreview.result || 'Result TBC'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Team/Season */}
        {matchPreview && (
          <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Step 2: Select Team and Season
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="seasonId" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
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

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="teamId" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Team *
              </label>
              <select
                id="teamId"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
                disabled={!seasonId || filteredTeams.length === 0}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">Select a team</option>
                {filteredTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {seasonId && filteredTeams.length === 0 && (
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                  No teams found for this season. Please create a team first.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {matchPreview && (
            <button
              onClick={handleImport}
              disabled={loading || !seasonId || !teamId}
              style={{
                padding: '10px 20px',
                background: loading || !seasonId || !teamId ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || !seasonId || !teamId ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Importing...' : 'Import Match'}
            </button>
          )}
          <Link
            href="/admin/matches"
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
      </div>
    </div>
  )
}
