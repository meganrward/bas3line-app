-- Ambassador profile fields from the sponsor brief:
--   team role      sponsor-assigned label ("Ambassador", "Team captain", ...)
--   home club      picked from a list of UK padel clubs
--   city / region  reuses the existing training_location column

alter table public.ambassador_profiles
  add column team_role text;

-- ── Padel clubs ──────────────────────────────────────────────────────────────
-- Our own list (the Padel Directory has no API). Seeded by hand or imported with
-- service_role. Ambassadors can add a club that is missing from the dropdown.

create table public.padel_clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  town       text check (char_length(town) <= 120),
  county     text check (char_length(county) <= 120),
  region     text check (char_length(region) <= 120),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- The same club name in a different town is a different club.
create unique index padel_clubs_name_town_key
  on public.padel_clubs (lower(btrim(name)), lower(btrim(coalesce(town, ''))));

alter table public.padel_clubs enable row level security;

create policy "padel_clubs: signed-in read" on public.padel_clubs
  for select to authenticated using (true);

-- Anyone signed in may add a club, but only as themselves.
create policy "padel_clubs: signed-in insert" on public.padel_clubs
  for insert to authenticated with check (created_by = auth.uid());

-- Fixing or removing a club is a sponsor job.
create policy "padel_clubs: sponsor update" on public.padel_clubs
  for update to authenticated
  using (public.is_sponsor_or_staff()) with check (public.is_sponsor_or_staff());

create policy "padel_clubs: sponsor delete" on public.padel_clubs
  for delete to authenticated using (public.is_sponsor_or_staff());

-- Supabase's default privileges also grant new tables to anon; the club list is for
-- signed-in users only.
revoke all on public.padel_clubs from anon;
grant select, insert, update, delete on public.padel_clubs to authenticated;
grant all on public.padel_clubs to service_role;

alter table public.ambassador_profiles
  add column home_club_id uuid references public.padel_clubs on delete set null;

create index ambassador_profiles_home_club_id_idx on public.ambassador_profiles (home_club_id);

-- ── Let ambassadors set their own home club ──────────────────────────────────
-- Same function as 20260706000000 with home_club_id added to the allow-list.
-- team_role stays sponsor-only.

create or replace function public.guard_ambassador_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  editable_columns constant text[] := array['bio', 'training_location', 'home_club_id'];
begin
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
