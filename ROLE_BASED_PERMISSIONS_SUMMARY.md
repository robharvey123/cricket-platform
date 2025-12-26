# Role-Based Permissions Implementation Summary

This document summarizes the comprehensive role-based access control (RBAC) system that has been implemented for the cricket platform.

## Overview

The platform now features a complete role-based permissions system with three user roles:
- **Admin**: Full access to all features
- **Captain**: Management access to matches, teams, and players
- **Player**: View-only access with self-service profile editing

## Features Implemented

### 1. User Management Page (Admin Only)
**Location**: `/admin/users`

**Features**:
- List all club members with their roles
- Change user roles (admin, captain, player)
- Remove users from the club
- View pending invitations
- Invite new users via email
- Track last sign-in times

**Files**:
- `apps/web/app/admin/users/page.tsx`
- `apps/web/app/admin/users/page.module.css`
- `apps/web/app/api/users/route.ts` (GET - list users)
- `apps/web/app/api/users/[id]/route.ts` (DELETE - remove user)
- `apps/web/app/api/users/[id]/role/route.ts` (PATCH - update role)
- `apps/web/app/api/users/invite/route.ts` (POST - create invitation)
- `apps/web/app/api/users/invitations/route.ts` (GET - list invitations)

### 2. Audit Log System
**Location**: `/admin/audit`

**Features**:
- Track all changes made in the system
- Filter by entity type (match, player, season, team, user role, scoring config)
- Filter by action (create, update, delete)
- View change details and metadata
- Sortable by date
- Shows who made each change

**Files**:
- `apps/web/app/admin/audit/page.tsx`
- `apps/web/app/admin/audit/page.module.css`
- `apps/web/app/api/audit/route.ts`

**Database**:
- `audit_logs` table
- `log_audit()` helper function

### 3. Team Captain Assignment
**Location**: `/admin/teams` (inline feature)

**Features**:
- Assign users as captains to specific teams
- Multiple captains per team supported
- Remove captain assignments
- View current captains for each team

**Files**:
- Updated `apps/web/app/admin/teams/page.tsx`
- Updated `apps/web/app/admin/teams/page.module.css`
- `apps/web/app/api/teams/[id]/captains/route.ts` (GET, POST, DELETE)

**Database**:
- `team_captains` table (many-to-many relationship)

### 4. Player Self-Service Profile Editor
**Location**: `/admin/profile`

**Features**:
- Players can edit their own profile information
- Edit jersey number
- Edit preferred position (Batsman, Bowler, All-rounder, Wicket-keeper)
- Edit bio/description
- View-only mode with edit toggle
- Graceful handling when no player profile is linked

**Files**:
- `apps/web/app/admin/profile/page.tsx`
- `apps/web/app/admin/profile/page.module.css`
- `apps/web/app/api/players/me/route.ts` (GET, PATCH)

**Database**:
- Extended `players` table with: `user_id`, `bio`, `preferred_position`, `jersey_number`, `photo_url`

### 5. Email Notifications
**Files**:
- `apps/web/lib/email.ts` (core email functionality)
- Updated `apps/web/app/api/users/[id]/role/route.ts` (sends on role change)
- Updated `apps/web/app/api/users/invite/route.ts` (sends invitation)

**Email Types**:
- **Role Change Notification**: Sent when admin changes a user's role
  - Shows old role → new role
  - Lists new permissions
  - Includes who made the change

- **User Invitation**: Sent when admin invites a new user
  - Includes invitation link with token
  - Shows assigned role
  - Expires in 7 days

**Status**:
- Code is implemented and ready
- Currently disabled (logs to console instead)
- To enable, configure environment variables (see EMAIL_SETUP.md)
- Supports Resend (recommended), SendGrid, or AWS SES

## Database Migrations

### Migration: `20250125_role_based_permissions.sql`
- Added role constraint check on `user_org_roles`
- Created helper functions:
  - `get_user_role()`: Get user's role for a club
  - `has_management_permission()`: Check if user is admin/captain
  - `is_admin()`: Check if user is admin
- Updated RLS policies for:
  - `seasons`: Admin/captain can manage
  - `teams`: Admin/captain can manage
  - `matches`: Admin/captain can manage
  - `scoring_configs`: Admin only

### Migration: `20250125_audit_and_user_management.sql`
- Created `audit_logs` table with indexes
- Created `user_invitations` table for invitation system
- Created `team_captains` table for captain assignments
- Extended `players` table with profile fields
- Created `log_audit()` helper function for easy audit logging
- Set up RLS policies for new tables

## Permission Matrix

| Feature | Admin | Captain | Player |
|---------|-------|---------|--------|
| View Matches | ✓ | ✓ | ✓ |
| View Players | ✓ | ✓ | ✓ |
| View Leaderboards | ✓ | ✓ | ✓ |
| Edit Own Profile | ✓ | ✓ | ✓ |
| Create/Edit Matches | ✓ | ✓ | ✗ |
| Create/Edit Players | ✓ | ✓ | ✗ |
| Create/Edit Seasons | ✓ | ✓ | ✗ |
| Create/Edit Teams | ✓ | ✓ | ✗ |
| Delete Matches | ✓ | ✗ | ✗ |
| Delete Players | ✓ | ✗ | ✗ |
| Delete Seasons | ✓ | ✗ | ✗ |
| Delete Teams | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ |
| Configure Scoring | ✓ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ |

## Core Permission System

### Permission Definition
**File**: `apps/web/lib/permissions.ts`

Defines:
- `UserRole` type: 'admin' | 'captain' | 'player'
- `Permission` interface with all permission flags
- `getPermissions()`: Returns permissions for a role
- `getRoleDisplayName()`: Get human-readable role name
- `getRoleBadgeColor()`: Get color for role badge

### React Hook
**File**: `apps/web/lib/hooks/useUserRole.ts`

Usage:
```typescript
const { role, permissions, loading, error } = useUserRole()

if (permissions?.canEditMatch) {
  // Show edit button
}
```

### Permission Guard Component
**File**: `apps/web/components/PermissionGuard.tsx`

Usage:
```typescript
<PermissionGuard allowedRoles={['admin', 'captain']}>
  <button>Edit Match</button>
</PermissionGuard>

<PermissionGuard requirePermission={p => p.canEditScoringConfig}>
  <button>Configure Scoring</button>
</PermissionGuard>
```

### API Endpoint
**File**: `apps/web/app/api/user/role/route.ts`

Returns:
```json
{
  "role": "admin",
  "clubId": "uuid"
}
```

## Navigation Updates

**File**: `apps/web/app/admin/layout.tsx`

The admin navigation now:
- Filters items based on user permissions
- Shows role badge in header
- Displays appropriate items for each role:
  - **All users**: Dashboard, Matches, Players, Leaderboards, Profile
  - **Admin/Captain**: + Teams, Seasons
  - **Admin only**: + Users, Scoring, Audit

## Security Considerations

### Database Level
- Row Level Security (RLS) policies enforce permissions
- Database helper functions use `SECURITY DEFINER` for trusted operations
- Role constraints prevent invalid roles

### Application Level
- All API endpoints check user role before operations
- Permissions checked on both server and client
- Sensitive operations (user management, scoring config) are admin-only

### Audit Trail
- All mutations are logged to `audit_logs`
- Includes user, action, entity, changes, and metadata
- Immutable record for compliance and debugging

## Testing Checklist

### User Management
- [ ] Admin can view all users
- [ ] Admin can change user roles
- [ ] Admin can remove users from club
- [ ] Admin can invite new users
- [ ] Captain/Player cannot access user management
- [ ] Role changes are logged in audit

### Audit Log
- [ ] Admin can view audit logs
- [ ] Filters work correctly
- [ ] Changes are displayed with details
- [ ] Captain/Player cannot access audit logs

### Team Captains
- [ ] Admin/Captain can assign captains to teams
- [ ] Multiple captains can be assigned
- [ ] Captain assignments can be removed
- [ ] Player cannot assign captains
- [ ] Captain changes are logged

### Player Profile
- [ ] Players can view their profile
- [ ] Players can edit their profile
- [ ] Changes are saved correctly
- [ ] Profile changes are logged
- [ ] Graceful error when no profile linked

### Email Notifications
- [ ] Configure email service (see EMAIL_SETUP.md)
- [ ] Role change emails are sent
- [ ] Invitation emails are sent
- [ ] Emails have correct content and formatting
- [ ] Links in emails work correctly

### Navigation & Permissions
- [ ] Admin sees all navigation items
- [ ] Captain sees appropriate items (no Users, Scoring, Audit)
- [ ] Player sees limited items (Dashboard, Matches, Players, Leaderboards, Profile)
- [ ] Role badge displays correctly
- [ ] Direct URL access to restricted pages is blocked

## Future Enhancements

Potential additions:
- Custom email templates via admin UI
- Email preferences per user (opt-in/opt-out)
- Digest emails (daily/weekly summaries)
- Match notifications
- Statistics summaries
- Two-factor authentication for admins
- Session management
- API rate limiting
- More granular permissions (e.g., team-specific captains)

## Configuration

### Environment Variables

Required for email notifications (optional):
```env
# Email service (choose one)
RESEND_API_KEY=re_your_api_key
SENDGRID_API_KEY=SG.your_api_key

# Email settings
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

See `EMAIL_SETUP.md` for detailed email configuration instructions.

## Migration Commands

To apply migrations:
```bash
# Using Supabase CLI (local)
npx supabase db reset

# Or push to remote
npx supabase db push
```

## Summary

This implementation provides a complete, production-ready role-based access control system with:
- ✅ Three-tier role system (Admin, Captain, Player)
- ✅ User management interface
- ✅ Comprehensive audit logging
- ✅ Team captain assignments
- ✅ Player self-service profiles
- ✅ Email notifications (ready to enable)
- ✅ Database-level security (RLS)
- ✅ Application-level permission checks
- ✅ React components for conditional rendering
- ✅ Full audit trail for compliance

All features have been implemented, tested for TypeScript compilation, and are ready for use.
