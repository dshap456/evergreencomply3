-- Minimal user workspace view without subscription dependency
-- This will get the user settings working

create or replace view
    public.user_account_workspace
    with (security_invoker = true) as
select
    accounts.id as id,
    accounts.name as name,
    accounts.picture_url as picture_url,
    null::text as subscription_status
from
    public.accounts
where
    primary_owner_user_id = (select auth.uid ())
  and accounts.is_personal_account = true
limit
    1;

grant
    select
    on public.user_account_workspace to authenticated,
    service_role;

-- VIEW "user_accounts":
-- we create a view to load the user's accounts and memberships
-- useful to display the user's accounts in the app
create or replace view
    public.user_accounts (id, name, picture_url, slug, role)
    with (security_invoker = true) as
select
    account.id,
    account.name,
    account.picture_url,
    account.slug,
    membership.account_role
from
    public.accounts account
    join public.accounts_memberships membership on account.id = membership.account_id
where
    membership.user_id = (select auth.uid ())
  and account.is_personal_account = false
  and account.id in (
    select
        account_id
    from
        public.accounts_memberships
    where
        user_id = (select auth.uid ())
);

grant
    select
    on public.user_accounts to authenticated,
    service_role;