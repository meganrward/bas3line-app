-- pgTAP: the signed-out `anon` role must have no privileges on public tables,
-- now or on tables created later.

begin;
select plan(3);

select is(
  (
    select count(*)::int
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  0,
  'anon has no privileges on any existing public table'
);

-- A table created the way a future migration would create one.
create table public.anon_default_privilege_check (id int);

select is(
  has_table_privilege('anon', 'public.anon_default_privilege_check', 'select'),
  false,
  'anon gets no select on newly created public tables'
);

select is(
  has_table_privilege('authenticated', 'public.anon_default_privilege_check', 'select'),
  true,
  'signed-in users still get the default grant on new tables'
);

select * from finish();
rollback;
