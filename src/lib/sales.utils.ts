import { DiscountCodeSale } from './types';

export interface SalesSummary {
  saleCount: number;
  orderValue: number;
  commission: number;
  refundedCount: number;
}

export function roundToPence(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export function formatSaleDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Refunded sales are kept for the record but earn nothing, so they are left out of every
// total and counted separately.
export function summariseSales(sales: readonly DiscountCodeSale[]): SalesSummary {
  const summary: SalesSummary = { saleCount: 0, orderValue: 0, commission: 0, refundedCount: 0 };

  for (const sale of sales) {
    if (sale.status === 'refunded') {
      summary.refundedCount += 1;
      continue;
    }
    summary.saleCount += 1;
    summary.orderValue += sale.order_total;
    summary.commission += sale.commission_amount;
  }

  return {
    ...summary,
    orderValue: roundToPence(summary.orderValue),
    commission: roundToPence(summary.commission),
  };
}
