import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RedeemCommission } from './RedeemCommission';
import {
  fetchAvailableBalance,
  fetchCommissionBalance,
  fetchPayoutRequests,
  requestPayout,
} from '../../lib/queries';
import { PayoutRequest } from '../../lib/types';

jest.mock('../../lib/supabase', () => ({ supabase: {} }));
jest.mock('../../lib/queries', () => ({
  fetchAvailableBalance: jest.fn(),
  fetchCommissionBalance: jest.fn(),
  fetchPayoutRequests: jest.fn(),
  requestPayout: jest.fn(),
}));

const mockRequestPayout = requestPayout as jest.Mock;

function givenCommission(
  available: number,
  { balance = available, requests = [] as PayoutRequest[] } = {},
) {
  (fetchCommissionBalance as jest.Mock).mockResolvedValue({
    totalEarned: Math.max(balance, 0),
    totalPaidOut: 0,
    balance,
  });
  (fetchAvailableBalance as jest.Mock).mockResolvedValue(available);
  (fetchPayoutRequests as jest.Mock).mockResolvedValue(requests);
  mockRequestPayout.mockResolvedValue({ error: null });
}

async function renderSection() {
  render(<RedeemCommission ambassadorId="ambassador-1" />);
  await screen.findByText('Available to redeem');
}

it('shows what is available and an empty history', async () => {
  givenCommission(12);
  await renderSection();

  expect(screen.getAllByText('£12.00').length).toBeGreaterThan(0);
  expect(screen.getByText('No requests yet.')).toBeInTheDocument();
});

it('rejects a request over the balance without calling the server', async () => {
  givenCommission(12);
  await renderSection();

  await userEvent.type(screen.getByLabelText('Amount (£)'), '12.01');
  await userEvent.click(screen.getByRole('button', { name: 'Request payout' }));

  expect(await screen.findByText('You can request up to £12.00.')).toBeInTheDocument();
  expect(mockRequestPayout).not.toHaveBeenCalled();
});

it('sends a valid request and confirms it', async () => {
  givenCommission(12);
  await renderSection();

  await userEvent.type(screen.getByLabelText('Amount (£)'), '10');
  await userEvent.type(screen.getByLabelText('Note (optional)'), 'Bank transfer');
  await userEvent.click(screen.getByRole('button', { name: 'Request payout' }));

  expect(await screen.findByText('Request sent. The team will review it.')).toBeInTheDocument();
  expect(mockRequestPayout).toHaveBeenCalledWith({
    type: 'cash',
    amount: 10,
    note: 'Bank transfer',
    kitItemId: null,
  });
});

it('shows server errors', async () => {
  givenCommission(12);
  mockRequestPayout.mockResolvedValue({ error: 'Amount is more than your available balance' });
  await renderSection();

  await userEvent.type(screen.getByLabelText('Amount (£)'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Request payout' }));

  expect(await screen.findByText('Amount is more than your available balance')).toBeInTheDocument();
});

it('disables the request button when there is nothing to redeem', async () => {
  givenCommission(0);
  await renderSection();

  expect(screen.getByRole('button', { name: 'Request payout' })).toBeDisabled();
  expect(screen.getByText('You have no commission available to request yet.')).toBeInTheDocument();
});

it('explains a balance below zero after a refund', async () => {
  givenCommission(0, { balance: -4 });
  await renderSection();

  expect(screen.getByText(/A refund took your balance below zero/)).toBeInTheDocument();
});

it('lists past requests with their status', async () => {
  givenCommission(5, {
    requests: [
      {
        id: 'request-1',
        request_type: 'cash',
        amount: 10,
        kit_credit_value: null,
        kit_item_name: null,
        kit_item_price: null,
        note: null,
        status: 'paid',
        sponsor_note: null,
        created_at: '2026-07-01T10:00:00Z',
      },
    ],
  });
  await renderSection();

  expect(screen.getByText('Cash payout of £10.00')).toBeInTheDocument();
  expect(screen.getByText('Paid')).toBeInTheDocument();
});
