-- Interactive family tree with private guest suggestions

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  side text not null default 'shared' check (side in ('khan','ahmed','shared','friends')),
  generation integer not null default 0 check (generation between -4 and 3),
  relationship_label text not null default 'Family',
  details text not null default '',
  photo_url text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references public.family_members(id) on delete cascade,
  to_member_id uuid not null references public.family_members(id) on delete cascade,
  link_type text not null check (link_type in ('parent','spouse','sibling','family','friend')),
  created_at timestamptz not null default now(),
  unique (from_member_id, to_member_id, link_type),
  check (from_member_id <> to_member_id)
);

create table if not exists public.family_suggestions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  suggested_by text not null,
  suggested_name text not null,
  relationship_label text not null,
  placement_notes text not null default '',
  details text not null default '',
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists family_members_generation_idx on public.family_members(generation, sort_order);
create index if not exists family_suggestions_status_idx on public.family_suggestions(status, created_at);

alter table public.family_members enable row level security;
alter table public.family_links enable row level security;
alter table public.family_suggestions enable row level security;

create policy "Hosts manage family members" on public.family_members
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());
create policy "Hosts manage family links" on public.family_links
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());
create policy "Hosts privately manage family suggestions" on public.family_suggestions
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());

-- Only this RPC exposes the published tree. Suggestions are deliberately excluded.
create or replace function public.get_family_tree(p_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibility text;
  v_allowed boolean := false;
  v_result jsonb;
begin
  select tree_visibility into v_visibility from public.site_settings where id = 1;
  v_visibility := coalesce(v_visibility, 'invited');

  if public.is_wedding_host() then
    v_allowed := true;
  elsif v_visibility = 'everyone' then
    v_allowed := true;
  elsif v_visibility = 'invited' and p_code is not null and public.is_valid_invite_code(p_code) then
    v_allowed := true;
  end if;

  if not v_allowed then raise exception 'This family tree is private'; end if;

  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(to_jsonb(m) order by m.generation, m.sort_order, m.name)
      from public.family_members m where m.is_visible = true), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(to_jsonb(l)) from public.family_links l
      where exists(select 1 from public.family_members m where m.id=l.from_member_id and m.is_visible)
        and exists(select 1 from public.family_members m where m.id=l.to_member_id and m.is_visible)), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_family_tree(text) from public;
grant execute on function public.get_family_tree(text) to anon, authenticated;

create or replace function public.submit_family_suggestion(
  p_code text,
  p_suggested_by text,
  p_suggested_name text,
  p_relationship_label text,
  p_placement_notes text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid;
  v_id uuid;
begin
  select id into v_invitation_id from public.invitations where code=p_code and is_active=true;
  if not found then raise exception 'A valid invitation is required'; end if;
  if length(trim(p_suggested_by)) < 2 or length(trim(p_suggested_name)) < 2 then
    raise exception 'Your name and the suggested family member are required';
  end if;
  insert into public.family_suggestions (
    invitation_id, suggested_by, suggested_name, relationship_label, placement_notes, details
  ) values (
    v_invitation_id, trim(p_suggested_by), trim(p_suggested_name),
    trim(p_relationship_label), coalesce(p_placement_notes,''), coalesce(p_details,'')
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_family_suggestion(text,text,text,text,text,text) from public;
grant execute on function public.submit_family_suggestion(text,text,text,text,text,text) to anon, authenticated;

-- Seed only the couple. Hosts add relatives once names and placements are confirmed.
insert into public.family_members (name, side, generation, relationship_label, sort_order, details)
select 'Mohammed Raees Khan', 'khan', 0, 'Groom', 10, 'Raees'
where not exists (select 1 from public.family_members where name='Mohammed Raees Khan');
insert into public.family_members (name, side, generation, relationship_label, sort_order, details)
select 'Alisha Ahmed', 'ahmed', 0, 'Bride', 20, 'Alisha'
where not exists (select 1 from public.family_members where name='Alisha Ahmed');
insert into public.family_links (from_member_id, to_member_id, link_type)
select a.id, b.id, 'spouse'
from public.family_members a, public.family_members b
where a.name='Mohammed Raees Khan' and b.name='Alisha Ahmed'
on conflict do nothing;
