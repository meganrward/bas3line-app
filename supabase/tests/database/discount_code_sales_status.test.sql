-- pgTAP: sale status and refunds on discount_code_sales.
-- Seed users: ...0001 sponsor staff, ...0002 ambassador1, ...0003 ambassador2.

begin;
select plan(5);

insert into public.discount_code_sales
  (ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date)
values
  ('00000000-0000-0000-0000-000000000002', 'code1', 'status-test-1', 100, 10, now());

select is(
  (select status from public.discount_code_sales where order_id = 'status-test-1'),
  'completed',
  'a new sale defaults to completed'
);

select throws_ok(
  $$update public.discount_code_sales set status = 'refunded' where order_id = 'status-test-1'$$,
  '23514',
  null,
  'refunded status requires a refund time'
);

select throws_ok(
  $$update public.discount_code_sales set status = 'lost' where order_id = 'status-test-1'$$,
  '23514',
  null,
  'unknown statuses are rejected'
);

-- ── As the webhook (service role) ────────────────────────────────────────────
set local role service_role;

select lives_ok(
  $$update public.discount_code_sales set status = 'refunded', refunded_at = now() where order_id = 'status-test-1'$$,
  'the webhook can mark a sale refunded'
);

-- ── As ambassador1 ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

-- Silently filtered: no update policy applies to ambassadors.
update public.discount_code_sales set status = 'completed', refunded_at = null where order_id = 'status-test-1';

select is(
  (select status from public.discount_code_sales where order_id = 'status-test-1'),
  'refunded',
  'the ambassador sees the refund and cannot undo it'
);

select * from finish();
rollback;
