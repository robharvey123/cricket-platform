'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Matches', href: '/admin/matches' },
    { name: 'Players', href: '/admin/players' },
    { name: 'Leaderboards', href: '/admin/leaderboards' },
    { name: 'Teams', href: '/admin/teams' },
    { name: 'Seasons', href: '/admin/seasons' },
    { name: 'Scoring', href: '/admin/scoring' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Top Navigation Bar */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '64px'
        }}>
          {/* Logo/Brand */}
          <Link
            href="/admin"
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1f2937',
              textDecoration: 'none'
            }}
          >
            Cricket Platform
          </Link>

          {/* Navigation Links */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: isActive ? '#f3f4f6' : 'transparent',
                    color: isActive ? '#7c3aed' : '#6b7280',
                    transition: 'all 0.2s'
                  }}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                // Sign out logic
                window.location.href = '/auth/signin'
              }}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
