-- Grant the authenticated role access to all tables via the Data API.
-- Required because "Automatically expose new tables" is disabled on this project.
-- RLS policies still control which rows each user can actually read/write.

grant usage on schema public to anon, authenticated;

grant select, update             on public.profiles               to authenticated;
grant select                     on public.sponsors                to authenticated;
grant select                     on public.sponsorship_packages    to authenticated;
grant select, insert, update     on public.athlete_profiles        to authenticated;
grant select                     on public.post_types              to authenticated;
grant select, insert, update     on public.posts                   to authenticated;
grant select                     on public.points_transactions      to authenticated;
grant select, update, insert     on public.voucher_codes           to authenticated;

-- Sponsor-only write operations (RLS enforces the sponsor check at row level)
grant insert, update, delete on public.sponsorship_packages to authenticated;
grant insert, update, delete on public.post_types           to authenticated;
grant insert                 on public.points_transactions   to authenticated;

-- Allow the trigger function and edge functions to insert profiles
grant insert on public.profiles          to authenticated;
grant insert on public.athlete_profiles  to authenticated;

-- Execute permission for the redeem_voucher function
grant execute on function public.redeem_voucher(uuid) to authenticated;
