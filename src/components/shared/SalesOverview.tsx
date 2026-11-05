import { formatGBP, formatSaleDate, summariseSales } from '../../lib/sales.utils';
import { DiscountCodeSale } from '../../lib/types';

interface Props {
  sales: readonly DiscountCodeSale[];
  emptyMessage: string;
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="card p-4">
      <p className="text-hint mb-1">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

function SaleRow({ sale }: Readonly<{ sale: DiscountCodeSale }>) {
  const refunded = sale.status === 'refunded';

  return (
    <tr className="table-row">
      <td className="table-cell">{formatSaleDate(sale.sale_date)}</td>
      <td className="table-cell font-mono">{sale.order_id}</td>
      <td className="table-cell text-right">{formatGBP(sale.order_total)}</td>
      <td className={refunded ? 'table-cell text-right line-through' : 'table-cell text-right'}>
        {formatGBP(sale.commission_amount)}
      </td>
      <td className="table-cell text-right">
        {refunded ? <span className="status-rejected">Refunded</span> : null}
      </td>
    </tr>
  );
}

// Read-only sales summary and history, shared by the sponsor and ambassador views.
export function SalesOverview({ sales, emptyMessage }: Readonly<Props>) {
  if (sales.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h2 className="heading-section">Sales &amp; commissions</h2>
        <p className="text-muted mt-2">{emptyMessage}</p>
      </div>
    );
  }

  const summary = summariseSales(sales);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total sales" value={String(summary.saleCount)} />
        <SummaryCard label="Total order value" value={formatGBP(summary.orderValue)} />
        <SummaryCard label="Total commission" value={formatGBP(summary.commission)} />
      </div>
      {summary.refundedCount > 0 && (
        <p className="text-hint">
          {summary.refundedCount} refunded {summary.refundedCount === 1 ? 'sale is' : 'sales are'}{' '}
          not counted in the totals.
        </p>
      )}

      <div className="card overflow-x-auto">
        <div className="card-header">
          <h2 className="heading-section">Sales history</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-col-header">Date</th>
              <th className="table-col-header">Order ID</th>
              <th className="table-col-header text-right">Order total</th>
              <th className="table-col-header text-right">Commission</th>
              <th className="table-col-header text-right">Status</th>
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
