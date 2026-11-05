import { formatGBP, formatSaleDate, summariseSales } from './sales.utils';
import { DiscountCodeSale } from './types';

function buildSale(overrides: Partial<DiscountCodeSale> = {}): DiscountCodeSale {
  return {
    id: 'sale-1',
    ambassador_id: 'ambassador-1',
    discount_code: 'sam10',
    order_id: '1001',
    order_total: 100,
    commission_amount: 10,
    sale_date: '2026-07-01T10:00:00Z',
    status: 'completed',
    refunded_at: null,
    created_at: '2026-07-01T10:00:01Z',
    ...overrides,
  };
}

describe('summariseSales', () => {
  it('returns zeros for no sales', () => {
    expect(summariseSales([])).toEqual({
      saleCount: 0,
      orderValue: 0,
      commission: 0,
      refundedCount: 0,
    });
  });

  it('adds up completed sales', () => {
    const summary = summariseSales([
      buildSale({ id: 'a', order_total: 100, commission_amount: 10 }),
      buildSale({ id: 'b', order_total: 50, commission_amount: 5 }),
    ]);
    expect(summary).toMatchObject({ saleCount: 2, orderValue: 150, commission: 15 });
  });

  it('leaves refunded sales out of the totals and counts them separately', () => {
    const summary = summariseSales([
      buildSale({ id: 'a', order_total: 100, commission_amount: 10 }),
      buildSale({ id: 'b', order_total: 80, commission_amount: 8, status: 'refunded' }),
    ]);
    expect(summary).toEqual({ saleCount: 1, orderValue: 100, commission: 10, refundedCount: 1 });
  });

  it('avoids floating point drift', () => {
    const summary = summariseSales([
      buildSale({ id: 'a', commission_amount: 0.1 }),
      buildSale({ id: 'b', commission_amount: 0.2 }),
    ]);
    expect(summary.commission).toBe(0.3);
  });
});

describe('formatGBP', () => {
  it('formats pounds and pence', () => {
    expect(formatGBP(1234.5)).toBe('£1,234.50');
    expect(formatGBP(0)).toBe('£0.00');
  });
});

describe('formatSaleDate', () => {
  it('formats a UK-style date', () => {
    expect(formatSaleDate('2026-07-01T10:00:00Z')).toBe('1 Jul 2026');
  });
});
