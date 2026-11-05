-- Commission ledger: the single record of money an ambassador has earned and had paid out.
--
--   * Append-only. A balance is the sum of entries, never a stored number. Corrections are
--     new entries, not edits.
--   * Sales write entries automatically: +commission when a sale is recorded, and a matching
--     reversal if it is later refunded (commission accrues on sale; no return-window hold).
--   * Payouts (cash or kit) arrive in the next migration as ledger debits via sponsor-approved
--     requests. Kit credit converts at face value: £1 of commission = £1 of kit.
-- Ambassadors read only their own entries. Nobody writes from the app; triggers and, later,
-- security-definer functions are the only writers.

create table public.commission_ledger (
  id            uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassador_profiles(id) on delete cascade,
  entry_type    text not null
                check (entry_type in ('sale_commission', 'refund_reversal', 'cash_payout', 'kit_credit')),
  amount        numeric(10,2) not null,
  sale_id       uuid references public.discount_code_sales(id),
  created_at    timestamptz not null default now(),

  -- Earnings are positive; reversals and payouts take money out.
  constraint commission_ledger_amount_sign check (
    (entry_type = 'sale_commission' and amount > 0)
    or (entry_type <> 'sale_commission' and amount < 0)
  ),
  -- Sale entries point at their sale; payout entries do not.
  constraint commission_ledger_sale_link check (
    (entry_type in ('sale_commission', 'refund_reversal')) = (sale_id is not null)
  )
);

-- A sale earns once and reverses once, however often the webhook retries.
create unique index commission_ledger_one_entry_per_sale
  on public.commission_ledger (sale_id, entry_type)
  where sale_id is not null;

create index commission_ledger_ambassador_idx
  on public.commission_ledger (ambassador_id, created_at desc);

alter table public.commission_ledger enable row level security;

create policy "commission_ledger: sponsor read" on public.commission_ledger
  for select using (public.is_sponsor_or_staff());

create policy "commission_ledger: ambassador read own" on public.commission_ledger
  for select using (ambassador_id = auth.uid());

-- Read-only for everyone signed in. Writes happen only through the functions below.
revoke all on public.commission_ledger from anon, authenticated;
grant select on public.commission_ledger to authenticated, service_role;

-- History is never edited. Cascading deletes (removing an ambassador) are allowed because
-- they run one trigger level deeper than a direct DELETE.
create function public.commission_ledger_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' or pg_trigger_depth() = 1 then
    raise exception 'commission_ledger is append-only';
  end if;
  return old;
end;
$$;

create trigger commission_ledger_append_only
  before update or delete on public.commission_ledger
  for each row execute function public.commission_ledger_append_only();

-- ── Sales write the ledger ───────────────────────────────────────────────────

create function public.ledger_record_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.commission_amount > 0 then
    insert into public.commission_ledger (ambassador_id, entry_type, amount, sale_id)
    values (new.ambassador_id, 'sale_commission', new.commission_amount, new.id)
    on conflict do nothing;
  end if;

  if new.status = 'refunded' and new.commission_amount > 0
     and (tg_op = 'INSERT' or old.status is distinct from 'refunded') then
    insert into public.commission_ledger (ambassador_id, entry_type, amount, sale_id)
    values (new.ambassador_id, 'refund_reversal', -new.commission_amount, new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.ledger_record_sale() from public, anon, authenticated;

create trigger discount_code_sales_ledger
  after insert or update of status on public.discount_code_sales
  for each row execute function public.ledger_record_sale();

-- Sales recorded before the ledger existed.
insert into public.commission_ledger (ambassador_id, entry_type, amount, sale_id)
select ambassador_id, 'sale_commission', commission_amount, id
  from public.discount_code_sales
 where commission_amount > 0
on conflict do nothing;

insert into public.commission_ledger (ambassador_id, entry_type, amount, sale_id)
select ambassador_id, 'refund_reversal', -commission_amount, id
  from public.discount_code_sales
 where status = 'refunded' and commission_amount > 0
on conflict do nothing;

-- ── Balances ─────────────────────────────────────────────────────────────────
-- security_invoker: the view applies the caller's own row-level security, so an ambassador
-- sees only their own row. An ambassador with no entries has no row (the app treats it as 0).

create view public.commission_balance
with (security_invoker = true) as
select
  ambassador_id,
  sum(amount) filter (where entry_type in ('sale_commission', 'refund_reversal')) as total_earned,
  -sum(amount) filter (where entry_type in ('cash_payout', 'kit_credit')) as total_paid_out,
  sum(amount) as balance
from public.commission_ledger
group by ambassador_id;

revoke all on public.commission_balance from anon;
grant select on public.commission_balance to authenticated, service_role;
