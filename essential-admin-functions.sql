-- Essential admin functions for super admin access
-- These functions are required for the AdminGuard to work

/*
* public.is_aal2
* Check if the user has aal2 access (MFA verified)
*/
CREATE OR REPLACE FUNCTION public.is_aal2() 
RETURNS boolean
SET search_path = '' AS
$$
DECLARE
    is_aal2 boolean;
BEGIN
    SELECT auth.jwt() ->> 'aal' = 'aal2' INTO is_aal2;
    RETURN COALESCE(is_aal2, false);
END
$$ LANGUAGE plpgsql;

-- Grant access to the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_aal2() TO authenticated;

/*
* public.is_super_admin
* Check if the user is a super admin. 
* A Super Admin is a user that has the role 'super-admin' and has MFA enabled.
*/
CREATE OR REPLACE FUNCTION public.is_super_admin() 
RETURNS boolean
SET search_path = '' AS
$$
DECLARE
    is_super_admin boolean;
BEGIN
    IF NOT public.is_aal2() THEN
        RETURN false;
    END IF;

    SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'super-admin' INTO is_super_admin;

    RETURN COALESCE(is_super_admin, false);
END
$$ LANGUAGE plpgsql;

-- Grant access to the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;