-- ============================================================
-- Bas3line — LOCAL development seed data
-- Applied automatically by `supabase start` / `supabase db reset`.
-- Never run this against the hosted project: it creates users with
-- a known password.
--
-- Logins (password for all: password123)
--   sponsor@bas3line.test     — sponsor staff
--   ambassador1@bas3line.test — ambassador
--   ambassador2@bas3line.test — ambassador
-- ============================================================

do $$
declare
  v_sponsor_id uuid;
  v_user       record;
begin
  select id into v_sponsor_id from public.sponsors where name = 'Bas3line' limit 1;

  if v_sponsor_id is null then
    raise exception 'Sponsor not found. Make sure the initial schema migration has run.';
  end if;

  -- ── Auth users ──────────────────────────────────────────────────────────────
  -- handle_new_user() creates the matching profiles row from raw_user_meta_data.
  for v_user in
    select * from (values
      ('00000000-0000-0000-0000-000000000001'::uuid, 'sponsor@bas3line.test',     'sponsor',    'Dev Sponsor'),
      ('00000000-0000-0000-0000-000000000002'::uuid, 'ambassador1@bas3line.test', 'ambassador', 'Alex Ambassador'),
      ('00000000-0000-0000-0000-000000000003'::uuid, 'ambassador2@bas3line.test', 'ambassador', 'Sam Ambassador')
    ) as seeded_users(id, email, role, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('role', v_user.role, 'full_name', v_user.full_name),
      now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user.id, v_user.id::text, 'email',
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email),
      now(), now(), now()
    ) on conflict do nothing;
  end loop;

  -- ── Sponsor staff ───────────────────────────────────────────────────────────
  insert into public.sponsor_staff (user_id, sponsor_id, staff_role)
  values ('00000000-0000-0000-0000-000000000001', v_sponsor_id, 'manager')
  on conflict (user_id, sponsor_id) do nothing;

  -- ── Ambassador profiles ─────────────────────────────────────────────────────
  insert into public.ambassador_profiles (
    id, sponsor_id, clubs, training_location, racket_model, instagram_handle,
    bio, gender, discount_code, commission_rate
  ) values
    ('00000000-0000-0000-0000-000000000002', v_sponsor_id, 'Padel Club London', 'London',
     'Bullpadel Vertex', 'alex.padel', 'Local dev ambassador.', 'female', 'ALEX10', 10.00),
    ('00000000-0000-0000-0000-000000000003', v_sponsor_id, 'Padel Club Leeds', 'Leeds',
     'Nox AT10', 'sam.padel', 'Local dev ambassador.', 'male', 'SAM10', 12.50)
  on conflict (id) do nothing;

  -- ── Sample sales ────────────────────────────────────────────────────────────
  insert into public.discount_code_sales (
    ambassador_id, discount_code, order_id, order_total, commission_amount, sale_date
  ) values
    ('00000000-0000-0000-0000-000000000002', 'ALEX10', 'DEV-1001', 120.00, 12.00, now() - interval '3 days'),
    ('00000000-0000-0000-0000-000000000002', 'ALEX10', 'DEV-1002',  80.00,  8.00, now() - interval '1 day'),
    ('00000000-0000-0000-0000-000000000003', 'SAM10',  'DEV-1003', 200.00, 25.00, now() - interval '2 days')
  on conflict do nothing;

  -- ── Padel clubs, team roles and home clubs ──────────────────────────────────
  insert into public.padel_clubs (name, town, region) values
    ('Padel Club London', 'London', 'Greater London'),
    ('Padel Club Leeds',  'Leeds',  'Yorkshire and the Humber')
  on conflict do nothing;

  update public.ambassador_profiles
     set team_role = 'Ambassador',
         home_club_id = (select id from public.padel_clubs where name = 'Padel Club London')
   where id = '00000000-0000-0000-0000-000000000002';

  update public.ambassador_profiles
     set team_role = 'Team captain',
         home_club_id = (select id from public.padel_clubs where name = 'Padel Club Leeds')
   where id = '00000000-0000-0000-0000-000000000003';
end $$;
