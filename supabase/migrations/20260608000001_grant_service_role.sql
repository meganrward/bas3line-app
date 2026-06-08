-- The service_role bypasses RLS but still needs table-level privileges.
-- Edge Functions that use the admin client (service role key) need these grants.

grant all on public.profiles          to service_role;
grant all on public.athlete_profiles  to service_role;
grant all on public.sponsor_staff     to service_role;
grant all on public.sponsors          to service_role;
grant all on public.sponsorship_packages to service_role;
grant all on public.post_types        to service_role;
grant all on public.posts             to service_role;
grant all on public.points_transactions to service_role;
grant all on public.voucher_codes     to service_role;
