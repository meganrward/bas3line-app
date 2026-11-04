-- Make the WooCommerce webhook idempotent: one sale row per order.
-- Retried webhooks previously created duplicate rows (and so duplicate commission).

-- Keep the earliest row for any order that was already recorded more than once.
DELETE FROM public.discount_code_sales sale
USING public.discount_code_sales earlier
WHERE sale.order_id = earlier.order_id
  AND (sale.created_at, sale.id) > (earlier.created_at, earlier.id);

ALTER TABLE public.discount_code_sales
  ADD CONSTRAINT discount_code_sales_order_id_key UNIQUE (order_id);
