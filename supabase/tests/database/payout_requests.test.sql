-- pgTAP: payout requests (cash or kit) and the functions that move them along.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.
-- Seed gives ambassador2 one sale (DEV-1003). Amounts below are measured against their
-- starting balance rather than hard-coded.

begin;
select plan(31);

create temp table start_balance as
select coalesce(sum(amount), 0) as amount
  from public.commission_ledger
 where ambassador_id = '00000000-0000-0000-0000-000000000003';
grant select on start_balance to authenticated;

-- A payout entry must come from a request.
select throws_ok(
  $$insert into public.commission_ledger (ambassador_id, entry_type, amount) values ('00000000-0000-0000-0000-000000000003', 'cash_payout', -5)$$,
  '23514',
  null,
  'a payout ledger entry must point at a request'
);

select is(
  has_function_privilege('anon', 'public.request_payout(text, numeric, text)', 'execute')
    or has_function_privilege('anon', 'public.approve_payout(uuid)', 'execute'),
  false,
  'signed-out visitors cannot call the payout functions'
);

-- ── As ambassador2 ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  public.my_available_balance(),
  (select amount from start_balance),
  'available balance starts at the ledger balance'
);

select lives_ok(
  $$select public.request_payout('cash', 10.00, 'Bank transfer please')$$,
  'an ambassador can request a cash payout'
);

select is(
  public.my_available_balance(),
  (select amount from start_balance) - 10,
  'a pending request is held against the available balance'
);

select throws_ok(
  $$select public.request_payout('cash', 1000000.00)$$,
  'P0001',
  'Amount is more than your available balance',
  'cannot request more than the available balance'
);

select throws_ok(
  $$select public.request_payout('voucher', 1.00)$$,
  'P0001',
  'Request type must be cash or kit',
  'only cash or kit are valid'
);

select throws_ok(
  $$select public.request_payout('cash', 0)$$,
  'P0001',
  'Amount must be a positive number of pounds and pence',
  'zero is rejected'
);

select throws_ok(
  $$select public.request_payout('cash', 1.005)$$,
  'P0001',
  'Amount must be a positive number of pounds and pence',
  'fractions of a penny are rejected'
);

select throws_ok(
  $$insert into public.payout_requests (ambassador_id, request_type, amount) values ('00000000-0000-0000-0000-000000000003', 'cash', 1)$$,
  '42501',
  null,
  'requests cannot be written directly'
);

select throws_ok(
  $$select public.approve_payout((select id from public.payout_requests limit 1))$$,
  '42501',
  'Only sponsor staff can approve payouts',
  'an ambassador cannot approve their own request'
);

-- ── As ambassador1 ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.payout_requests),
  0,
  'another ambassador cannot see the request'
);

-- ── As the sponsor ───────────────────────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.payout_requests where status = 'pending'),
  1,
  'the sponsor sees the pending request'
);

select lives_ok(
  $$select public.approve_payout((select id from public.payout_requests where status = 'pending'))$$,
  'the sponsor can approve it'
);

select is(
  (select amount from public.commission_ledger where entry_type = 'cash_payout'
    and ambassador_id = '00000000-0000-0000-0000-000000000003'),
  -10.00,
  'approval debits the ledger'
);

select throws_ok(
  $$select public.approve_payout((select id from public.payout_requests where status = 'approved'))$$,
  'P0001',
  'Only a pending request can be approved',
  'a request cannot be approved twice'
);

select throws_ok(
  $$select public.reject_payout((select id from public.payout_requests where status = 'approved'))$$,
  'P0001',
  'Only a pending request can be rejected',
  'an approved request cannot be rejected'
);

select lives_ok(
  $$select public.mark_payout_paid((select id from public.payout_requests where status = 'approved'))$$,
  'the sponsor can mark an approved request paid'
);

select is(
  (select status from public.payout_requests),
  'paid',
  'and it is now paid'
);

-- ── Kit is a discount worth commission times the sponsor's multiplier ────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(public.my_kit_credit_multiplier(), 1.00, 'kit credit is £1 for £1 by default');

select public.request_payout('kit', 4.00, 'T-shirt');
select is(
  (select kit_credit_value from public.payout_requests where request_type = 'kit' and amount = 4.00),
  4.00,
  'a kit request is worth exactly the commission spent at the default rate'
);
select is(
  (select kit_credit_value from public.payout_requests where request_type = 'cash' limit 1),
  null,
  'a cash request has no kit value'
);

reset role;
update public.sponsors set kit_credit_multiplier = 1.25;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(public.my_kit_credit_multiplier(), 1.25, 'the ambassador sees the boosted rate');

select public.request_payout('kit', 8.00, 'Shorts');
select is(
  (select kit_credit_value from public.payout_requests where amount = 8.00),
  10.00,
  'a boosted kit request is worth more than the commission spent'
);
select is(
  (select kit_credit_value from public.payout_requests where amount = 4.00),
  4.00,
  'earlier requests keep the rate they were made at'
);

reset role;
select throws_ok(
  $$update public.sponsors set kit_credit_multiplier = 0.5$$,
  '23514',
  null,
  'the multiplier cannot be below 1'
);

-- Clear the two kit requests so the rest of this file starts from one paid cash request.
delete from public.payout_requests where request_type = 'kit';
set local role authenticated;

-- ── Rejecting leaves the ledger alone ────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select public.request_payout('kit', 5.00, 'Nox AT10 grip');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select public.reject_payout((select id from public.payout_requests where status = 'pending'), 'Out of stock');

select is(
  (select count(*)::int from public.commission_ledger where entry_type = 'kit_credit'),
  0,
  'a rejected request never touches the ledger'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  public.my_available_balance(),
  (select amount from start_balance) - 10,
  'and the held amount is released'
);

-- ── A refund after asking ────────────────────────────────────────────────────
-- Ask for everything available, then have the original sale refunded before approval.
select public.request_payout('cash', public.my_available_balance());

reset role;
update public.discount_code_sales set status = 'refunded', refunded_at = now()
 where order_id = 'DEV-1003';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_like(
  $$select public.approve_payout((select id from public.payout_requests where status = 'pending'))$$,
  'Amount is more than their current balance%',
  'approval re-checks the balance, so a refund cannot be paid out twice'
);

select is(
  (select count(*)::int from public.payout_requests where status = 'pending'),
  1,
  'and the request stays pending for the sponsor to deal with'
);

-- Nothing in the ledger changed for the failed approval (still just the one cash payout).
select is(
  (select count(*)::int from public.commission_ledger
    where ambassador_id = '00000000-0000-0000-0000-000000000003'
      and entry_type in ('cash_payout', 'kit_credit')),
  1,
  'the failed approval wrote nothing to the ledger'
);

select * from finish();
rollback;
