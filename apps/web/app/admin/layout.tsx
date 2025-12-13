import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: '#1f2937',
        color: 'white',
        padding: '24px 0'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>
            Cricket Platform
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Admin Dashboard
          </p>
        </div>

        <nav>
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/players">Players</NavLink>
          <NavLink href="/admin/seasons">Seasons</NavLink>
          <NavLink href="/admin/teams">Teams</NavLink>
          <NavLink href="/admin/matches">Matches</NavLink>
          <NavLink href="/admin/leaderboard">Leaderboard</NavLink>
          <NavLink href="/admin/scoring">Scoring Config</NavLink>

          <div style={{
            borderTop: '1px solid #374151',
            margin: '16px 0'
          }} />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'transparent',
                color: '#9ca3af',
                border: 'none',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </form>
        </nav>

        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          right: '24px'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>
            {user.email}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        background: '#f9fafb',
        padding: '32px'
      }}>
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '12px 24px',
        color: '#d1d5db',
        fontSize: '14px',
        textDecoration: 'none',
        transition: 'background 0.2s'
      }}
    >
      {children}
    </Link>
  )
}
