-- pgTAP: padel_clubs access rules and ambassador home_club_id.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(13);

-- A club to work with, created as superuser.
insert into public.padel_clubs (id, name, town)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Club', 'Testville');

-- ── Signed out ───────────────────────────────────────────────────────────────
set local role anon;

select throws_ok(
  $$select * from public.padel_clubs$$,
  '42501',
  null,
  'signed-out visitors cannot read clubs'
);

-- ── As ambassador1 ───────────────────────────────────────────────────────────
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.padel_clubs where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'ambassador can read clubs'
);

select lives_ok(
  $$insert into public.padel_clubs (name, town) values ('Amb Club', 'Bristol')$$,
  'ambassador can add a missing club'
);

select throws_ok(
  $$insert into public.padel_clubs (name, town) values ('  amb CLUB ', 'BRISTOL')$$,
  '23505',
  null,
  'a duplicate club (ignoring case and spacing) is rejected'
);

select lives_ok(
  $$insert into public.padel_clubs (name, town) values ('Amb Club', 'Leeds')$$,
  'the same club name in a different town is allowed'
);

select throws_ok(
  $$insert into public.padel_clubs (name, created_by) values ('Spoofed', '00000000-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'ambassador cannot add a club as someone else'
);

select lives_ok(
  $$update public.ambassador_profiles set home_club_id = 'aaaaaaaa-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-000000000002'$$,
  'ambassador can set their own home club'
);

-- Silently filtered by RLS: no error, no effect.
update public.padel_clubs set name = 'Renamed' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.padel_clubs where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── As the sponsor ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$update public.padel_clubs set region = 'Test Region' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'sponsor can edit a club'
);

select lives_ok(
  $$delete from public.padel_clubs where name = 'Amb Club' and town = 'Leeds'$$,
  'sponsor can delete a club'
);

-- ── Check results as a superuser ─────────────────────────────────────────────
reset role;

select is(
  (select name from public.padel_clubs where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Test Club',
  'ambassador could not rename or delete a club'
);

select is(
  (select home_club_id from public.ambassador_profiles where id = '00000000-0000-0000-0000-000000000002'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'ambassador home club was saved'
);

select is(
  (select region from public.padel_clubs where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Test Region',
  'sponsor edit of a club was applied'
);

select is(
  (select count(*)::int from public.padel_clubs where name = 'Amb Club' and town = 'Leeds'),
  0,
  'sponsor delete of a club was applied'
);

select * from finish();
rollback;
