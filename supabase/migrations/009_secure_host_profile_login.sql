-- Read the signed-in user's own Host profile through a security-definer RPC.
-- This avoids RLS/PostgREST single-row errors while still authorizing only
-- UUIDs explicitly present in wedding_hosts.

create or replace function public.get_my_host_profile()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select display_name
  from public.wedding_hosts
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_host_profile() from public;
grant execute on function public.get_my_host_profile() to authenticated;
