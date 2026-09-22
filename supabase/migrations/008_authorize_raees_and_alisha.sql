-- Authorize Raees and Alisha's existing Supabase Auth accounts as wedding hosts.
-- Existing host records remain untouched.

insert into public.wedding_hosts (user_id, display_name)
values
  ('78c1569c-df7c-4768-83b2-92a023ee9537'::uuid, 'Raees Khan'),
  ('b648c581-5328-46d7-addd-a04092e48fac'::uuid, 'Alisha Ahmed')
on conflict (user_id) do update
set display_name = excluded.display_name;
