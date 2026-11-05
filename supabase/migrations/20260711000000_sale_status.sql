-- Sales can be refunded. The row stays (it is the audit trail) and is marked refunded;
-- refunded sales are excluded from commission totals in the app.
-- The WooCommerce webhook (service role) is the only writer.

alter table public.discount_code_sales
  add column status text not null default 'completed'
    check (status in ('completed', 'refunded')),
  add column refunded_at timestamptz;

-- Only a refunded sale carries a refund time.
alter table public.discount_code_sales
  add constraint discount_code_sales_refund_time_matches_status
    check ((status = 'refunded') = (refunded_at is not null));

