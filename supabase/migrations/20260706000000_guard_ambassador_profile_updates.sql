-- Ambassadors could previously update every column of their own ambassador_profiles
-- row (table-wide UPDATE grant + "own update" policy), including commission_rate,
-- discount_code and sponsor_id. Column grants can't separate sponsors from ambassadors
-- (both use the `authenticated` role), so enforce an allow-list with a trigger.

create or replace function public.guard_ambassador_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- Columns an ambassador may change on their own profile.
  -- Redefine this function to widen the list; everything else stays sponsor-only.
  editable_columns constant text[] := array['bio', 'training_location'];
begin
  -- No auth.uid() means service role, a migration or the seed. Sponsors and staff
  -- may edit anything.
  if auth.uid() is null or public.is_sponsor_or_staff() then
    return new;
  end if;

  if (to_jsonb(new) - editable_columns) is distinct from (to_jsonb(old) - editable_columns) then
    raise exception 'Ambassadors can only edit: %', array_to_string(editable_columns, ', ')
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger guard_ambassador_profile_update
  before update on public.ambassador_profiles
  for each row execute function public.guard_ambassador_profile_update();
