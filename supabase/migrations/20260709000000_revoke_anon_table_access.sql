-- Supabase grants the `anon` role ALL privileges on new public tables by default
-- (including INSERT, UPDATE, DELETE and TRUNCATE). Row-level security was the only
-- thing stopping a signed-out visitor, so one missing policy would have exposed data.
--
-- Nothing in the app needs anonymous table access: the browser and edge functions send
-- the signed-in user's JWT (role `authenticated`), and sign-in goes through the auth API.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Stop future tables and sequences created by migrations from re-opening this.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
