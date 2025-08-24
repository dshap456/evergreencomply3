-- Fix user_accounts view to include is_personal_account field
-- This is needed for the cart to distinguish between personal and team accounts

DROP VIEW IF EXISTS public.user_accounts;

CREATE OR REPLACE VIEW public.user_accounts AS
SELECT
  account.id,
  account.name,
  account.picture_url,
  account.slug,
  membership.account_role as role,
  account.is_personal_account
FROM
  public.accounts account
  JOIN public.accounts_memberships membership ON account.id = membership.account_id
WHERE
  membership.user_id = auth.uid()
  AND account.is_personal_account = false  -- Only show team accounts
  AND account.id IN (
    SELECT account_id
    FROM public.accounts_memberships
    WHERE user_id = auth.uid()
  );

GRANT SELECT ON public.user_accounts TO authenticated, service_role;