import { render, screen } from '@testing-library/react';
import { MySales } from './MySales';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchAvailableBalance,
  fetchCommissionBalance,
  fetchDiscountCodeSales,
  fetchPayoutRequests,
} from '../../lib/queries';
import { DiscountCodeSale } from '../../lib/types';

jest.mock('../../lib/supabase', () => ({ supabase: {} }));
jest.mock('../../hooks/useAuth');
jest.mock('../../lib/queries', () => ({
  fetchDiscountCodeSales: jest.fn(),
  fetchCommissionBalance: jest.fn(),
  fetchAvailableBalance: jest.fn(),
  fetchPayoutRequests: jest.fn(),
  requestPayout: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFetchSales = fetchDiscountCodeSales as jest.Mock;

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

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: { id: 'ambassador-1' } });
  (fetchCommissionBalance as jest.Mock).mockResolvedValue({
    totalEarned: 10,
    totalPaidOut: 0,
    balance: 10,
  });
  (fetchAvailableBalance as jest.Mock).mockResolvedValue(10);
  (fetchPayoutRequests as jest.Mock).mockResolvedValue([]);
});

it('loads the signed-in ambassador’s own sales', async () => {
  mockFetchSales.mockResolvedValue([buildSale()]);
  render(<MySales />);

  expect(await screen.findByText('1001')).toBeInTheDocument();
  expect(mockFetchSales).toHaveBeenCalledWith('ambassador-1');
});

it('shows a friendly message when there are no sales', async () => {
  mockFetchSales.mockResolvedValue([]);
  render(<MySales />);

  expect(await screen.findByText(/No sales yet/)).toBeInTheDocument();
});

it('leaves refunded sales out of the commission total and marks them', async () => {
  mockFetchSales.mockResolvedValue([
    buildSale({ id: 'a', order_id: '1001', commission_amount: 10 }),
    buildSale({ id: 'b', order_id: '1002', commission_amount: 8, status: 'refunded' }),
  ]);
  render(<MySales />);

  expect(await screen.findByText('Total commission')).toBeInTheDocument();
  expect(screen.getByText('£10.00', { selector: '.stat-value' })).toBeInTheDocument();
  expect(screen.getByText('Refunded')).toBeInTheDocument();
  expect(screen.getByText(/1 refunded sale is not counted/)).toBeInTheDocument();
});

it('puts Redeem commission at the bottom of the Sales page', async () => {
  mockFetchSales.mockResolvedValue([buildSale()]);
  render(<MySales />);

  expect(await screen.findByText('Redeem commission')).toBeInTheDocument();
  expect(await screen.findByText('Available to redeem')).toBeInTheDocument();
});
