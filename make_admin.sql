-- Update robharvey123@gmail.com to admin role
-- This script updates the user role for the specified email address

-- First, find the user ID from auth.users
DO $$
DECLARE
  v_user_id UUID;
  v_club_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'robharvey123@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email robharvey123@gmail.com not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Get the club_id for this user (assuming they're already in a club)
  SELECT club_id INTO v_club_id
  FROM public.user_org_roles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE NOTICE 'User is not associated with any club yet';

    -- If there's only one club, assign user to it
    SELECT id INTO v_club_id
    FROM public.clubs
    LIMIT 1;

    IF v_club_id IS NOT NULL THEN
      RAISE NOTICE 'Assigning user to club: %', v_club_id;

      INSERT INTO public.user_org_roles (user_id, club_id, role)
      VALUES (v_user_id, v_club_id, 'admin')
      ON CONFLICT (user_id, club_id)
      DO UPDATE SET role = 'admin';

      RAISE NOTICE 'User assigned to club as admin';
    ELSE
      RAISE NOTICE 'No clubs found in database';
    END IF;
  ELSE
    RAISE NOTICE 'Updating role to admin for club: %', v_club_id;

    -- Update existing role to admin
    UPDATE public.user_org_roles
    SET role = 'admin'
    WHERE user_id = v_user_id AND club_id = v_club_id;

    RAISE NOTICE 'User role updated to admin successfully';
  END IF;
END $$;

-- Verify the update
SELECT
  u.email,
  uor.role,
  c.name as club_name
FROM auth.users u
JOIN public.user_org_roles uor ON u.id = uor.user_id
LEFT JOIN public.clubs c ON uor.club_id = c.id
WHERE u.email = 'robharvey123@gmail.com';
