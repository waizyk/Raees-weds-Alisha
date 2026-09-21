-- Host-controlled visibility for the album and family tree

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  album_visibility text not null default 'invited' check (album_visibility in ('everyone','invited','hosts')),
  tree_visibility text not null default 'invited' check (tree_visibility in ('everyone','invited','hosts')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, album_visibility, tree_visibility)
values (1, 'invited', 'invited')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Hosts manage site privacy" on public.site_settings;
create policy "Hosts manage site privacy" on public.site_settings
for all to authenticated
using (public.is_wedding_host())
with check (public.is_wedding_host());

create or replace function public.get_site_settings()
returns table (album_visibility text, tree_visibility text)
language sql
stable
security definer
set search_path = public
as $$
  select s.album_visibility, s.tree_visibility
  from public.site_settings s
  where s.id = 1;
$$;

revoke all on function public.get_site_settings() from public;
grant execute on function public.get_site_settings() to anon, authenticated;
