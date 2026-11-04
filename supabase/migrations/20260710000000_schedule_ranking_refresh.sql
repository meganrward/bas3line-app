-- Scheduled refresh of ambassador FIP and LTA rankings.
--
--   FIP publishes on Mondays (time unknown), LTA on Fridays (usually ~10:00, sometimes
--   later), so we poll in those windows rather than nightly. pg_cron runs in UTC.
--
-- Each run calls the get-fip-ranking / get-lta-ranking edge functions once per
-- ambassador, authenticated by the CRON_SECRET edge function secret. The project URL and
-- the same secret are read from Supabase Vault (names: project_url, cron_secret), so
-- nothing sensitive lives in git. If either is missing the run is a harmless no-op.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- A procedure, not a function: it COMMITs after each request so pg_net sends them one
-- at a time with a pause between, instead of all at once when the transaction ends.
-- (No SECURITY DEFINER or SET clause, because those forbid transaction control. It is
-- only ever run by pg_cron as the job owner; execute is revoked from everyone else.)
create or replace procedure public.refresh_rankings(ranking_source text)
language plpgsql
as $$
declare
  project_url   text;
  cron_secret   text;
  ambassador_id uuid;
begin
  if ranking_source not in ('fip', 'lta') then
    raise exception 'refresh_rankings: unknown source %', ranking_source;
  end if;

  select decrypted_secret into project_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'cron_secret';

  if project_url is null or cron_secret is null then
    raise notice 'refresh_rankings: project_url or cron_secret missing from Vault; skipping';
    return;
  end if;

  for ambassador_id in
    select id
      from public.ambassador_profiles
     where (ranking_source = 'fip' and fip_player_slug is not null)
        or (ranking_source = 'lta' and lta_player_id is not null)
     order by id
  loop
    perform net.http_post(
      url := project_url || '/functions/v1/get-' || ranking_source || '-ranking',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', cron_secret
      ),
      -- force skips the FIP cache: a run before FIP publishes must not hide the update
      body := jsonb_build_object('ambassador_id', ambassador_id, 'force', ranking_source = 'fip'),
      timeout_milliseconds := 30000
    );

    commit;
    -- Be gentle with padelapi.org and the LTA site.
    perform pg_sleep(2);
  end loop;
end;
$$;

revoke all on procedure public.refresh_rankings(text) from public, anon, authenticated;

-- ── Schedules (UTC) ──────────────────────────────────────────────────────────
-- LTA: Friday late morning to evening, then a Saturday catch-all. The function checks
-- the LTA's own "last updated" time, so runs with nothing new are cheap.
select cron.schedule(
  'refresh-lta-rankings-friday',
  '30 10,12,14,17 * * 5',
  $$call public.refresh_rankings('lta')$$
);
select cron.schedule(
  'refresh-lta-rankings-saturday',
  '0 8 * * 6',
  $$call public.refresh_rankings('lta')$$
);

-- FIP: Monday through the day, then a Tuesday catch-all. Each run bypasses the cache.
select cron.schedule(
  'refresh-fip-rankings-monday',
  '0 8,12,16 * * 1',
  $$call public.refresh_rankings('fip')$$
);
select cron.schedule(
  'refresh-fip-rankings-tuesday',
  '0 8 * * 2',
  $$call public.refresh_rankings('fip')$$
);
