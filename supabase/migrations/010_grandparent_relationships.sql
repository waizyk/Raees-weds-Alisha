-- Support explicit grandparent relationships in the interactive family tree.

alter table public.family_links
  drop constraint if exists family_links_link_type_check;

alter table public.family_links
  add constraint family_links_link_type_check
  check (link_type in ('parent','grandparent','spouse','sibling','family','friend'));
