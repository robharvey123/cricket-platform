import { createClient } from '../../lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get current user's club
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userRole } = await supabase
    .from('user_org_roles')
    .select('club_id, role, clubs(name)')
    .eq('user_id', user?.id)
    .single()

  const clubName = userRole?.clubs?.name || 'Unknown Club'
  const role = userRole?.role || 'member'

  // Get some stats
  const { count: playersCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', userRole?.club_id)

  const { count: matchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', userRole?.club_id)

  const { count: seasonsCount } = await supabase
    .from('seasons')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', userRole?.club_id)

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Welcome to {clubName}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Players"
          value={playersCount || 0}
          description="Total registered players"
        />
        <StatCard
          title="Matches"
          value={matchesCount || 0}
          description="Matches recorded"
        />
        <StatCard
          title="Seasons"
          value={seasonsCount || 0}
          description="Active and past seasons"
        />
        <StatCard
          title="Role"
          value={role === 'org_admin' ? 'Admin' : 'Member'}
          description="Your access level"
        />
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
          Quick Start Guide
        </h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Navigate to <strong>Players</strong> to manage your team roster</li>
          <li>Check <strong>Seasons</strong> to verify the current season is active</li>
          <li>Go to <strong>Teams</strong> to manage team squads</li>
          <li>Use <strong>Matches</strong> to import games from Play-Cricket</li>
          <li>View the <strong>Leaderboard</strong> to see player standings</li>
          <li>Configure <strong>Scoring Config</strong> to adjust point rules</li>
        </ol>
      </div>
    </div>
  )
}

function StatCard({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
        {title}
      </p>
      <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
        {value}
      </p>
      <p style={{ fontSize: '12px', color: '#9ca3af' }}>
        {description}
      </p>
    </div>
  )
}
