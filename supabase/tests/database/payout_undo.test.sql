-- pgTAP: undoing a payout approval.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(12);

create temp table start_balance as
select coalesce(sum(amount), 0) as amount
  from public.commission_ledger
 where ambassador_id = '00000000-0000-0000-0000-000000000003';
grant select on start_balance to authenticated;

-- ── Ambassador2 asks for £10 ─────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select public.request_payout('cash', 10.00);

select throws_ok(
  $$select public.undo_payout_approval((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'))$$,
  '42501',
  'Only sponsor staff can undo an approval',
  'an ambassador cannot undo an approval'
);

-- ── The sponsor approves, then undoes ────────────────────────────────────────
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.undo_payout_approval((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'))$$,
  'P0001',
  'Only an approved request can be undone (a paid one is final)',
  'a pending request has nothing to undo'
);

select public.approve_payout((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'));

select is(
  (select sum(amount) from public.commission_ledger
    where ambassador_id = '00000000-0000-0000-0000-000000000003'),
  (select amount from start_balance) - 10,
  'approval takes £10 off the balance'
);

select lives_ok(
  $$select public.undo_payout_approval((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'))$$,
  'the sponsor can undo an approval'
);

select is(
  (select status from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'),
  'pending',
  'the request goes back to pending'
);

select is(
  (select count(*)::int from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003' and (reviewed_by is not null or reviewed_at is not null)),
  0,
  'and the review details are cleared'
);

select is(
  (select sum(amount) from public.commission_ledger
    where ambassador_id = '00000000-0000-0000-0000-000000000003'),
  (select amount from start_balance),
  'the ledger balance is back where it started'
);

select is(
  (select amount from public.commission_ledger where entry_type = 'payout_reversal'),
  10.00,
  'by a reversing entry, so the original debit is still on record'
);

select is(
  (select total_paid_out from public.commission_balance
    where ambassador_id = '00000000-0000-0000-0000-000000000003'),
  0.00,
  'an undone payout no longer counts as paid out'
);

-- ── It can be approved again, and only once per round ────────────────────────
select lives_ok(
  $$select public.approve_payout((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'))$$,
  'the request can be approved again'
);

select is(
  (select sum(amount) from public.commission_ledger
    where ambassador_id = '00000000-0000-0000-0000-000000000003'),
  (select amount from start_balance) - 10,
  'and is debited once, not twice'
);

-- ── Paid is final ────────────────────────────────────────────────────────────
select public.mark_payout_paid((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'));

select throws_ok(
  $$select public.undo_payout_approval((select id from public.payout_requests where ambassador_id = '00000000-0000-0000-0000-000000000003'))$$,
  'P0001',
  'Only an approved request can be undone (a paid one is final)',
  'a paid request cannot be undone'
);

select * from finish();
rollback;
