-- pgTAP: the scheduled ranking refresh is registered, and only the job owner can run it.
-- (The procedure COMMITs between requests, so it can't be CALLed inside this test
-- transaction; request delivery and pacing were checked by hand against a local listener.)

begin;
select plan(9);

select is(
  (select schedule from cron.job where jobname = 'refresh-lta-rankings-friday'),
  '30 10,12,14,17 * * 5',
  'LTA is polled on Friday late morning to evening (UTC)'
);

select is(
  (select schedule from cron.job where jobname = 'refresh-lta-rankings-saturday'),
  '0 8 * * 6',
  'LTA has a Saturday catch-all'
);

select is(
  (select schedule from cron.job where jobname = 'refresh-fip-rankings-monday'),
  '0 8,12,16 * * 1',
  'FIP is polled through Monday (UTC)'
);

select is(
  (select schedule from cron.job where jobname = 'refresh-fip-rankings-tuesday'),
  '0 8 * * 2',
  'FIP has a Tuesday catch-all'
);

select is(
  (
    select count(*)::int
    from cron.job
    where jobname like 'refresh-%-rankings-%'
      and command like 'call public.refresh_rankings(%'
  ),
  4,
  'all four jobs call the refresh procedure'
);

select is(
  has_function_privilege('anon', 'public.refresh_rankings(text)', 'execute'),
  false,
  'signed-out visitors cannot run the refresh'
);

select is(
  has_function_privilege('authenticated', 'public.refresh_rankings(text)', 'execute'),
  false,
  'signed-in users cannot run the refresh'
);

select throws_ok(
  $$call public.refresh_rankings('nope')$$,
  'P0001',
  'refresh_rankings: unknown source nope',
  'an unknown ranking source is rejected'
);

-- Calling it as an ordinary signed-in user is refused outright.
set local role authenticated;
select throws_ok(
  $$call public.refresh_rankings('fip')$$,
  '42501',
  null,
  'a signed-in user calling the refresh gets a permission error'
);

select * from finish();
rollback;
