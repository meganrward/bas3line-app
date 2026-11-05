-- pgTAP: a refund that arrives before its sale is recorded as an already-refunded sale.
-- The commission earned and its reversal must net to zero, and a later "completed" webhook
-- for the same order must not add the commission back.
-- Seed users: ...0002 ambassador1.

begin;
select plan(3);

set local role service_role;

insert into public.discount_code_sales
  (ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date,
   status, refunded_at)
values
  ('00000000-0000-0000-0000-000000000002', 'code1', 'early-refund-1', 100, 10, now(),
   'refunded', now());

select is(
  (select sum(amount) from public.commission_ledger
    where sale_id = (select id from public.discount_code_sales where order_id = 'early-refund-1')),
  0.00,
  'an early refund earns and reverses the commission, netting to zero'
);

-- What the webhook does when the "completed" message for the same order arrives later.
insert into public.discount_code_sales
  (ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date)
values
  ('00000000-0000-0000-0000-000000000002', 'code1', 'early-refund-1', 100, 10, now())
on conflict (order_id) do nothing;

select is(
  (select count(*)::int from public.discount_code_sales where order_id = 'early-refund-1'),
  1,
  'the later completed webhook is ignored as a duplicate'
);

select is(
  (select status from public.discount_code_sales where order_id = 'early-refund-1'),
  'refunded',
  'the sale stays refunded'
);

select * from finish();
rollback;
