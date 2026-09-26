-- Add Ayesha Valli beneath Shiraz in the published family tree.
-- This is idempotent and also repairs an existing hidden/unlinked Ayesha Valli record.

do $$
declare
  v_shiraz public.family_members%rowtype;
  v_ayesha_id uuid;
  v_sort_order integer;
begin
  select m.*
    into v_shiraz
    from public.family_members m
   where lower(trim(m.name)) = 'shiraz'
      or lower(trim(m.name)) like 'shiraz %'
   order by
     case when lower(trim(m.name)) = 'shiraz' then 0 else 1 end,
     m.created_at
   limit 1;

  if v_shiraz.id is null then
    raise exception 'Cannot add Ayesha Valli: Shiraz was not found in family_members';
  end if;

  select m.id
    into v_ayesha_id
    from public.family_members m
   where lower(trim(m.name)) = 'ayesha valli'
   order by m.created_at
   limit 1;

  select coalesce(max(child.sort_order), v_shiraz.sort_order) + 10
    into v_sort_order
    from public.family_links link
    join public.family_members child on child.id = link.to_member_id
   where link.from_member_id = v_shiraz.id
     and link.link_type = 'parent';

  if v_ayesha_id is null then
    insert into public.family_members (
      name,
      side,
      generation,
      relationship_label,
      details,
      sort_order,
      is_visible
    ) values (
      'Ayesha Valli',
      v_shiraz.side,
      least(v_shiraz.generation + 1, 3),
      'Daughter',
      '',
      v_sort_order,
      true
    )
    returning id into v_ayesha_id;
  else
    update public.family_members
       set side = v_shiraz.side,
           generation = least(v_shiraz.generation + 1, 3),
           relationship_label = 'Daughter',
           is_visible = true,
           updated_at = now()
     where id = v_ayesha_id;
  end if;

  insert into public.family_links (from_member_id, to_member_id, link_type)
  values (v_shiraz.id, v_ayesha_id, 'parent')
  on conflict (from_member_id, to_member_id, link_type) do nothing;
end
$$;
