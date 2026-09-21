-- Raees & Alisha wedding backend
-- Run through the Supabase CLI or paste into a new project's SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.wedding_hosts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Wedding host',
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  guest_names text not null,
  whatsapp_number text,
  max_guests integer not null default 1 check (max_guests between 1 and 20),
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.invitations(id) on delete cascade,
  respondent_name text not null,
  email text not null,
  attending boolean not null,
  guest_count integer not null default 1 check (guest_count between 1 and 20),
  meal text not null default 'Halaal',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  table_number integer,
  checked_in boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_photos (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.invitations(id) on delete set null,
  storage_path text not null unique,
  caption text not null default '',
  uploaded_by text not null default 'Guest',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists invitations_code_idx on public.invitations(code);
create index if not exists rsvps_status_idx on public.rsvps(status);
create index if not exists guest_photos_status_idx on public.guest_photos(status);

alter table public.wedding_hosts enable row level security;
alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;
alter table public.guest_photos enable row level security;

create or replace function public.is_wedding_host()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.wedding_hosts where user_id = auth.uid());
$$;

revoke all on function public.is_wedding_host() from public;
grant execute on function public.is_wedding_host() to authenticated;

create policy "Hosts can read host records" on public.wedding_hosts
for select to authenticated using (public.is_wedding_host());

create policy "Hosts manage invitations" on public.invitations
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());

create policy "Hosts manage RSVPs" on public.rsvps
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());

create policy "Hosts manage photos" on public.guest_photos
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());

-- Guests can retrieve only the invitation matching their private code.
create or replace function public.get_invitation(p_code text)
returns table (id uuid, code text, guest_names text, max_guests integer)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.code, i.guest_names, i.max_guests
  from public.invitations i
  where i.code = p_code and i.is_active = true
  limit 1;
$$;

revoke all on function public.get_invitation(text) from public;
grant execute on function public.get_invitation(text) to anon, authenticated;

-- Validates the private code and party size before inserting/updating a response.
create or replace function public.submit_rsvp(
  p_code text,
  p_respondent_name text,
  p_email text,
  p_attending boolean,
  p_guest_count integer,
  p_meal text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_id uuid;
begin
  select * into v_invitation
  from public.invitations
  where code = p_code and is_active = true;

  if not found then raise exception 'Invalid or inactive invitation'; end if;
  if p_guest_count < 1 or p_guest_count > v_invitation.max_guests then
    raise exception 'Guest count exceeds this invitation';
  end if;
  if length(trim(p_respondent_name)) < 2 then raise exception 'A valid name is required'; end if;
  if position('@' in p_email) < 2 then raise exception 'A valid email is required'; end if;

  insert into public.rsvps (
    invitation_id, respondent_name, email, attending, guest_count, meal, note, status
  ) values (
    v_invitation.id, trim(p_respondent_name), lower(trim(p_email)), p_attending,
    p_guest_count, coalesce(nullif(trim(p_meal),''),'Halaal'), coalesce(p_note,''),
    case when p_attending then 'pending' else 'declined' end
  )
  on conflict (invitation_id) do update set
    respondent_name = excluded.respondent_name,
    email = excluded.email,
    attending = excluded.attending,
    guest_count = excluded.guest_count,
    meal = excluded.meal,
    note = excluded.note,
    status = case when excluded.attending then 'pending' else 'declined' end,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_rsvp(text,text,text,boolean,integer,text,text) from public;
grant execute on function public.submit_rsvp(text,text,text,boolean,integer,text,text) to anon, authenticated;

-- Private bucket for original wedding photographs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-photos', 'wedding-photos', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Hosts manage wedding photo objects" on storage.objects
for all to authenticated
using (bucket_id = 'wedding-photos' and public.is_wedding_host())
with check (bucket_id = 'wedding-photos' and public.is_wedding_host());
