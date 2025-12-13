import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'

export default async function PlayersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's club
  const { data: userRole } = await supabase
    .from('user_org_roles')
    .select('club_id')
    .eq('user_id', user?.id)
    .single()

  // Get all players for this club
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('club_id', userRole?.club_id)
    .order('last_name', { ascending: true })

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
            Players
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage your team roster
          </p>
        </div>
        <Link
          href="/admin/players/new"
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
          Add Player
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
                Email
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {players && players.length > 0 ? (
              players.map((player) => (
                <tr key={player.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 24px' }}>
                    {player.first_name} {player.last_name}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                    {player.email || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <Link
                      href={`/admin/players/${player.id}/edit`}
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
                <td colSpan={3} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  No players found. Add your first player to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
