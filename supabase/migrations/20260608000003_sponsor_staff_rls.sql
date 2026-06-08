-- All RLS policies that checked current_user_role() = 'sponsor' only matched users
-- whose profiles.role = 'sponsor'. With the sponsor_staff architecture, sponsor users
-- are identified by their presence in sponsor_staff, and their profiles.role may not
-- be 'sponsor'. This migration adds a helper that accepts either and re-creates all
-- affected policies.

create or replace function public.is_sponsor_or_staff()
returns boolean language sql security definer stable as $$
  select (
    coalesce((select role from public.profiles where id = auth.uid()), '') = 'sponsor'
    or exists(select 1 from public.sponsor_staff where user_id = auth.uid())
  );
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
drop policy if exists "profiles: sponsor read" on public.profiles;
create policy "profiles: sponsor read" on public.profiles
  for select using (id = auth.uid() or public.is_sponsor_or_staff());

-- ── athlete_profiles ─────────────────────────────────────────────────────────
drop policy if exists "athlete_profiles: own read" on public.athlete_profiles;
create policy "athlete_profiles: own read" on public.athlete_profiles
  for select using (id = auth.uid() or public.is_sponsor_or_staff());

drop policy if exists "athlete_profiles: own update" on public.athlete_profiles;
create policy "athlete_profiles: own update" on public.athlete_profiles
  for update using (id = auth.uid() or public.is_sponsor_or_staff());

drop policy if exists "athlete_profiles: sponsor insert" on public.athlete_profiles;
create policy "athlete_profiles: sponsor insert" on public.athlete_profiles
  for insert with check (public.is_sponsor_or_staff());

-- ── sponsors ─────────────────────────────────────────────────────────────────
drop policy if exists "sponsors: sponsor write" on public.sponsors;
create policy "sponsors: sponsor write" on public.sponsors
  for all using (public.is_sponsor_or_staff());

-- ── sponsorship_packages ─────────────────────────────────────────────────────
drop policy if exists "packages: sponsor write" on public.sponsorship_packages;
create policy "packages: sponsor write" on public.sponsorship_packages
  for all using (public.is_sponsor_or_staff());

-- ── post_types ───────────────────────────────────────────────────────────────
drop policy if exists "post_types: sponsor write" on public.post_types;
create policy "post_types: sponsor write" on public.post_types
  for all using (public.is_sponsor_or_staff());

-- ── posts ────────────────────────────────────────────────────────────────────
drop policy if exists "posts: athlete read own" on public.posts;
create policy "posts: athlete read own" on public.posts
  for select using (athlete_id = auth.uid() or public.is_sponsor_or_staff());

drop policy if exists "posts: sponsor update" on public.posts;
create policy "posts: sponsor update" on public.posts
  for update using (public.is_sponsor_or_staff());

-- ── points_transactions ──────────────────────────────────────────────────────
drop policy if exists "points_tx: read" on public.points_transactions;
create policy "points_tx: read" on public.points_transactions
  for select using (athlete_id = auth.uid() or public.is_sponsor_or_staff());

-- ── voucher_codes ────────────────────────────────────────────────────────────
drop policy if exists "vouchers: athlete read available" on public.voucher_codes;
create policy "vouchers: athlete read available" on public.voucher_codes
  for select using (
    public.is_sponsor_or_staff()
    or (
      public.current_user_role() = 'athlete'
      and (is_used = false or used_by = auth.uid())
    )
  );

drop policy if exists "vouchers: athlete redeem" on public.voucher_codes;
create policy "vouchers: athlete redeem" on public.voucher_codes
  for update using (
    public.is_sponsor_or_staff()
    or (public.current_user_role() = 'athlete' and is_used = false)
  );

drop policy if exists "vouchers: sponsor insert" on public.voucher_codes;
create policy "vouchers: sponsor insert" on public.voucher_codes
  for insert with check (public.is_sponsor_or_staff());

-- ── sponsor_staff ─────────────────────────────────────────────────────────────
drop policy if exists "sponsor_staff: read own" on public.sponsor_staff;
create policy "sponsor_staff: read own" on public.sponsor_staff
  for select using (user_id = auth.uid() or public.is_sponsor_or_staff());
