import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'

export default async function SeasonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's club
  const { data: userRole } = await supabase
    .from('user_org_roles')
    .select('club_id')
    .eq('user_id', user?.id)
    .single()

  // Get all seasons for this club
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .eq('club_id', userRole?.club_id)
    .order('start_date', { ascending: false })

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
            Seasons
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage cricket seasons and competitions
          </p>
        </div>
        <Link
          href="/admin/seasons/new"
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
          Add Season
        </Link>
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
                Name
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Period
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
            {seasons && seasons.length > 0 ? (
              seasons.map((season) => (
                <tr key={season.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                    {season.name}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                    {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: season.is_active ? '#d1fae5' : '#f3f4f6',
                      color: season.is_active ? '#065f46' : '#6b7280'
                    }}>
                      {season.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <Link
                      href={`/admin/seasons/${season.id}/edit`}
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontSize: '14px'
                      }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  No seasons found. Add your first season to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
