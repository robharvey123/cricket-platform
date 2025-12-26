-- Safe script to make robharvey123@gmail.com an admin
-- Works whether or not the role constraint has been applied

DO $$
DECLARE
  v_user_id UUID;
  v_club_id UUID;
  v_current_role TEXT;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'robharvey123@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email robharvey123@gmail.com not found';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Get the club_id for this user
  SELECT club_id, role INTO v_club_id, v_current_role
  FROM public.user_org_roles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE NOTICE 'User is not associated with any club yet';

    -- Get the first club
    SELECT id INTO v_club_id
    FROM public.clubs
    LIMIT 1;

    IF v_club_id IS NULL THEN
      RAISE EXCEPTION 'No clubs found in database';
    END IF;

    RAISE NOTICE 'Assigning user to club: %', v_club_id;

    -- Try to insert with admin role
    BEGIN
      INSERT INTO public.user_org_roles (user_id, club_id, role)
      VALUES (v_user_id, v_club_id, 'admin');
      RAISE NOTICE 'User assigned to club as admin';
    EXCEPTION WHEN check_violation THEN
      -- If constraint exists and fails, the role field might have different values
      -- Try with 'super_admin' or just update the existing enum
      RAISE NOTICE 'Could not insert as admin - trying alternative approach';

      -- Delete and re-insert without role to see what the default is
      DELETE FROM public.user_org_roles WHERE user_id = v_user_id AND club_id = v_club_id;

      -- Check if there's an enum type for roles
      INSERT INTO public.user_org_roles (user_id, club_id, role)
      VALUES (v_user_id, v_club_id, 'admin');
    END;
  ELSE
    RAISE NOTICE 'Current role: %, updating to admin for club: %', v_current_role, v_club_id;

    -- Try to update to admin
    BEGIN
      UPDATE public.user_org_roles
      SET role = 'admin'
      WHERE user_id = v_user_id AND club_id = v_club_id;
      RAISE NOTICE 'User role updated to admin successfully';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'Could not update to admin due to constraint';
      RAISE EXCEPTION 'Role constraint prevents setting role to admin. You may need to apply migrations first.';
    END;
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
