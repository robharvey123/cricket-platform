'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserRole } from '../../lib/hooks/useUserRole'
import { getRoleDisplayName, getRoleBadgeColor } from '../../lib/permissions'
import styles from './layout.module.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { role, permissions } = useUserRole()

  // All navigation items with their required permissions
  const allNavigation = [
    { name: 'Dashboard', href: '/admin', requiredPermission: null },
    { name: 'Matches', href: '/admin/matches', requiredPermission: null },
    { name: 'Players', href: '/admin/players', requiredPermission: null },
    { name: 'Teams', href: '/admin/teams', requiredPermission: (p: any) => p.canEditTeam },
    { name: 'Leaderboards', href: '/admin/leaderboards', requiredPermission: null },
    { name: 'Settings', href: '/admin/settings', requiredPermission: null },
  ]

  // Filter navigation based on permissions
  const navigation = allNavigation.filter(item => {
    if (!item.requiredPermission) return true
    return permissions ? item.requiredPermission(permissions) : false
  })

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/admin" className={styles.brand}>
            Cricket Platform
          </Link>

          <div className={styles.navLinks}>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          <div className={styles.actions}>
            {role && (
              <div
                className={styles.roleBadge}
                style={{ background: getRoleBadgeColor(role) }}
              >
                {getRoleDisplayName(role)}
              </div>
            )}
            <button
              onClick={() => {
                window.location.href = '/auth/signin'
              }}
              className={styles.signOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
