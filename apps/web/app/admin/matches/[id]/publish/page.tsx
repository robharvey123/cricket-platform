'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../../lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Player = {
  id: string
  first_name: string
  last_name: string
}

type UnmappedPlayer = {
  name: string
  source: 'batting' | 'bowling'
  count: number
}

type PlayerMapping = {
  externalName: string
  playerId: string | null
}

export default function PublishMatchPage() {
  const params = useParams()
  const matchId = params.id as string

  const [match, setMatch] = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [unmappedPlayers, setUnmappedPlayers] = useState<UnmappedPlayer[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [squadPlayers, setSquadPlayers] = useState<Player[]>([])
  const [selectedSquad, setSelectedSquad] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch match
        const { data: matchData } = await supabase
          .from('matches')
          .select(`
            *,
            teams (
              id,
              name,
              season_id
            )
          `)
          .eq('id', matchId)
          .single()

        if (!matchData) {
          setError('Match not found')
          return
        }

        if (matchData.published) {
          setError('This match has already been published')
          return
        }

        setMatch(matchData)

        // Fetch club players
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userRole } = await supabase
          .from('user_org_roles')
          .select('club_id')
          .eq('user_id', user?.id)
          .single()

        if (userRole?.club_id) {
          const { data: playersData } = await supabase
            .from('players')
            .select('id, first_name, last_name')
            .eq('club_id', userRole.club_id)
            .order('last_name')

          if (playersData) {
            setPlayers(playersData)
            setSquadPlayers(playersData)
          }
        }

        // Fetch innings with cards to find unmapped players
        const { data: innings } = await supabase
          .from('innings')
          .select(`
            batting_cards (player_name, player_id),
            bowling_cards (player_name, player_id)
          `)
          .eq('match_id', matchId)

        if (innings) {
          const unmapped: Map<string, UnmappedPlayer> = new Map()

          innings.forEach((inn: any) => {
            // Check batting cards
            inn.batting_cards?.forEach((card: any) => {
              if (!card.player_id) {
                const existing = unmapped.get(card.player_name)
                if (existing) {
                  existing.count++
                } else {
                  unmapped.set(card.player_name, {
                    name: card.player_name,
                    source: 'batting',
                    count: 1,
                  })
                }
              }
            })

            // Check bowling cards
            inn.bowling_cards?.forEach((card: any) => {
              if (!card.player_id) {
                const existing = unmapped.get(card.player_name)
                if (existing) {
                  existing.count++
                } else {
                  unmapped.set(card.player_name, {
                    name: card.player_name,
                    source: 'bowling',
                    count: 1,
                  })
                }
              }
            })
          })

          setUnmappedPlayers(Array.from(unmapped.values()))
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load match data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [matchId])

  const handlePublish = async () => {
    // Validate all players are mapped
    const unmappedCount = unmappedPlayers.filter(p => !mappings[p.name]).length
    if (unmappedCount > 0) {
      setError(`Please map all ${unmappedCount} unmapped player(s) before publishing`)
      return
    }

    setPublishing(true)
    setError(null)

    try {
      // Call publish API route
      const response = await fetch(`/api/matches/${matchId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerMappings: mappings,
          squadPlayerIds: Array.from(selectedSquad),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish match')
      }

      // Redirect to match page
      router.push(`/admin/matches/${matchId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    )
  }

  if (error && !match) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '16px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b'
        }}>
          {error}
        </div>
        <Link
          href="/admin/matches"
          style={{
            marginTop: '16px',
            display: 'inline-block',
            color: '#2563eb',
            textDecoration: 'underline'
          }}
        >
          ← Back to Matches
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '8px' }}>
          <Link
            href={`/admin/matches/${matchId}`}
            style={{
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            ← Back to Match
          </Link>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Publish Match
        </h1>
        <p style={{ color: '#6b7280' }}>
          {match?.teams?.name} vs {match?.opponent} • {new Date(match?.match_date).toLocaleDateString()}
        </p>
      </div>

      {/* Step 1: Player Reconciliation */}
      {unmappedPlayers.length > 0 ? (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            Step 1: Map Players
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
            Match Play-Cricket player names to your club players. This enables accurate point calculation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {unmappedPlayers.map((unmapped) => (
              <div key={unmapped.name} style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: mappings[unmapped.name] ? '#f0fdf4' : '#fef3c7'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {unmapped.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Found in {unmapped.count} card(s)
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <select
                      value={mappings[unmapped.name] || ''}
                      onChange={(e) => setMappings({
                        ...mappings,
                        [unmapped.name]: e.target.value
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">Select player...</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.first_name} {player.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px',
          color: '#166534'
        }}>
          ✓ All players are already mapped
        </div>
      )}

      {/* Step 2: Squad Selection (Zero-rows rule) */}
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Step 2: Select Squad (Optional)
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
          Select squad players who were available but didn't play. They'll receive 0 points (zero-rows rule).
        </p>
        <p style={{
          fontSize: '12px',
          color: '#059669',
          background: '#f0fdf4',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          💡 Tip: You can skip this for now and publish without selecting squad players.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {squadPlayers.map((player) => (
            <label
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                background: selectedSquad.has(player.id) ? '#eff6ff' : 'white'
              }}
            >
              <input
                type="checkbox"
                checked={selectedSquad.has(player.id)}
                onChange={(e) => {
                  const newSelected = new Set(selectedSquad)
                  if (e.target.checked) {
                    newSelected.add(player.id)
                  } else {
                    newSelected.delete(player.id)
                  }
                  setSelectedSquad(newSelected)
                }}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>
                {player.first_name} {player.last_name}
              </span>
            </label>
          ))}
        </div>
      </div>

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
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            padding: '12px 24px',
            background: publishing ? '#9ca3af' : '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: publishing ? 'not-allowed' : 'pointer'
          }}
        >
          {publishing ? 'Publishing...' : 'Publish Match & Calculate Points'}
        </button>
        <Link
          href={`/admin/matches/${matchId}`}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
