'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Season = {
  id: string
  name: string
}

type Team = {
  id: string
  name: string
  season_id: string
}

export function LeaderboardFilters({
  seasons,
  teams,
}: {
  seasons: Season[]
  teams: Team[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedSeason = searchParams.get('season') || ''
  const selectedTeam = searchParams.get('team') || ''

  const handleSeasonChange = (seasonId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (seasonId) {
      params.set('season', seasonId)
    } else {
      params.delete('season')
    }
    params.delete('team') // Reset team when season changes
    router.push(`/admin/leaderboard?${params.toString()}`)
  }

  const handleTeamChange = (teamId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (teamId) {
      params.set('team', teamId)
    } else {
      params.delete('team')
    }
    router.push(`/admin/leaderboard?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/admin/leaderboard')
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="season"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Filter by Season
          </label>
          <select
            id="season"
            value={selectedSeason}
            onChange={(e) => handleSeasonChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="">All Seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </div>

        {selectedSeason && (
          <div style={{ flex: 1 }}>
            <label
              htmlFor="team"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Filter by Team
            </label>
            <select
              id="team"
              value={selectedTeam}
              onChange={(e) => handleTeamChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">All Teams</option>
              {teams
                .filter(t => t.season_id === selectedSeason)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          {(selectedSeason || selectedTeam) && (
            <button
              onClick={clearFilters}
              style={{
                padding: '10px 16px',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
