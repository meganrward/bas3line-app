-- ============================================================
-- Bas3line — Demo seed data
-- Run this in the Supabase SQL editor AFTER running `supabase db push`
-- and AFTER creating your sponsor user account.
-- ============================================================

-- Grab the sponsor id (inserted by schema.sql)
do $$
declare
  v_sponsor_id uuid;
begin
  select id into v_sponsor_id from public.sponsors where name = 'Bas3line' limit 1;

  if v_sponsor_id is null then
    raise exception 'Sponsor not found. Make sure supabase db push has been run first.';
  end if;

  -- Sponsorship packages
  insert into public.sponsorship_packages (sponsor_id, name, description) values
    (v_sponsor_id, 'Elite Player',       'Full kit, racket, and travel support'),
    (v_sponsor_id, 'Player',         'Full kit and racket sponsorship'),
    (v_sponsor_id, 'Coach', 'Full kit, racket sponsorship, demo rackets')
  on conflict do nothing;

  -- Post types
  insert into public.post_types (sponsor_id, name, points_value, description, is_active) values
    (v_sponsor_id, 'Instagram Post',   10, 'A feed post featuring Bas3line products',          true),
    (v_sponsor_id, 'Instagram Reel',   20, 'A short video reel featuring Bas3line products',   true),
    (v_sponsor_id, 'Instagram Story',   5, 'A story featuring Bas3line products',              true),
    (v_sponsor_id, 'Tournament Result', 15, 'Share your result from a sanctioned tournament',  true),
    (v_sponsor_id, 'Training Video',   10, 'A training session video featuring Bas3line gear', true),
    (v_sponsor_id, 'YouTube Video',    25, 'A YouTube video featuring Bas3line products',      true)
  on conflict do nothing;

  -- Sample voucher codes
  insert into public.voucher_codes (sponsor_id, code, description, points_required) values
    (v_sponsor_id, 'BAS10', '10% off your next order',  50),
    (v_sponsor_id, 'BAS20', '20% off your next order', 100),
    (v_sponsor_id, 'BAS30', '30% off your next order', 200),
    (v_sponsor_id, 'BASFREE', 'Free shipping on your next order', 30)
  on conflict do nothing;

end $$;
