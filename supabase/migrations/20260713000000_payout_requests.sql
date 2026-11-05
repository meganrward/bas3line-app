-- Cash or kit payout requests.
--
-- An ambassador asks to turn commission into cash or kit; a sponsor approves or rejects
-- and pays manually outside the app (no payment provider). Approval is what writes the
-- debit to the commission ledger, so the ledger only ever contains money that was approved.
--
--   pending  -> approved -> paid
--   pending  -> rejected
--
-- Kit works as a discount: the ambassador spends commission and gets kit credit worth that
-- amount times the sponsor's kit_credit_multiplier. It is 1.00 today (£1 of commission = £1
-- of kit); raise it later (say 1.25) to reward taking kit over cash. The value is stored on
-- each request when it is made, so changing the multiplier never alters existing requests.
-- The ledger always debits the commission spent, never the boosted kit value.
--
-- Pending requests are held against the ambassador's balance, so they cannot request the
-- same money twice. A refund that lands after a payout can take the balance below zero;
-- nothing is clawed back, the negative balance simply offsets future commission.
-- Nobody writes these tables directly. Every change goes through the functions below.

alter table public.sponsors
  add column kit_credit_multiplier numeric(4,2) not null default 1.00
    check (kit_credit_multiplier >= 1);

create table public.payout_requests (
  id            uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassador_profiles(id) on delete cascade,
  request_type  text not null check (request_type in ('cash', 'kit')),
  amount        numeric(10,2) not null check (amount > 0),  -- commission spent
  kit_credit_value numeric(10,2),                           -- kit worth, kit requests only
  note          text check (char_length(note) <= 500),
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'paid', 'rejected')),
  sponsor_note  text check (char_length(sponsor_note) <= 500),
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),

  constraint payout_requests_kit_value check (
    (request_type = 'kit') = (kit_credit_value is not null)
  )
);

create index payout_requests_ambassador_idx
  on public.payout_requests (ambassador_id, created_at desc);
create index payout_requests_status_idx
  on public.payout_requests (status) where status in ('pending', 'approved');

alter table public.payout_requests enable row level security;

create policy "payout_requests: sponsor read" on public.payout_requests
  for select using (public.is_sponsor_or_staff());

create policy "payout_requests: ambassador read own" on public.payout_requests
  for select using (ambassador_id = auth.uid());

revoke all on public.payout_requests from anon, authenticated;
grant select on public.payout_requests to authenticated, service_role;

-- Each payout entry in the ledger points at the request that caused it, once.
alter table public.commission_ledger
  add column payout_request_id uuid unique references public.payout_requests(id);

alter table public.commission_ledger
  add constraint commission_ledger_payout_link check (
    (entry_type in ('cash_payout', 'kit_credit')) = (payout_request_id is not null)
  );

-- ── What an ambassador can still request ─────────────────────────────────────

create function public.my_available_balance()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(amount) from public.commission_ledger where ambassador_id = auth.uid()), 0)
    - coalesce((
        select sum(amount) from public.payout_requests
         where ambassador_id = auth.uid() and status = 'pending'
      ), 0);
$$;

-- What £1 of commission is worth as kit for the calling ambassador (1.00 if unset).
create function public.my_kit_credit_multiplier()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select sponsor.kit_credit_multiplier
      from public.ambassador_profiles ambassador
      join public.sponsors sponsor on sponsor.id = ambassador.sponsor_id
     where ambassador.id = auth.uid()
  ), 1.00);
$$;

-- ── Ambassador: ask for a payout ─────────────────────────────────────────────

create function public.request_payout(p_type text, p_amount numeric, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller        uuid := auth.uid();
  available     numeric;
  new_request   uuid;
begin
  -- Serialise this ambassador's requests so two taps cannot both pass the balance check.
  perform 1 from public.ambassador_profiles where id = caller for update;
  if not found then
    raise exception 'Only ambassadors can request a payout' using errcode = '42501';
  end if;

  if p_type not in ('cash', 'kit') then
    raise exception 'Request type must be cash or kit';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Amount must be a positive number of pounds and pence';
  end if;

  available := public.my_available_balance();
  if p_amount > available then
    raise exception 'Amount is more than your available balance';
  end if;

  insert into public.payout_requests (ambassador_id, request_type, amount, kit_credit_value, note)
  values (
    caller,
    p_type,
    p_amount,
    case p_type when 'kit' then round(p_amount * public.my_kit_credit_multiplier(), 2) end,
    nullif(btrim(p_note), '')
  )
  returning id into new_request;

  return new_request;
end;
$$;

-- ── Sponsor: review and pay ──────────────────────────────────────────────────

create function public.approve_payout(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request   public.payout_requests;
  balance   numeric;
begin
  if not public.is_sponsor_or_staff() then
    raise exception 'Only sponsor staff can approve payouts' using errcode = '42501';
  end if;

  select * into request from public.payout_requests where id = p_request_id for update;
  if not found then
    raise exception 'Payout request not found';
  end if;
  if request.status <> 'pending' then
    raise exception 'Only a pending request can be approved';
  end if;

  -- Lock the ambassador so their balance cannot move between the check and the debit.
  perform 1 from public.ambassador_profiles where id = request.ambassador_id for update;

  select coalesce(sum(amount), 0) into balance
    from public.commission_ledger where ambassador_id = request.ambassador_id;
  if request.amount > balance then
    raise exception 'Amount is more than their current balance (a refund may have landed since they asked)';
  end if;

  insert into public.commission_ledger (ambassador_id, entry_type, amount, payout_request_id)
  values (
    request.ambassador_id,
    case request.request_type when 'cash' then 'cash_payout' else 'kit_credit' end,
    -request.amount,
    request.id
  );

  update public.payout_requests
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = request.id;
end;
$$;

create function public.reject_payout(p_request_id uuid, p_sponsor_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_sponsor_or_staff() then
    raise exception 'Only sponsor staff can reject payouts' using errcode = '42501';
  end if;

  update public.payout_requests
     set status = 'rejected',
         sponsor_note = nullif(btrim(p_sponsor_note), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'Only a pending request can be rejected';
  end if;
end;
$$;

create function public.mark_payout_paid(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_sponsor_or_staff() then
    raise exception 'Only sponsor staff can mark payouts paid' using errcode = '42501';
  end if;

  update public.payout_requests
     set status = 'paid', paid_at = now()
   where id = p_request_id and status = 'approved';

  if not found then
    raise exception 'Only an approved request can be marked paid';
  end if;
end;
$$;

revoke all on function
  public.my_available_balance(),
  public.my_kit_credit_multiplier(),
  public.request_payout(text, numeric, text),
  public.approve_payout(uuid),
  public.reject_payout(uuid, text),
  public.mark_payout_paid(uuid)
from public, anon;

grant execute on function
  public.my_available_balance(),
  public.my_kit_credit_multiplier(),
  public.request_payout(text, numeric, text),
  public.approve_payout(uuid),
  public.reject_payout(uuid, text),
  public.mark_payout_paid(uuid)
to authenticated;
