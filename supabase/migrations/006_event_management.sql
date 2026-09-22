-- Host-managed wedding details and proceedings

create table if not exists public.wedding_settings (
  id integer primary key default 1 check (id = 1),
  event_date date not null default '2026-10-24',
  rsvp_deadline date not null default '2026-10-05',
  city text not null default 'Katima Mulilo',
  country text not null default 'Namibia',
  main_venue text not null default 'Venue to be confirmed',
  main_time time,
  venue_private boolean not null default true,
  attire text not null default 'Formal & modest',
  attire_note text not null default 'Traditional attire is warmly welcomed · Kindly avoid ivory and white',
  guest_note text not null default 'Our Nikah and wedding celebration will be conducted in accordance with Islamic values. Halaal catering will be served.',
  contact_note text not null default '',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.wedding_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.event_proceedings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  venue_name text not null default '',
  address text not null default '',
  description text not null default '',
  attire text not null default '',
  location_private boolean not null default true,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wedding_settings enable row level security;
alter table public.event_proceedings enable row level security;

drop policy if exists "Hosts manage wedding settings" on public.wedding_settings;
create policy "Hosts manage wedding settings" on public.wedding_settings
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());
drop policy if exists "Hosts manage proceedings" on public.event_proceedings;
create policy "Hosts manage proceedings" on public.event_proceedings
for all to authenticated using (public.is_wedding_host()) with check (public.is_wedding_host());

create or replace function public.get_event_details(p_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_invited boolean := false;
  v_host boolean := false;
  v_result jsonb;
begin
  v_host := public.is_wedding_host();
  v_invited := p_code is not null and public.is_valid_invite_code(p_code);

  select jsonb_build_object(
    'settings', (select to_jsonb(s) || jsonb_build_object(
      'main_venue', case when s.venue_private and not (v_host or v_invited) then 'Shared with invited guests' else s.main_venue end,
      'main_time', case when s.venue_private and not (v_host or v_invited) then null else s.main_time end
    ) from public.wedding_settings s where s.id=1),
    'proceedings', coalesce((select jsonb_agg(
      to_jsonb(e) || jsonb_build_object(
        'venue_name', case when e.location_private and not (v_host or v_invited) then 'Shared with invited guests' else e.venue_name end,
        'address', case when e.location_private and not (v_host or v_invited) then '' else e.address end
      ) order by e.event_date, e.start_time nulls last, e.sort_order)
      from public.event_proceedings e where e.is_visible=true), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_event_details(text) from public;
grant execute on function public.get_event_details(text) to anon, authenticated;

insert into public.event_proceedings (
  title, event_date, start_time, venue_name, description, attire, location_private, sort_order
)
select 'Nikah & Wedding Celebration', '2026-10-24', null, 'Venue to be confirmed',
       'Nikah and celebration timings will be shared soon.', 'Formal & modest', true, 10
where not exists (select 1 from public.event_proceedings);
