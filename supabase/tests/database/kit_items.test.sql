-- pgTAP: kit items access rules, and choosing an item on a kit request.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(14);

-- Sponsor id taken from the seeded ambassador, so the test does not guess it.
create temp table seed_sponsor as
select sponsor_id from public.ambassador_profiles
 where id = '00000000-0000-0000-0000-000000000003';
grant select on seed_sponsor to authenticated;

insert into public.kit_items (id, sponsor_id, name, price, active)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', (select sponsor_id from seed_sponsor), 'Test tee', 20.00, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', (select sponsor_id from seed_sponsor), 'Retired hoodie', 45.00, false);

-- Give ambassador2 plenty to spend.
insert into public.discount_code_sales
  (ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date)
values
  ('00000000-0000-0000-0000-000000000003', 'sam10', 'kit-test-1', 1000, 100, now());

-- ── Signed out ───────────────────────────────────────────────────────────────
set local role anon;
select throws_ok(
  $$select * from public.kit_items$$,
  '42501',
  null,
  'signed-out visitors cannot read kit items'
);

-- ── As ambassador2 ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select ok(
  (select bool_and(active) from public.kit_items),
  'an ambassador sees only active items'
);

select throws_ok(
  $$insert into public.kit_items (sponsor_id, name, price) values ((select sponsor_id from seed_sponsor), 'Free stuff', 1)$$,
  '42501',
  null,
  'an ambassador cannot add kit items'
);

-- Silently filtered: no write policy applies to ambassadors.
update public.kit_items set price = 1;
select is(
  (select price from public.kit_items where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  20.00,
  'an ambassador cannot change a price'
);

select lives_ok(
  $$select public.request_payout('kit', 12.00, null, 'bbbbbbbb-0000-0000-0000-000000000001')$$,
  'a kit request can pick an item and use part of its price as a discount'
);

select is(
  (select kit_item_name || ' ' || kit_item_price::text || ' ' || kit_credit_value::text
     from public.payout_requests where amount = 12.00),
  'Test tee 20.00 12.00',
  'the request keeps a copy of the item and its discount value'
);

select throws_ok(
  $$select public.request_payout('kit', 25.00, null, 'bbbbbbbb-0000-0000-0000-000000000001')$$,
  'P0001',
  'That is more discount than the item costs',
  'the discount cannot exceed the item price'
);

select throws_ok(
  $$select public.request_payout('kit', 5.00, null, 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  'P0001',
  'That kit item is not available',
  'a retired item cannot be chosen'
);

select throws_ok(
  $$select public.request_payout('cash', 5.00, null, 'bbbbbbbb-0000-0000-0000-000000000001')$$,
  'P0001',
  'A kit item can only be chosen on a kit request',
  'a cash request cannot name a kit item'
);

select lives_ok(
  $$select public.request_payout('kit', 5.00, 'Something not on the list')$$,
  'a kit request without an item still works (free-text note)'
);

-- ── As the sponsor ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.kit_items where name in ('Test tee', 'Retired hoodie')),
  2,
  'the sponsor sees active and retired items'
);

select lives_ok(
  $$update public.kit_items set price = 25.00 where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'the sponsor can change a price'
);

select is(
  (select kit_item_price from public.payout_requests where amount = 12.00),
  20.00,
  'and an earlier request keeps the price it was made at'
);

delete from public.kit_items where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select is(
  (select kit_item_name from public.payout_requests where amount = 12.00),
  'Test tee',
  'removing an item leaves the request readable'
);

select * from finish();
rollback;
