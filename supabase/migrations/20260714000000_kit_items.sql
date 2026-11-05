-- Kit the sponsor offers ambassadors in exchange for commission, with a price each.
--
-- Choosing an item is optional on a kit request (the free-text note still works). When an
-- item is chosen the request keeps a copy of its name and price, so later edits or removal
-- of the item never change what was agreed. An item can be discounted by commission up to
-- its price, never beyond; the ambassador pays the rest on the store.
--
-- Sponsor staff manage the list. Ambassadors see only their sponsor's active items.

create table public.kit_items (
  id         uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  price      numeric(10,2) not null check (price > 0),
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index kit_items_sponsor_idx on public.kit_items (sponsor_id, sort_order, name);

alter table public.kit_items enable row level security;

create policy "kit_items: sponsor manage" on public.kit_items
  for all using (public.is_sponsor_or_staff()) with check (public.is_sponsor_or_staff());

create policy "kit_items: ambassador read active" on public.kit_items
  for select using (active and sponsor_id = public.current_ambassador_sponsor_id());

revoke all on public.kit_items from anon;
grant select, insert, update, delete on public.kit_items to authenticated;
grant select on public.kit_items to service_role;

-- What the request agreed to (copied, so it survives edits to the item).
alter table public.payout_requests
  add column kit_item_id    uuid references public.kit_items(id) on delete set null,
  add column kit_item_name  text,
  add column kit_item_price numeric(10,2);

alter table public.payout_requests
  add constraint payout_requests_kit_item_only_for_kit check (
    kit_item_id is null or request_type = 'kit'
  );

-- Replace request_payout with a version that accepts an optional kit item.
drop function public.request_payout(text, numeric, text);

create function public.request_payout(
  p_type        text,
  p_amount      numeric,
  p_note        text default null,
  p_kit_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller        uuid := auth.uid();
  available     numeric;
  kit_value     numeric;
  item          public.kit_items;
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

  if p_type = 'kit' then
    kit_value := round(p_amount * public.my_kit_credit_multiplier(), 2);

    if p_kit_item_id is not null then
      -- Row-level security applies inside this function only through the explicit checks.
      select * into item from public.kit_items
       where id = p_kit_item_id
         and active
         and sponsor_id = public.current_ambassador_sponsor_id();
      if not found then
        raise exception 'That kit item is not available';
      end if;
      if kit_value > item.price then
        raise exception 'That is more discount than the item costs';
      end if;
    end if;
  elsif p_kit_item_id is not null then
    raise exception 'A kit item can only be chosen on a kit request';
  end if;

  insert into public.payout_requests
    (ambassador_id, request_type, amount, kit_credit_value, note,
     kit_item_id, kit_item_name, kit_item_price)
  values (
    caller, p_type, p_amount, kit_value, nullif(btrim(p_note), ''),
    item.id, item.name, item.price
  )
  returning id into new_request;

  return new_request;
end;
$$;

revoke all on function public.request_payout(text, numeric, text, uuid) from public, anon;
grant execute on function public.request_payout(text, numeric, text, uuid) to authenticated;
