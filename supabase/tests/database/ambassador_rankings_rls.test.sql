-- pgTAP: who can read and change ambassador_rankings.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(6);

insert into public.ambassador_rankings (ambassador_id, source, category, rank)
values
  ('00000000-0000-0000-0000-000000000002', 'fip', 'Open', 100),
  ('00000000-0000-0000-0000-000000000003', 'fip', 'Open', 200);

-- ── As ambassador1 ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.ambassador_rankings),
  1,
  'ambassador sees only their own rankings'
);

select is(
  (select rank from public.ambassador_rankings),
  100,
  'and it is their own row'
);

select throws_ok(
  $$insert into public.ambassador_rankings (ambassador_id, source, category, rank) values ('00000000-0000-0000-0000-000000000002', 'lta', 'Open', 1)$$,
  '42501',
  null,
  'ambassador cannot insert a ranking for themselves'
);

-- Silently filtered: no write policy applies to ambassadors.
update public.ambassador_rankings set rank = 1 where ambassador_id = '00000000-0000-0000-0000-000000000002';
delete from public.ambassador_rankings where ambassador_id = '00000000-0000-0000-0000-000000000002';

-- ── As the sponsor ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.ambassador_rankings),
  2,
  'sponsor sees every ambassador''s rankings'
);

-- ── Check results as a superuser ─────────────────────────────────────────────
reset role;

select is(
  (select rank from public.ambassador_rankings where ambassador_id = '00000000-0000-0000-0000-000000000002'),
  100,
  'ambassador could not change or delete their ranking'
);

-- ── Signed out ───────────────────────────────────────────────────────────────
-- anon still has Supabase's default table grant, so RLS is what hides the rows.
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select is(
  (select count(*)::int from public.ambassador_rankings),
  0,
  'signed-out visitors see no rankings'
);

select * from finish();
rollback;
