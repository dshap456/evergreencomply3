-- Create a function to safely query auth.users
-- This function can be called from the API to check user existence

CREATE OR REPLACE FUNCTION get_user_by_email(target_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  phone TEXT
)
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    u.last_sign_in_at,
    u.phone
  FROM auth.users u
  WHERE u.email = target_email;
END;
$$;

-- Grant access to authenticated and service_role users
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated, service_role;