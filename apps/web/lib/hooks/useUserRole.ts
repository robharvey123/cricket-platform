import { useState, useEffect } from 'react'
import { type UserRole, getPermissions, type Permission } from '../permissions'

export interface UseUserRoleResult {
  role: UserRole | null
  permissions: Permission | null
  clubId: string | null
  loading: boolean
  error: string | null
}

/**
 * Hook to get current user's role and permissions
 */
export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/user/role')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user role')
      }

      setRole(data.role as UserRole)
      setClubId(data.clubId ?? null)
    } catch (err: any) {
      setError(err.message)
      setRole('player') // Default to player role
      setClubId(null)
    } finally {
      setLoading(false)
    }
  }

  const permissions = role ? getPermissions(role) : null

  return {
    role,
    permissions,
    clubId,
    loading,
    error,
  }
}
