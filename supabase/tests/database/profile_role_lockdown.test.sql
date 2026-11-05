-- pgTAP: nobody can make themselves a sponsor.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(8);

-- ── Signing up cannot choose a role ──────────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  'cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'stranger@example.test',
  '{"provider":"email"}', '{"role":"sponsor","full_name":"Stranger"}', now(), now()
);

select is(
  (select role from public.profiles where id = 'cccccccc-0000-0000-0000-000000000001'),
  'ambassador',
  'a role claimed in sign-up data is ignored'
);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  'cccccccc-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'staff@example.test',
  '{"provider":"email","role":"sponsor"}', '{"full_name":"Real Sponsor"}', now(), now()
);

select is(
  (select role from public.profiles where id = 'cccccccc-0000-0000-0000-000000000002'),
  'sponsor',
  'a role set by the service role (app metadata) is honoured'
);

select is(
  (select full_name from public.profiles where id = 'cccccccc-0000-0000-0000-000000000001'),
  'Stranger',
  'the name still comes from the sign-up data'
);

-- ── An ambassador cannot promote themselves ──────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.profiles set role = 'sponsor' where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'an ambassador cannot change their own role'
);

select throws_ok(
  $$update public.profiles set id = 'dddddddd-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'or their id'
);

select lives_ok(
  $$update public.profiles set full_name = 'Alex Renamed' where id = '00000000-0000-0000-0000-000000000002'$$,
  'but they can still change their own name'
);

select is(
  public.is_sponsor_or_staff(),
  false,
  'and still are not a sponsor afterwards'
);

reset role;
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  'ambassador',
  'their role is unchanged'
);

select * from finish();
rollback;
