export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        color: 'white',
        maxWidth: '600px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '16px'
        }}>
          Cricket Platform
        </h1>
        <p style={{
          fontSize: '20px',
          marginBottom: '32px',
          opacity: 0.9
        }}>
          Manage your cricket club with ease. Track players, matches, and performance.
        </p>
        <a
          href="/auth/signin"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'white',
            color: '#667eea',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          Sign In
        </a>
      </div>
    </div>
  )
}
