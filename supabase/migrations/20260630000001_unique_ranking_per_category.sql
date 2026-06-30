alter table public.ambassador_rankings
  add constraint ambassador_rankings_ambassador_source_category_unique
  unique (ambassador_id, source, category);
