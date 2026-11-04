import { useEffect, useState } from 'react';
import { deleteRanking, loadRankings, refreshFipRanking, refreshLtaRanking } from '../lib/queries';
import { RankingsData } from '../lib/queryTypes';

interface RankingsState {
  data: RankingsData;
  loading: boolean;
  fipRefreshing: boolean;
  ltaRefreshing: boolean;
  refreshFip: () => Promise<void>;
  refreshLta: () => Promise<void>;
  removeLta: (rankingId: string) => Promise<void>;
}

// Loads an ambassador's FIP and LTA rankings and refreshes them through the edge functions.
export function useRankings(
  ambassadorId: string,
  fipPlayerSlug: string | null,
  ltaPlayerId: string | null,
): RankingsState {
  const [data, setData] = useState<RankingsData>({ fip: [], lta: [] });
  const [loading, setLoading] = useState(true);
  const [fipRefreshing, setFipRefreshing] = useState(false);
  const [ltaRefreshing, setLtaRefreshing] = useState(false);

  useEffect(() => {
    async function load() {
      const initial = await loadRankings(ambassadorId);
      setData(initial);
      setLoading(false);

      // Auto-fetch LTA on first load when no data exists yet. Once data is present,
      // the refresh button is used (it checks LTA's own "Last updated" before re-scraping).
      if (ltaPlayerId && initial.lta.length === 0) {
        setLtaRefreshing(true);
        const lta = await refreshLtaRanking(ambassadorId, ltaPlayerId);
        setData((previous) => ({ ...previous, lta }));
        setLtaRefreshing(false);
      }
    }
    load();
  }, [ambassadorId, ltaPlayerId]);

  async function refreshFip() {
    if (!fipPlayerSlug) return;
    setFipRefreshing(true);
    const fip = await refreshFipRanking(ambassadorId, fipPlayerSlug);
    setData((previous) => ({ ...previous, fip }));
    setFipRefreshing(false);
  }

  async function refreshLta() {
    if (!ltaPlayerId) return;
    setLtaRefreshing(true);
    const lta = await refreshLtaRanking(ambassadorId, ltaPlayerId);
    setData((previous) => ({ ...previous, lta }));
    setLtaRefreshing(false);
  }

  async function removeLta(rankingId: string) {
    await deleteRanking(rankingId);
    setData((previous) => ({
      ...previous,
      lta: previous.lta.filter((ranking) => ranking.id !== rankingId),
    }));
  }

  return { data, loading, fipRefreshing, ltaRefreshing, refreshFip, refreshLta, removeLta };
}
