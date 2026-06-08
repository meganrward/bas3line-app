-- ============================================================
-- Sponsor staff table
-- Links personal user accounts to a sponsor business with an
-- internal role. Multiple staff can belong to the same sponsor.
-- ============================================================

create table public.sponsor_staff (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles on delete cascade not null,
  sponsor_id uuid references public.sponsors on delete cascade not null,
  staff_role text not null default 'manager',
  created_at timestamptz default now() not null,
  unique (user_id, sponsor_id)
);

alter table public.sponsor_staff enable row level security;

-- Staff can read all colleagues at the same sponsor
create policy "sponsor_staff: read own sponsor" on public.sponsor_staff
  for select using (
    user_id = auth.uid()
    or sponsor_id in (
      select sponsor_id from public.sponsor_staff where user_id = auth.uid()
    )
  );

-- Only existing staff at the same sponsor can add new staff members
create policy "sponsor_staff: staff insert" on public.sponsor_staff
  for insert with check (
    sponsor_id in (
      select sponsor_id from public.sponsor_staff where user_id = auth.uid()
    )
  );

grant select, insert on public.sponsor_staff to authenticated;

-- Helper: get the sponsor_id for the currently authenticated staff user
create or replace function public.current_staff_sponsor_id()
returns uuid language sql security definer stable as $$
  select sponsor_id from public.sponsor_staff where user_id = auth.uid() limit 1;
$$;
