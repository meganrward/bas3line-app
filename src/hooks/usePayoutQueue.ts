import { useEffect, useState } from 'react';
import { fetchPayoutQueue } from '../lib/queries';
import { PayoutQueueItem } from '../lib/types';

// Loads every payout request. `reload` fetches again after a decision is made.
export function usePayoutQueue() {
  const [items, setItems] = useState<PayoutQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    async function load() {
      setItems(await fetchPayoutQueue());
      setLoading(false);
    }
    load();
  }, [reloadCount]);

  return { items, loading, reload: () => setReloadCount((count) => count + 1) };
}
