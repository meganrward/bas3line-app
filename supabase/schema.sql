-- ============================================================
-- Bas3line Sponsor-Athlete Platform — Database Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  role       text not null check (role in ('sponsor', 'athlete')),
  full_name  text,
  avatar_url text,
  created_at timestamptz default now() not null
);

create table public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  website_url text,
  created_at  timestamptz default now() not null
);

create table public.sponsorship_packages (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid references public.sponsors on delete cascade not null,
  name        text not null,
  description text,
  created_at  timestamptz default now() not null
);

create table public.athlete_profiles (
  id                uuid references public.profiles on delete cascade primary key,
  sponsor_id        uuid references public.sponsors on delete set null,
  package_id        uuid references public.sponsorship_packages on delete set null,
  ranking           text,
  clubs             text,
  training_location text,
  racket_brand      text,
  racket_model      text,
  bio               text,
  instagram_handle  text,
  points_balance    int default 0 not null,
  created_at        timestamptz default now() not null
);

create table public.post_types (
  id           uuid primary key default gen_random_uuid(),
  sponsor_id   uuid references public.sponsors on delete cascade not null,
  name         text not null,
  points_value int not null default 0,
  description  text,
  is_active    boolean default true not null,
  created_at   timestamptz default now() not null
);

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid references public.profiles on delete cascade not null,
  post_type_id   uuid references public.post_types on delete restrict not null,
  title          text not null,
  content        text,
  link_url       text,
  status         text default 'pending' not null check (status in ('pending', 'approved', 'rejected')),
  points_awarded int,
  reviewed_by    uuid references public.profiles on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz default now() not null
);

create table public.points_transactions (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid references public.profiles on delete cascade not null,
  post_id     uuid references public.posts on delete set null,
  points      int not null,
  description text,
  created_at  timestamptz default now() not null
);

create table public.voucher_codes (
  id              uuid primary key default gen_random_uuid(),
  sponsor_id      uuid references public.sponsors on delete cascade not null,
  code            text not null unique,
  points_required int not null,
  description     text,
  is_used         boolean default false not null,
  used_by         uuid references public.profiles on delete set null,
  used_at         timestamptz,
  created_at      timestamptz default now() not null
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.sponsors           enable row level security;
alter table public.sponsorship_packages enable row level security;
alter table public.athlete_profiles   enable row level security;
alter table public.post_types         enable row level security;
alter table public.posts              enable row level security;
alter table public.points_transactions enable row level security;
alter table public.voucher_codes      enable row level security;

-- Helper: get the role of the current user
create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get the sponsor_id of the current athlete
create or replace function public.current_athlete_sponsor_id()
returns uuid language sql security definer stable as $$
  select sponsor_id from public.athlete_profiles where id = auth.uid();
$$;

-- profiles: users can read their own row; sponsors can read all
create policy "profiles: own row" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'sponsor');
create policy "profiles: own update" on public.profiles
  for update using (id = auth.uid());

-- sponsors: everyone authenticated can read; only sponsors can write
create policy "sponsors: read all" on public.sponsors
  for select using (auth.role() = 'authenticated');
create policy "sponsors: sponsor write" on public.sponsors
  for all using (public.current_user_role() = 'sponsor');

-- sponsorship_packages: readable by all authenticated; writable by sponsors
create policy "packages: read" on public.sponsorship_packages
  for select using (auth.role() = 'authenticated');
create policy "packages: sponsor write" on public.sponsorship_packages
  for all using (public.current_user_role() = 'sponsor');

-- athlete_profiles: athlete reads own row; sponsor reads/writes all
create policy "athlete_profiles: own read" on public.athlete_profiles
  for select using (id = auth.uid() or public.current_user_role() = 'sponsor');
create policy "athlete_profiles: own update" on public.athlete_profiles
  for update using (id = auth.uid() or public.current_user_role() = 'sponsor');
create policy "athlete_profiles: sponsor insert" on public.athlete_profiles
  for insert with check (public.current_user_role() = 'sponsor');

-- post_types: readable by all authenticated; writable by sponsors
create policy "post_types: read" on public.post_types
  for select using (auth.role() = 'authenticated');
create policy "post_types: sponsor write" on public.post_types
  for all using (public.current_user_role() = 'sponsor');

-- posts: athlete reads/inserts own; sponsor reads/updates all
create policy "posts: athlete read own" on public.posts
  for select using (athlete_id = auth.uid() or public.current_user_role() = 'sponsor');
create policy "posts: athlete insert" on public.posts
  for insert with check (athlete_id = auth.uid());
create policy "posts: sponsor update" on public.posts
  for update using (public.current_user_role() = 'sponsor');

-- points_transactions: athlete reads own; sponsor reads all; no manual insert from client
create policy "points_tx: read" on public.points_transactions
  for select using (athlete_id = auth.uid() or public.current_user_role() = 'sponsor');

-- voucher_codes: athlete reads unused vouchers they can afford; sponsor manages all
create policy "vouchers: athlete read available" on public.voucher_codes
  for select using (
    public.current_user_role() = 'sponsor'
    or (
      public.current_user_role() = 'athlete'
      and (is_used = false or used_by = auth.uid())
    )
  );
create policy "vouchers: athlete redeem" on public.voucher_codes
  for update using (
    public.current_user_role() = 'sponsor'
    or (public.current_user_role() = 'athlete' and is_used = false)
  );
create policy "vouchers: sponsor insert" on public.voucher_codes
  for insert with check (public.current_user_role() = 'sponsor');

-- ─── Trigger: create profile row on new auth user ─────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'athlete'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Seed: insert the Bas3line sponsor ────────────────────────────────────────
-- Run this after creating your sponsor user account in Supabase Auth,
-- then update the sponsor user's profile role to 'sponsor' manually.

insert into public.sponsors (name, website_url)
values ('Bas3line', 'https://bas3line.com')
on conflict do nothing;
