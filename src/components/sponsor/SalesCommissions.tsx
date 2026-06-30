import { useEffect, useState } from "react";
import { fetchDiscountCodeSales } from "../../lib/queries";
import { DiscountCodeSale } from "../../lib/types";

export function SalesCommissions({ ambassadorId }: { ambassadorId: string }) {
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

  if (sales.length === 0) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center">
        <svg
          className="w-10 h-10 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h2 className="heading-section">Sales &amp; commissions</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          No sales recorded yet. Make sure the ambassador's discount code is set
          and the WordPress snippet is active.
        </p>
      </div>
    );
  }

  const totalOrderValue = sales.reduce((sum, s) => sum + s.order_total, 0);
  const totalCommission = sales.reduce((sum, s) => sum + s.commission_amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total sales" value={String(sales.length)} />
        <SummaryCard label="Total order value" value={formatGBP(totalOrderValue)} />
        <SummaryCard label="Total commission" value={formatGBP(totalCommission)} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="heading-section">Sales history</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-col-header">Date</th>
              <th className="table-col-header">Order ID</th>
              <th className="table-col-header text-right">Order total</th>
              <th className="table-col-header text-right">Commission</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <SaleRow key={sale.id} sale={sale} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SaleRow({ sale }: { sale: DiscountCodeSale }) {
  const date = new Date(sale.sale_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 text-gray-500">{date}</td>
      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{sale.order_id}</td>
      <td className="px-4 py-2.5 text-right text-gray-700">{formatGBP(sale.order_total)}</td>
      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatGBP(sale.commission_amount)}</td>
    </tr>
  );
}

function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
