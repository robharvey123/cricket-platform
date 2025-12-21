import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'

import { CreateSampleButton } from './CreateSampleButton'
export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's club
  const { data: userRole } = await supabase
    .from('user_org_roles')
    .select('club_id')
    .eq('user_id', user?.id)
    .single()

  // Get all matches for this club with team and season info
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      teams (
        name,
        seasons (
          name
        )
      )
    `)
    .eq('club_id', userRole?.club_id)
    .order('match_date', { ascending: false })

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            Matches
          </h1>
          <p style={{ color: '#6b7280' }}>
            Import and manage match data
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <CreateSampleButton />
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
            📄 Import from PDF
          </Link>
          <Link
            href="/admin/matches/import"
            style={{
              padding: '10px 20px',
              background: '#059669',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Import from Play-Cricket
          </Link>
          <Link
            href="/admin/matches/new"
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add Match Manually
          </Link>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Date
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Opponent
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Team / Season
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Result
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Status
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {matches && matches.length > 0 ? (
              matches.map((match) => (
                <tr key={match.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                    {new Date(match.match_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                    {match.opponent}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                    <div>{match.teams?.name || 'N/A'}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {match.teams?.seasons?.name || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                    {match.result || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: match.published ? '#d1fae5' : '#fef3c7',
                        color: match.published ? '#065f46' : '#92400e',
                        width: 'fit-content'
                      }}>
                        {match.published ? 'Published' : 'Draft'}
                      </span>
                      {match.source && (
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          {match.source === 'play-cricket' ? '📡 API' : match.source === 'csv' ? '📄 CSV' : '✏️ Manual'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <Link
                      href={`/admin/matches/${match.id}`}
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontSize: '14px',
                        marginRight: '12px'
                      }}
                    >
                      View
                    </Link>
                    {!match.published && (
                      <Link
                        href={`/admin/matches/${match.id}/edit`}
                        style={{
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontSize: '14px'
                        }}
                      >
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ marginBottom: '16px' }}>
                    No matches found. Import your first match to get started.
                  </div>
                  <Link
                    href="/admin/matches/import"
                    style={{
                      color: '#059669',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Import from Play-Cricket →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
