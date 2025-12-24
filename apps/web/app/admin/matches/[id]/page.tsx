'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Match {
  id: string
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
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

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
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
      </div>

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
          Scorecard and statistics will be displayed here.
        </p>
      </div>
    </div>
  )
}
