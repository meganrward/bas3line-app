-- pgTAP: who may change what on ambassador_profiles.
-- Run with `supabase test db` against a local DB that has supabase/seed.sql applied.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(9);

-- ── As ambassador1 ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $$update public.ambassador_profiles set bio = 'Updated by me' where id = '00000000-0000-0000-0000-000000000002'$$,
  'ambassador can edit their own bio'
);

select lives_ok(
  $$update public.ambassador_profiles set training_location = 'Bristol' where id = '00000000-0000-0000-0000-000000000002'$$,
  'ambassador can edit their own training location'
);

select throws_ok(
  $$update public.ambassador_profiles set commission_rate = 99 where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'ambassador cannot raise their own commission rate'
);

select throws_ok(
  $$update public.ambassador_profiles set discount_code = 'stolen' where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'ambassador cannot change their own discount code'
);

select throws_ok(
  $$update public.ambassador_profiles set team_role = 'Captain' where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'ambassador cannot change their own team role'
);

select throws_ok(
  $$update public.ambassador_profiles set fip_player_slug = 'someone-else' where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'ambassador cannot change sponsor-managed identifiers'
);

-- Another ambassador's row is invisible to the update policy: no error, no change.
update public.ambassador_profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-000000000003';

-- ── As the sponsor ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$update public.ambassador_profiles set commission_rate = 15, discount_code = 'alex15' where id = '00000000-0000-0000-0000-000000000002'$$,
  'sponsor can edit commission rate and discount code'
);

-- ── Check results as a superuser ─────────────────────────────────────────────
reset role;

select is(
  (select bio from public.ambassador_profiles where id = '00000000-0000-0000-0000-000000000003'),
  'Local dev ambassador.',
  'ambassador cannot edit another ambassador''s profile'
);

select is(
  (select commission_rate from public.ambassador_profiles where id = '00000000-0000-0000-0000-000000000002'),
  15.00::numeric,
  'sponsor edit of commission rate was applied'
);

select * from finish();
rollback;
