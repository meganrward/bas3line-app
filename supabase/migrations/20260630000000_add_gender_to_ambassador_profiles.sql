alter table public.ambassador_profiles
  add column if not exists gender text check (gender in ('male', 'female'));
