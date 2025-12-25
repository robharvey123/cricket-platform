import { ReactNode } from 'react'
import { useUserRole } from '../lib/hooks/useUserRole'
import { UserRole } from '../lib/permissions'

interface PermissionGuardProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  fallback?: ReactNode
  requirePermission?: (permissions: any) => boolean
}

/**
 * Component to conditionally render content based on user role/permissions
 *
 * Usage:
 * <PermissionGuard allowedRoles={['admin', 'captain']}>
 *   <button>Edit Match</button>
 * </PermissionGuard>
 *
 * Or with permission check:
 * <PermissionGuard requirePermission={(p) => p.canDeleteMatch}>
 *   <button>Delete Match</button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  allowedRoles,
  fallback = null,
  requirePermission,
}: PermissionGuardProps) {
  const { role, permissions, loading } = useUserRole()

  if (loading) {
    return null
  }

  // Check role-based access
  if (allowedRoles && role) {
    if (!allowedRoles.includes(role)) {
      return <>{fallback}</>
    }
  }

  // Check permission-based access
  if (requirePermission && permissions) {
    if (!requirePermission(permissions)) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
