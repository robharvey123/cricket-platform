/**
 * Role-based permissions system
 *
 * Roles:
 * - admin: Full access to all features
 * - captain: Can manage matches, teams, and players
 * - player: Can view stats and their own profile
 */

export type UserRole = 'admin' | 'captain' | 'player'

export interface Permission {
  // Season management
  canCreateSeason: boolean
  canEditSeason: boolean
  canDeleteSeason: boolean

  // Team management
  canCreateTeam: boolean
  canEditTeam: boolean
  canDeleteTeam: boolean

  // Match management
  canCreateMatch: boolean
  canEditMatch: boolean
  canDeleteMatch: boolean
  canPublishMatch: boolean
  canImportMatch: boolean

  // Player management
  canCreatePlayer: boolean
  canEditPlayer: boolean
  canDeletePlayer: boolean

  // Scoring configuration
  canEditScoringConfig: boolean
  canRecalculateStats: boolean

  // View permissions
  canViewLeaderboards: boolean
  canViewMatches: boolean
  canViewPlayers: boolean
  canViewStats: boolean
}

/**
 * Get permissions based on user role
 */
export function getPermissions(role: UserRole): Permission {
  const basePermissions: Permission = {
    canCreateSeason: false,
    canEditSeason: false,
    canDeleteSeason: false,
    canCreateTeam: false,
    canEditTeam: false,
    canDeleteTeam: false,
    canCreateMatch: false,
    canEditMatch: false,
    canDeleteMatch: false,
    canPublishMatch: false,
    canImportMatch: false,
    canCreatePlayer: false,
    canEditPlayer: false,
    canDeletePlayer: false,
    canEditScoringConfig: false,
    canRecalculateStats: false,
    canViewLeaderboards: true,  // All roles can view
    canViewMatches: true,        // All roles can view
    canViewPlayers: true,        // All roles can view
    canViewStats: true,          // All roles can view
  }

  switch (role) {
    case 'admin':
      return {
        ...basePermissions,
        canCreateSeason: true,
        canEditSeason: true,
        canDeleteSeason: true,
        canCreateTeam: true,
        canEditTeam: true,
        canDeleteTeam: true,
        canCreateMatch: true,
        canEditMatch: true,
        canDeleteMatch: true,
        canPublishMatch: true,
        canImportMatch: true,
        canCreatePlayer: true,
        canEditPlayer: true,
        canDeletePlayer: true,
        canEditScoringConfig: true,
        canRecalculateStats: true,
      }

    case 'captain':
      return {
        ...basePermissions,
        canCreateSeason: true,
        canEditSeason: true,
        canCreateTeam: true,
        canEditTeam: true,
        canCreateMatch: true,
        canEditMatch: true,
        canPublishMatch: true,
        canImportMatch: true,
        canCreatePlayer: true,
        canEditPlayer: true,
        canRecalculateStats: true,
      }

    case 'player':
    default:
      return basePermissions
  }
}

/**
 * Check if user has management permissions (admin or captain)
 */
export function hasManagementPermission(role: UserRole): boolean {
  return role === 'admin' || role === 'captain'
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    captain: 'Team Captain',
    player: 'Player',
  }
  return roleNames[role]
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: '#dc2626',      // Red
    captain: '#3b82f6',    // Blue
    player: '#059669',     // Green
  }
  return colors[role]
}
