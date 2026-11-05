-- Undo an approval that was given by mistake (or to re-run a demo).
--
-- The ledger is append-only, so undoing means adding a positive 'payout_reversal' entry that
-- cancels the original debit, and putting the request back to pending. Both happen in one
-- transaction. Only an approved request can be undone: once it is marked paid the money has
-- gone, so that is final.
--
-- An approval can now be given more than once for the same request (approve, undo, approve),
-- so the one-ledger-entry-per-request rule goes. The status checks in the payout functions,
-- which lock the request row, are what stop a double debit.

alter table public.commission_ledger
  drop constraint commission_ledger_entry_type_check,
  drop constraint commission_ledger_amount_sign,
  drop constraint commission_ledger_payout_link,
  drop constraint commission_ledger_payout_request_id_key;

alter table public.commission_ledger
  add constraint commission_ledger_entry_type_check check (
    entry_type in ('sale_commission', 'refund_reversal', 'cash_payout', 'kit_credit', 'payout_reversal')
  ),
  -- Earnings and undone payouts add to the balance; refunds and payouts take away.
  add constraint commission_ledger_amount_sign check (
    (entry_type in ('sale_commission', 'payout_reversal') and amount > 0)
    or (entry_type not in ('sale_commission', 'payout_reversal') and amount < 0)
  ),
  add constraint commission_ledger_payout_link check (
    (entry_type in ('cash_payout', 'kit_credit', 'payout_reversal')) = (payout_request_id is not null)
  );

create index commission_ledger_payout_request_idx
  on public.commission_ledger (payout_request_id) where payout_request_id is not null;

-- An undone payout no longer counts as paid out.
create or replace view public.commission_balance
with (security_invoker = true) as
select
  ambassador_id,
  sum(amount) filter (where entry_type in ('sale_commission', 'refund_reversal')) as total_earned,
  -sum(amount) filter (where entry_type in ('cash_payout', 'kit_credit', 'payout_reversal')) as total_paid_out,
  sum(amount) as balance
from public.commission_ledger
group by ambassador_id;

create function public.undo_payout_approval(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.payout_requests;
begin
  if not public.is_sponsor_or_staff() then
    raise exception 'Only sponsor staff can undo an approval' using errcode = '42501';
  end if;

  select * into request from public.payout_requests where id = p_request_id for update;
  if not found then
    raise exception 'Payout request not found';
  end if;
  if request.status <> 'approved' then
    raise exception 'Only an approved request can be undone (a paid one is final)';
  end if;

  perform 1 from public.ambassador_profiles where id = request.ambassador_id for update;

  insert into public.commission_ledger (ambassador_id, entry_type, amount, payout_request_id)
  values (request.ambassador_id, 'payout_reversal', request.amount, request.id);

  update public.payout_requests
     set status = 'pending', reviewed_by = null, reviewed_at = null
   where id = request.id;
end;
$$;

revoke all on function public.undo_payout_approval(uuid) from public, anon;
grant execute on function public.undo_payout_approval(uuid) to authenticated;
