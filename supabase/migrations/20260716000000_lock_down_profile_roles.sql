-- Security fix: nobody can make themselves a sponsor.
--
-- Two holes let anyone become a sponsor, and a sponsor can read every ambassador, edit
-- anything and approve payouts:
--
--   1. The "profiles: own update" policy let a user update any column of their own profile,
--      including `role`. A signed-in ambassador could set role = 'sponsor' on themselves.
--   2. handle_new_user() copied the role from raw_user_meta_data, which the person signing up
--      controls (supabase.auth.signUp({ options: { data: { role: 'sponsor' } } })). With
--      public sign-up enabled, a stranger could create a sponsor account.
--
-- Fix: users may change only their name and avatar, and the role a new account gets comes
-- from raw_app_meta_data, which only the service role or the dashboard can set. Anyone else
-- is an ambassador. Make a sponsor from the SQL Editor:
--   update public.profiles set role = 'sponsor' where id = '<user id>';

revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case new.raw_app_meta_data->>'role' when 'sponsor' then 'sponsor' else 'ambassador' end,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;
