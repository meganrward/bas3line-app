import { useEffect, useState } from 'react';
import { fetchDiscountCodeSales } from '../../lib/queries';
import { DiscountCodeSale } from '../../lib/types';
import { SalesOverview } from '../shared/SalesOverview';

export function SalesCommissions({ ambassadorId }: Readonly<{ ambassadorId: string }>) {
  const [sales, setSales] = useState<DiscountCodeSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setSales(await fetchDiscountCodeSales(ambassadorId));
      setLoading(false);
    }
    load();
  }, [ambassadorId]);

  if (loading) return <div className="spinner" />;

  return (
    <SalesOverview
      sales={sales}
      emptyMessage="No sales recorded yet. Make sure the ambassador's discount code is set and the WordPress snippet is active."
    />
  );
}
