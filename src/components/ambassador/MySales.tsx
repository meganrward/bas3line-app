import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchDiscountCodeSales } from '../../lib/queries';
import { DiscountCodeSale } from '../../lib/types';
import { SalesOverview } from '../shared/SalesOverview';

export function MySales() {
  const { user } = useAuth();
  const ambassadorId = user?.id;
  const [sales, setSales] = useState<DiscountCodeSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!ambassadorId) return;
      setSales(await fetchDiscountCodeSales(ambassadorId));
      setLoading(false);
    }
    load();
  }, [ambassadorId]);

  if (loading) return <div className="spinner" />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="heading-page">Your Sales</h1>
      <SalesOverview
        sales={sales}
        emptyMessage="No sales yet. When someone buys with your discount code, it shows up here along with your commission."
      />
    </div>
  );
}
