-- Add discount code tracking fields to ambassador profiles
ALTER TABLE public.ambassador_profiles
  ADD COLUMN discount_code   text unique,
  ADD COLUMN commission_rate numeric(5,2) default 10.00;

-- Sales recorded from WordPress WooCommerce webhook
CREATE TABLE public.discount_code_sales (
  id                uuid primary key default gen_random_uuid(),
  ambassador_id     uuid references public.ambassador_profiles(id) on delete cascade not null,
  discount_code     text not null,
  order_id          text not null,
  order_total       numeric(10,2) not null,
  commission_amount numeric(10,2) not null,
  sale_date         timestamptz not null,
  created_at        timestamptz default now()
);

ALTER TABLE public.discount_code_sales ENABLE ROW LEVEL SECURITY;

-- Sponsors and staff see all sales for their ambassadors
CREATE POLICY "discount_code_sales: sponsor read" ON public.discount_code_sales
  FOR SELECT USING (public.is_sponsor_or_staff());

-- Ambassadors can see their own sales
CREATE POLICY "discount_code_sales: ambassador read own" ON public.discount_code_sales
  FOR SELECT USING (ambassador_id = auth.uid());

GRANT SELECT, INSERT ON public.discount_code_sales TO service_role;
GRANT SELECT ON public.discount_code_sales TO authenticated;
GRANT SELECT, UPDATE ON public.ambassador_profiles TO service_role;
