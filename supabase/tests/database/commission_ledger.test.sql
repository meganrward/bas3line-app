-- pgTAP: the commission ledger is written by sales, read-only to users, and append-only.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(14);

-- Seed sales already created entries, so measure changes against the starting balance.
create temp table before_balance as
select coalesce(sum(amount), 0) as amount
  from public.commission_ledger
 where ambassador_id = '00000000-0000-0000-0000-000000000002';

insert into public.discount_code_sales
  (ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date)
values
  ('00000000-0000-0000-0000-000000000002', 'alex10', 'ledger-test-1', 100, 10, now());

select is(
  (select amount from public.commission_ledger
    where entry_type = 'sale_commission'
      and sale_id = (select id from public.discount_code_sales where order_id = 'ledger-test-1')),
  10.00,
  'a recorded sale earns its commission in the ledger'
);

update public.discount_code_sales set status = 'refunded', refunded_at = now()
 where order_id = 'ledger-test-1';

select is(
  (select amount from public.commission_ledger
    where entry_type = 'refund_reversal'
      and sale_id = (select id from public.discount_code_sales where order_id = 'ledger-test-1')),
  -10.00,
  'a refund reverses exactly that commission'
);

select is(
  (select coalesce(sum(amount), 0) from public.commission_ledger
    where ambassador_id = '00000000-0000-0000-0000-000000000002') - (select amount from before_balance),
  0.00,
  'earning then refunding nets to nothing'
);

update public.discount_code_sales set status = 'refunded', refunded_at = now()
 where order_id = 'ledger-test-1';

select is(
  (select count(*)::int from public.commission_ledger
    where sale_id = (select id from public.discount_code_sales where order_id = 'ledger-test-1')),
  2,
  'repeating a refund does not add entries'
);

insert into public.discount_code_sales
  (ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date, status, refunded_at)
values
  ('00000000-0000-0000-0000-000000000002', 'alex10', 'ledger-test-2', 50, 5, now(), 'refunded', now());

select is(
  (select count(*)::int from public.commission_ledger
    where sale_id = (select id from public.discount_code_sales where order_id = 'ledger-test-2')),
  2,
  'a sale recorded already refunded earns and reverses'
);

select throws_ok(
  $$insert into public.commission_ledger (ambassador_id, entry_type, amount) values ('00000000-0000-0000-0000-000000000002', 'cash_payout', 5)$$,
  '23514',
  null,
  'a payout cannot be positive'
);

select throws_ok(
  $$insert into public.commission_ledger (ambassador_id, entry_type, amount) values ('00000000-0000-0000-0000-000000000002', 'sale_commission', 5)$$,
  '23514',
  null,
  'a sale entry must point at a sale'
);

select throws_ok(
  $$update public.commission_ledger set amount = amount + 1$$,
  'P0001',
  'commission_ledger is append-only',
  'ledger entries cannot be edited'
);

select throws_ok(
  $$delete from public.commission_ledger$$,
  'P0001',
  'commission_ledger is append-only',
  'ledger entries cannot be deleted directly'
);

select lives_ok(
  $$delete from public.ambassador_profiles where id = '00000000-0000-0000-0000-000000000003'$$,
  'removing an ambassador still cascades through their ledger'
);

-- ── As ambassador1 ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.commission_ledger
    where ambassador_id <> '00000000-0000-0000-0000-000000000002'),
  0,
  'an ambassador sees only their own entries'
);

select is(
  (select count(*)::int from public.commission_balance),
  1,
  'and only their own balance row'
);

select throws_ok(
  $$insert into public.commission_ledger (ambassador_id, entry_type, amount) values ('00000000-0000-0000-0000-000000000002', 'cash_payout', -5)$$,
  '42501',
  null,
  'an ambassador cannot write to the ledger'
);

-- ── As the sponsor ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select cmp_ok(
  (select count(*)::int from public.commission_ledger
    where ambassador_id = '00000000-0000-0000-0000-000000000002'),
  '>=',
  4,
  'the sponsor sees ambassador entries too'
);

select * from finish();
rollback;
