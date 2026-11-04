-- Drop public.posts, a leftover from the old athlete points/vouchers design.
-- The ambassador pivot (20260622000000) dropped everything that used it.
-- Instagram posts live in the separate monitor Supabase project, not here.

-- Refuse to run if the table somehow holds data, rather than destroying it.
do $$
begin
  if exists (select 1 from public.posts) then
    raise exception 'public.posts is not empty; inspect the rows before dropping it';
  end if;
end $$;

-- No CASCADE: if anything still depends on the table, this fails instead of
-- silently dropping the dependent object.
drop table public.posts;
