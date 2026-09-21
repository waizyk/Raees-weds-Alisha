-- Add moderated wedding-video uploads and previews

alter table public.guest_photos
add column if not exists media_type text not null default 'image'
check (media_type in ('image','video'));

update storage.buckets
set file_size_limit = 104857600,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/heic','image/heif',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'wedding-photos';

create or replace function public.register_guest_media(
  p_code text,
  p_storage_path text,
  p_uploaded_by text,
  p_caption text,
  p_media_type text
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
  if p_media_type not in ('image','video') then raise exception 'Unsupported media type'; end if;

  insert into public.guest_photos (
    invitation_id, storage_path, uploaded_by, caption, status, media_type
  ) values (
    v_invitation_id, p_storage_path, trim(p_uploaded_by), coalesce(p_caption,''),
    'pending', p_media_type
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.register_guest_media(text,text,text,text,text) from public;
grant execute on function public.register_guest_media(text,text,text,text,text) to anon, authenticated;

drop function if exists public.list_approved_photos(text);
create function public.list_approved_photos(p_code text)
returns table (
  id uuid,
  storage_path text,
  caption text,
  uploaded_by text,
  media_type text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_valid_invite_code(p_code) then raise exception 'Invalid invitation'; end if;
  return query
  select p.id, p.storage_path, p.caption, p.uploaded_by, p.media_type, p.created_at
  from public.guest_photos p
  where p.status = 'approved'
  order by p.created_at desc;
end;
$$;

revoke all on function public.list_approved_photos(text) from public;
grant execute on function public.list_approved_photos(text) to anon, authenticated;
