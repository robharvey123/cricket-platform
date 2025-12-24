'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Player {
  first_name: string
  last_name: string
}

interface BattingCard {
  id: string
  position: number | null
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  dismissal_type: string | null
  dismissal_text: string | null
  is_out: boolean
  strike_rate: number | null
  derived: boolean
  players: Player
}

interface BowlingCard {
  id: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  economy: number | null
  derived: boolean
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

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
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

  if (error || !match) {
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
            {error || 'Match not found'}
          </p>
        </div>
      </div>
    )
  }

  const hasInnings = match.innings && match.innings.length > 0

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/admin/matches"
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          ← Back to Matches
        </Link>
        <Link
          href={`/admin/matches/${matchId}/edit`}
          style={{
            padding: '8px 16px',
            background: '#7c3aed',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Edit Match
        </Link>
      </div>

      {/* Match Header */}
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            vs {match.opponent_name}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {new Date(match.match_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
              Venue
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500' }}>
              {match.venue || 'TBD'}
            </p>
          </div>

          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
              Match Type
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', textTransform: 'capitalize' }}>
              {match.match_type}
            </p>
          </div>

          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
              Result
            </p>
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              color: match.result === 'won' ? '#16a34a' : match.result === 'lost' ? '#dc2626' : '#6b7280',
              textTransform: 'capitalize'
            }}>
              {match.result}
            </p>
          </div>
        </div>
      </div>

      {/* Innings Scorecards */}
      {hasInnings ? (
        match.innings
          .sort((a, b) => a.innings_number - b.innings_number)
          .map((innings) => (
            <div
              key={innings.id}
              style={{
                background: 'white',
                padding: '32px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
              }}
            >
              {/* Innings Header */}
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#7c3aed' }}>
                  Innings {innings.innings_number} - {innings.batting_team === 'home' ? 'Brookweald CC' : match.opponent_name}
                </h2>
                {innings.total_runs !== null && (
                  <div style={{
                    background: '#f9fafb',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {innings.total_runs}/{innings.wickets}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>
                      ({innings.overs} overs)
                    </span>
                    {innings.extras !== null && innings.extras > 0 && (
                      <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>
                        Extras: {innings.extras}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Batting Card */}
              {innings.batting_cards.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Batting
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Batter</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>R</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>B</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>4s</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>6s</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>SR</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Dismissal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings.batting_cards
                          .filter(card => !card.derived || card.runs > 0)
                          .map((card, idx) => (
                            <tr key={card.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '12px' }}>
                                {card.players.first_name} {card.players.last_name}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontWeight: '500' }}>
                                {card.runs}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.balls_faced || '-'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.fours}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.sixes}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.strike_rate ? card.strike_rate.toFixed(1) : '-'}
                              </td>
                              <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                                {card.is_out ? card.dismissal_text : 'not out'}
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
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Bowler</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>O</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>M</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>R</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>W</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings.bowling_cards
                          .filter(card => !card.derived || card.wickets > 0)
                          .map((card) => (
                            <tr key={card.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '12px' }}>
                                {card.players.first_name} {card.players.last_name}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.overs}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.maidens}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.runs_conceded}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontWeight: '500' }}>
                                {card.wickets}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {card.economy ? card.economy.toFixed(2) : '-'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
      ) : (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Match Details
          </h2>
          <p style={{ color: '#6b7280' }}>
            No scorecard data available for this match yet.
          </p>
        </div>
      )}
    </div>
  )
}
