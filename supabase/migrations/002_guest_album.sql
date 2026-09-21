-- Secure invitation-only guest album and moderation

create or replace function public.is_valid_invite_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.invitations
    where code = p_code and is_active = true
  );
$$;

revoke all on function public.is_valid_invite_code(text) from public;
grant execute on function public.is_valid_invite_code(text) to anon, authenticated;

-- Invited guests may upload only into a folder matching a valid private invite code.
drop policy if exists "Invited guests upload wedding photos" on storage.objects;
create policy "Invited guests upload wedding photos" on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'wedding-photos'
  and public.is_valid_invite_code((storage.foldername(name))[1])
);

-- Approved objects can be read through unguessable paths. Metadata remains behind an invite-code RPC.
create or replace function public.is_approved_photo_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.guest_photos where storage_path = p_path and status = 'approved');
$$;
revoke all on function public.is_approved_photo_path(text) from public;
grant execute on function public.is_approved_photo_path(text) to anon, authenticated;

drop policy if exists "Approved wedding photos can be read" on storage.objects;
create policy "Approved wedding photos can be read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'wedding-photos' and public.is_approved_photo_path(name));

create or replace function public.register_guest_photo(
  p_code text,
  p_storage_path text,
  p_uploaded_by text,
  p_caption text default ''
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
  select id into v_invitation_id
  from public.invitations
  where code = p_code and is_active = true;

  if not found then raise exception 'Invalid or inactive invitation'; end if;
  if split_part(p_storage_path, '/', 1) <> p_code then raise exception 'Invalid upload path'; end if;
  if length(trim(p_uploaded_by)) < 2 then raise exception 'Uploader name is required'; end if;

  insert into public.guest_photos (invitation_id, storage_path, uploaded_by, caption, status)
  values (v_invitation_id, p_storage_path, trim(p_uploaded_by), coalesce(p_caption,''), 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.register_guest_photo(text,text,text,text) from public;
grant execute on function public.register_guest_photo(text,text,text,text) to anon, authenticated;

create or replace function public.list_approved_photos(p_code text)
returns table (id uuid, storage_path text, caption text, uploaded_by text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_valid_invite_code(p_code) then raise exception 'Invalid invitation'; end if;
  return query
  select p.id, p.storage_path, p.caption, p.uploaded_by, p.created_at
  from public.guest_photos p
  where p.status = 'approved'
  order by p.created_at desc;
end;
$$;

revoke all on function public.list_approved_photos(text) from public;
grant execute on function public.list_approved_photos(text) to anon, authenticated;
