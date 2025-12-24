export default function AdminDashboard() {
  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Welcome to your cricket club management dashboard
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Recent Matches
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            View and manage your match history
          </p>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Players
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Manage your club players
          </p>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Teams
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Organize your teams
          </p>
        </div>
      </div>
    </div>
  )
}
