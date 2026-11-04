-- Ambassadors need to see their own FIP and LTA rankings on their profile page.
-- Until now only sponsors/staff could read ambassador_rankings. Writes stay
-- sponsor-only: the edge functions refresh rankings with the service role.

create policy "ambassador_rankings: ambassador read own" on public.ambassador_rankings
  for select to authenticated using (ambassador_id = auth.uid());
