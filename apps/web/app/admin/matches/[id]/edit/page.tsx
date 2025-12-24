'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface BattingCard {
  id: string
  player_id: string
  position: number | null
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  dismissal_type: string | null
  dismissal_text: string | null
  is_out: boolean
  players: Player
}

interface BowlingCard {
  id: string
  player_id: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  players: Player
}

interface Innings {
  id: string
  innings_number: number
  batting_team: string
  total_runs: number | null
  wickets: number | null
  overs: number | null
  extras: number | null
  batting_cards: BattingCard[]
  bowling_cards: BowlingCard[]
}

interface Match {
  id: string
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
  innings: Innings[]
}

export default function EditMatchPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch match')
      }

      setMatch(data.match)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!match) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save match')
      }

      router.push(`/admin/matches/${matchId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateMatchField = (field: string, value: any) => {
    setMatch(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updateInningsField = (inningsIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], [field]: value }
      return { ...prev, innings: newInnings }
    })
  }

  const updateBattingCard = (inningsIdx: number, cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      const newCards = [...newInnings[inningsIdx].batting_cards]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value }
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], batting_cards: newCards }
      return { ...prev, innings: newInnings }
    })
  }

  const updateBowlingCard = (inningsIdx: number, cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      const newCards = [...newInnings[inningsIdx].bowling_cards]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value }
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], bowling_cards: newCards }
      return { ...prev, innings: newInnings }
    })
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading match...</p>
      </div>
    )
  }

  if (error && !match) {
    return (
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <Link
          href="/admin/matches"
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '24px',
            display: 'inline-block'
          }}
        >
          ← Back to Matches
        </Link>
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          padding: '16px',
          borderRadius: '6px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (!match) return null

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => router.push(`/admin/matches/${matchId}`)}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              background: saving ? '#9ca3af' : '#7c3aed',
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
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>
        Edit Match
      </h1>

      {/* Match Details */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Match Details
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
              Opponent
            </label>
            <input
              type="text"
              value={match.opponent_name}
              onChange={(e) => updateMatchField('opponent_name', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
              Date
            </label>
            <input
              type="date"
              value={match.match_date}
              onChange={(e) => updateMatchField('match_date', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
              Venue
            </label>
            <input
              type="text"
              value={match.venue || ''}
              onChange={(e) => updateMatchField('venue', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
              Match Type
            </label>
            <select
              value={match.match_type}
              onChange={(e) => updateMatchField('match_type', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="league">League</option>
              <option value="cup">Cup</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
              Result
            </label>
            <select
              value={match.result}
              onChange={(e) => updateMatchField('result', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="tied">Tied</option>
              <option value="draw">Draw</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Innings */}
      {match.innings
        .sort((a, b) => a.innings_number - b.innings_number)
        .map((innings, inningsIdx) => (
          <div
            key={innings.id}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '24px'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#7c3aed' }}>
              Innings {innings.innings_number} - {innings.batting_team === 'home' ? 'Brookweald CC' : match.opponent_name}
            </h2>

            {/* Innings Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Batting Team
                </label>
                <select
                  value={innings.batting_team}
                  onChange={(e) => updateInningsField(inningsIdx, 'batting_team', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="home">Brookweald CC</option>
                  <option value="away">Opposition</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Total Runs
                </label>
                <input
                  type="number"
                  value={innings.total_runs || 0}
                  onChange={(e) => updateInningsField(inningsIdx, 'total_runs', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Wickets
                </label>
                <input
                  type="number"
                  value={innings.wickets || 0}
                  onChange={(e) => updateInningsField(inningsIdx, 'wickets', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Overs
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={innings.overs || 0}
                  onChange={(e) => updateInningsField(inningsIdx, 'overs', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Extras
                </label>
                <input
                  type="number"
                  value={innings.extras || 0}
                  onChange={(e) => updateInningsField(inningsIdx, 'extras', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Batting Card */}
            {innings.batting_cards.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Batting
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Runs</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Balls</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>4s</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>6s</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Out</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Dismissal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {innings.batting_cards.map((card, cardIdx) => (
                        <tr key={card.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px' }}>
                            {card.players.first_name} {card.players.last_name}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.runs}
                              onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'runs', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.balls_faced}
                              onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'balls_faced', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.fours}
                              onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'fours', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.sixes}
                              onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'sixes', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="checkbox"
                              checked={card.is_out}
                              onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'is_out', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={card.dismissal_text || ''}
                              onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'dismissal_text', e.target.value)}
                              placeholder="e.g., c Smith b Jones"
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px'
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bowling Card */}
            {innings.bowling_cards.length > 0 && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Bowling
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Overs</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Maidens</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Runs</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Wickets</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Wides</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>No Balls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {innings.bowling_cards.map((card, cardIdx) => (
                        <tr key={card.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px' }}>
                            {card.players.first_name} {card.players.last_name}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              step="0.1"
                              value={card.overs}
                              onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'overs', parseFloat(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.maidens}
                              onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'maidens', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.runs_conceded}
                              onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'runs_conceded', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.wickets}
                              onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'wickets', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.wides}
                              onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'wides', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={card.no_balls}
                              onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'no_balls', parseInt(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

      {/* Save Button at Bottom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          onClick={() => router.push(`/admin/matches/${matchId}`)}
          style={{
            padding: '10px 20px',
            background: '#f3f4f6',
            color: '#1f2937',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 20px',
            background: saving ? '#9ca3af' : '#7c3aed',
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
      </div>
    </div>
  )
}
