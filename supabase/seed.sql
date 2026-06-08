-- ============================================================
-- Bas3line — Demo seed data
-- Run this in the Supabase SQL editor AFTER running `supabase db push`
-- and AFTER creating your sponsor user account.
-- ============================================================

do $$
declare
  v_sponsor_id uuid;
  v_user_id    uuid;
begin
  select id into v_sponsor_id from public.sponsors where name = 'Bas3line' limit 1;

  if v_sponsor_id is null then
    raise exception 'Sponsor not found. Make sure supabase db push has been run first.';
  end if;

  -- ── Sponsor staff ───────────────────────────────────────────────────────────
  -- Links your personal login to the Bas3line sponsor with the manager role.
  -- Replace the email below with the email you used to create your account.
  select id into v_user_id from public.profiles
  where id in (select id from auth.users where email = 'wardmegan98@gmail.com')
  limit 1;

  if v_user_id is not null then
    insert into public.sponsor_staff (user_id, sponsor_id, staff_role)
    values (v_user_id, v_sponsor_id, 'manager')
    on conflict (user_id, sponsor_id) do nothing;
  else
    raise notice 'Sponsor user not found — skipping sponsor_staff insert. Run manually after creating your account.';
  end if;

  -- ── Sponsorship packages ────────────────────────────────────────────────────
  insert into public.sponsorship_packages (sponsor_id, name, description) values
    (v_sponsor_id, 'Elite Player', 'Full kit, racket, and travel support'),
    (v_sponsor_id, 'Player',       'Full kit and racket sponsorship'),
    (v_sponsor_id, 'Coach',        'Full kit, racket sponsorship, demo rackets')
  on conflict do nothing;

  -- ── Post types ──────────────────────────────────────────────────────────────
  insert into public.post_types (sponsor_id, name, points_value, description, is_active) values
    (v_sponsor_id, 'Instagram Post',    10, 'A feed post featuring Bas3line products',         true),
    (v_sponsor_id, 'Instagram Reel',    20, 'A short video reel featuring Bas3line products',  true),
    (v_sponsor_id, 'Instagram Story',    5, 'A story featuring Bas3line products',             true),
    (v_sponsor_id, 'Tournament Result', 15, 'Share your result from a sanctioned tournament',  true),
    (v_sponsor_id, 'Training Video',    10, 'A training session video featuring Bas3line gear',true),
    (v_sponsor_id, 'YouTube Video',     25, 'A YouTube video featuring Bas3line products',     true)
  on conflict do nothing;

  -- ── Voucher codes ───────────────────────────────────────────────────────────
  insert into public.voucher_codes (sponsor_id, code, description, points_required) values
    (v_sponsor_id, 'BAS10',   '10% off your next order',          50),
    (v_sponsor_id, 'BAS20',   '20% off your next order',         100),
    (v_sponsor_id, 'BAS30',   '30% off your next order',         200),
    (v_sponsor_id, 'BASFREE', 'Free shipping on your next order', 30)
  on conflict do nothing;

end $$;
