import { useEffect, useState } from 'react';
import { fetchAvailableBalance, fetchCommissionBalance, fetchPayoutRequests } from '../lib/queries';
import { CommissionBalance, PayoutRequest } from '../lib/types';

export interface RedeemCommissionData {
  balance: CommissionBalance;
  availableBalance: number;
  requests: PayoutRequest[];
}

// Loads what the Redeem commission section shows. `reload` fetches it again, for example
// after a request is made.
export function useRedeemCommission(ambassadorId: string) {
  const [data, setData] = useState<RedeemCommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [balance, availableBalance, requests] = await Promise.all([
        fetchCommissionBalance(ambassadorId),
        fetchAvailableBalance(),
        fetchPayoutRequests(ambassadorId),
      ]);
      setData({ balance, availableBalance, requests });
      setLoading(false);
    }
    load();
  }, [ambassadorId, reloadCount]);

  return { data, loading, reload: () => setReloadCount((count) => count + 1) };
}
