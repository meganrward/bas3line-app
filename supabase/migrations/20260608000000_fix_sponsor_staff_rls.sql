-- The original sponsor_staff SELECT policy was self-referential (its subquery
-- read from sponsor_staff to determine access to sponsor_staff), causing it to
-- silently return no rows. Replace with a non-recursive policy.

drop policy if exists "sponsor_staff: read own sponsor" on public.sponsor_staff;

-- Each staff member can read their own record.
-- The security definer current_user_role() check lets sponsors
-- read all staff at their sponsor without recursion.
create policy "sponsor_staff: read" on public.sponsor_staff
  for select using (
    user_id = auth.uid()
    or public.current_user_role() = 'sponsor'
  );
