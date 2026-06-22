-- ============================================================
-- Pivot: Athlete Portal → Ambassador Portal
-- ============================================================

-- ─── 1. Update profiles.role to use 'ambassador' instead of 'athlete' ──────────

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Temporarily allow both during data migration
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('sponsor', 'athlete', 'ambassador'));

UPDATE public.profiles SET role = 'ambassador' WHERE role = 'athlete';

-- Lock down to final set
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('sponsor', 'ambassador'));

-- ─── 2. Rename athlete_profiles → ambassador_profiles ───────────────────────────

ALTER TABLE public.athlete_profiles RENAME TO ambassador_profiles;

-- ─── 3. Add new columns to ambassador_profiles ──────────────────────────────────

ALTER TABLE public.ambassador_profiles
  ADD COLUMN IF NOT EXISTS fip_player_slug   text,
  ADD COLUMN IF NOT EXISTS lta_player_id     text,
  ADD COLUMN IF NOT EXISTS instagram_user_id text;

-- ─── 4. Rename athlete_id columns ───────────────────────────────────────────────

ALTER TABLE public.posts               RENAME COLUMN athlete_id TO ambassador_id;
ALTER TABLE public.points_transactions RENAME COLUMN athlete_id TO ambassador_id;

-- ─── 5. Drop archived tables ────────────────────────────────────────────────────
-- CASCADE removes FK constraints that other tables hold to these tables.
-- post_types CASCADE → drops posts.post_type_id FK (column stays, FK goes)
-- sponsorship_packages CASCADE → drops ambassador_profiles.package_id FK (column stays, FK goes)

DROP TABLE IF EXISTS public.voucher_codes       CASCADE;
DROP TABLE IF EXISTS public.points_transactions CASCADE;
DROP TABLE IF EXISTS public.post_types          CASCADE;
DROP TABLE IF EXISTS public.sponsorship_packages CASCADE;

-- ─── 6. Drop archived stored functions ──────────────────────────────────────────

DROP FUNCTION IF EXISTS public.approve_post(uuid);
DROP FUNCTION IF EXISTS public.redeem_voucher(uuid);

-- ─── 7. Update RLS policies on ambassador_profiles ──────────────────────────────
-- Policies survive a table rename but keep their old names — drop and recreate cleanly.

DROP POLICY IF EXISTS "athlete_profiles: own read"      ON public.ambassador_profiles;
DROP POLICY IF EXISTS "athlete_profiles: own update"    ON public.ambassador_profiles;
DROP POLICY IF EXISTS "athlete_profiles: sponsor insert" ON public.ambassador_profiles;

CREATE POLICY "ambassador_profiles: own read" ON public.ambassador_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_sponsor_or_staff());

CREATE POLICY "ambassador_profiles: own update" ON public.ambassador_profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_sponsor_or_staff());

CREATE POLICY "ambassador_profiles: sponsor insert" ON public.ambassador_profiles
  FOR INSERT WITH CHECK (public.is_sponsor_or_staff());

-- ─── 8. Update RLS policies on posts (ambassador_id column rename) ───────────────

DROP POLICY IF EXISTS "posts: athlete read own" ON public.posts;
DROP POLICY IF EXISTS "posts: athlete insert"   ON public.posts;

CREATE POLICY "posts: ambassador read own" ON public.posts
  FOR SELECT USING (ambassador_id = auth.uid() OR public.is_sponsor_or_staff());

CREATE POLICY "posts: ambassador insert" ON public.posts
  FOR INSERT WITH CHECK (ambassador_id = auth.uid());

-- ─── 9. Update helper functions ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_athlete_sponsor_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT sponsor_id FROM public.ambassador_profiles WHERE id = auth.uid();
$$;

-- New canonical name; old name kept above for backwards compat during transition
CREATE OR REPLACE FUNCTION public.current_ambassador_sponsor_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT sponsor_id FROM public.ambassador_profiles WHERE id = auth.uid();
$$;

-- Update handle_new_user trigger to default to 'ambassador' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    CASE COALESCE(new.raw_user_meta_data->>'role', 'ambassador')
      WHEN 'athlete' THEN 'ambassador'
      ELSE COALESCE(new.raw_user_meta_data->>'role', 'ambassador')
    END,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- ─── 10. Create ambassador_rankings cache table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ambassador_rankings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid REFERENCES public.ambassador_profiles(id) ON DELETE CASCADE NOT NULL,
  source        text NOT NULL CHECK (source IN ('fip', 'lta')),
  category      text,
  rank          integer,
  points_value  integer,
  fetched_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ambassador_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ambassador_rankings: sponsor read" ON public.ambassador_rankings
  FOR SELECT USING (public.is_sponsor_or_staff());

CREATE POLICY "ambassador_rankings: sponsor write" ON public.ambassador_rankings
  FOR ALL USING (public.is_sponsor_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambassador_rankings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambassador_rankings TO service_role;
