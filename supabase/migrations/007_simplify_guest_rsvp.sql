-- Simplify guest RSVP: invitation code/name verification only.
-- The legacy email and meal parameters remain in the function signature so
-- deployed clients and PostgREST's function cache stay compatible, but they
-- are no longer collected or validated.

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

  insert into public.rsvps (
    invitation_id, respondent_name, email, attending, guest_count, meal, note, status
  ) values (
    v_invitation.id, trim(p_respondent_name), '', p_attending,
    p_guest_count, 'Halaal', coalesce(p_note,''),
    case when p_attending then 'pending' else 'declined' end
  )
  on conflict (invitation_id) do update set
    respondent_name = excluded.respondent_name,
    email = '',
    attending = excluded.attending,
    guest_count = excluded.guest_count,
    meal = 'Halaal',
    note = excluded.note,
    status = case when excluded.attending then 'pending' else 'declined' end,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_rsvp(text,text,text,boolean,integer,text,text) from public;
grant execute on function public.submit_rsvp(text,text,text,boolean,integer,text,text) to anon, authenticated;
