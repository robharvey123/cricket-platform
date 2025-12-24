'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch matches')
      }

      setMatches(data.matches || [])
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
        <p>Loading matches...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
          Matches
        </h1>
        <Link
          href="/admin/matches/import-pdf"
          style={{
            padding: '10px 20px',
            background: '#7c3aed',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Import from PDF
        </Link>
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

      {matches.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '24px' }}>
            No matches yet
          </p>
          <Link
            href="/admin/matches/import-pdf"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#7c3aed',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Import your first match
          </Link>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Opponent
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Venue
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Type
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Result
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr
                  key={match.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer'
                  }}
                  onClick={() => router.push(`/admin/matches/${match.id}`)}
                >
                  <td style={{ padding: '16px', fontSize: '14px' }}>
                    {new Date(match.match_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {match.opponent_name}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                    {match.venue || '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '12px',
                      textTransform: 'capitalize'
                    }}>
                      {match.match_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: match.result === 'won' ? '#dcfce7' : match.result === 'lost' ? '#fee2e2' : '#f3f4f6',
                      color: match.result === 'won' ? '#16a34a' : match.result === 'lost' ? '#dc2626' : '#6b7280',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {match.result}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: match.published ? '#dbeafe' : '#fef3c7',
                      color: match.published ? '#1d4ed8' : '#92400e',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {match.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
