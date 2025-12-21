import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's club
  const { data: userRole } = await supabase
    .from('user_org_roles')
    .select('club_id')
    .eq('user_id', user?.id)
    .single()

  // Get all teams for this club with season info
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      seasons (
        name,
        is_active
      )
    `)
    .eq('club_id', userRole?.club_id)
    .order('created_at', { ascending: false })

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
            Teams
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage teams across your seasons
          </p>
        </div>
        <Link
          href="/admin/teams/new"
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
          Add Team
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
                Team Name
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Season
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Play-Cricket ID
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {teams && teams.length > 0 ? (
              teams.map((team) => (
                <tr key={team.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                    {team.name}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#6b7280' }}>
                        {team.seasons?.name || 'N/A'}
                      </span>
                      {team.seasons?.is_active && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '500',
                          background: '#d1fae5',
                          color: '#065f46'
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#6b7280', fontSize: '14px' }}>
                    {team.play_cricket_team_id || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <Link
                      href={`/admin/teams/${team.id}/edit`}
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
                  No teams found. Add your first team to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
