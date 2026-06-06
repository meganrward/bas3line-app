-- Atomically redeem a voucher: mark it used and deduct points from the athlete.
-- Returns an error message string on failure, null on success.
create or replace function public.redeem_voucher(voucher_id uuid)
returns text language plpgsql security definer as $$
declare
  v_points_required int;
  v_athlete_balance int;
  v_athlete_id uuid := auth.uid();
begin
  -- Lock the voucher row to prevent concurrent redemptions
  select points_required into v_points_required
  from public.voucher_codes
  where id = voucher_id and is_used = false
  for update;

  if not found then
    return 'Voucher is no longer available.';
  end if;

  -- Check athlete balance
  select points_balance into v_athlete_balance
  from public.athlete_profiles
  where id = v_athlete_id;

  if v_athlete_balance < v_points_required then
    return 'Insufficient points.';
  end if;

  -- Claim the voucher
  update public.voucher_codes
  set is_used = true, used_by = v_athlete_id, used_at = now()
  where id = voucher_id;

  -- Deduct points
  update public.athlete_profiles
  set points_balance = points_balance - v_points_required
  where id = v_athlete_id;

  -- Record the transaction
  insert into public.points_transactions (athlete_id, points, description)
  values (v_athlete_id, -v_points_required, 'Voucher redeemed');

  return null; -- null = success
end;
$$;
