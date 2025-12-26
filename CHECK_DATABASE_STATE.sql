-- Check current state of the database

-- 1. Check what roles currently exist
SELECT 'Current roles in user_org_roles:' as info;
SELECT DISTINCT role, COUNT(*) as count
FROM public.user_org_roles
GROUP BY role
ORDER BY role;

-- 2. Check constraints on user_org_roles
SELECT 'Current constraints on user_org_roles:' as info;
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_org_roles'::regclass;

-- 3. Check if our new tables already exist
SELECT 'Existing tables:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('audit_logs', 'user_invitations', 'team_captains')
ORDER BY table_name;

-- 4. Check current user
SELECT 'Current user info:' as info;
SELECT
  u.id,
  u.email,
  uor.role,
  uor.club_id
FROM auth.users u
LEFT JOIN public.user_org_roles uor ON u.id = uor.user_id
WHERE u.email = 'robharvey123@gmail.com';

-- 5. Check all users and their roles
SELECT 'All users and roles:' as info;
SELECT
  u.email,
  uor.role,
  c.name as club_name
FROM auth.users u
JOIN public.user_org_roles uor ON u.id = uor.user_id
LEFT JOIN public.clubs c ON uor.club_id = c.id
ORDER BY u.email;
