import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayoutQueue } from './PayoutQueue';
import { approvePayout, fetchPayoutQueue, markPayoutPaid, rejectPayout } from '../../lib/queries';
import { PayoutQueueItem } from '../../lib/types';

jest.mock('../../lib/supabase', () => ({ supabase: {} }));
jest.mock('../../lib/queries', () => ({
  fetchPayoutQueue: jest.fn(),
  approvePayout: jest.fn(),
  rejectPayout: jest.fn(),
  markPayoutPaid: jest.fn(),
}));

const mockFetchQueue = fetchPayoutQueue as jest.Mock;
const mockApprove = approvePayout as jest.Mock;
const mockReject = rejectPayout as jest.Mock;
const mockMarkPaid = markPayoutPaid as jest.Mock;

function buildItem(overrides: Partial<PayoutQueueItem> = {}): PayoutQueueItem {
  return {
    id: 'request-1',
    ambassador_id: 'ambassador-1',
    ambassador_name: 'Sam Ambassador',
    ambassador_balance: 50,
    request_type: 'cash',
    amount: 10,
    kit_credit_value: null,
    kit_item_name: null,
    kit_item_price: null,
    note: null,
    status: 'pending',
    sponsor_note: null,
    created_at: '2026-07-01T10:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockApprove.mockResolvedValue({ error: null });
  mockReject.mockResolvedValue({ error: null });
  mockMarkPaid.mockResolvedValue({ error: null });
});

it('shows a friendly message when there are no requests', async () => {
  mockFetchQueue.mockResolvedValue([]);
  render(<PayoutQueue />);

  expect(await screen.findByText('Nothing waiting.')).toBeInTheDocument();
  expect(screen.getByText('Nothing to pay.')).toBeInTheDocument();
});

it('lists a pending request with who asked and how much', async () => {
  mockFetchQueue.mockResolvedValue([buildItem({ note: 'Bank transfer please' })]);
  render(<PayoutQueue />);

  expect(await screen.findByText('Sam Ambassador')).toBeInTheDocument();
  expect(screen.getByText('Cash payout of £10.00')).toBeInTheDocument();
  expect(screen.getByText('“Bank transfer please”')).toBeInTheDocument();
});

it('approves a request and reloads the queue', async () => {
  mockFetchQueue.mockResolvedValueOnce([buildItem()]).mockResolvedValue([]);
  render(<PayoutQueue />);

  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));

  expect(mockApprove).toHaveBeenCalledWith('request-1');
  await waitFor(() => expect(mockFetchQueue).toHaveBeenCalledTimes(2));
});

it('rejects with an optional reason', async () => {
  mockFetchQueue.mockResolvedValue([buildItem()]);
  render(<PayoutQueue />);

  await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  await userEvent.type(screen.getByLabelText(/Reason/), 'Please ask again next month');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm reject' }));

  expect(mockReject).toHaveBeenCalledWith('request-1', 'Please ask again next month');
});

it('rejects without a reason as null', async () => {
  mockFetchQueue.mockResolvedValue([buildItem()]);
  render(<PayoutQueue />);

  await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm reject' }));

  expect(mockReject).toHaveBeenCalledWith('request-1', null);
});

it('lets the sponsor back out of rejecting', async () => {
  mockFetchQueue.mockResolvedValue([buildItem()]);
  render(<PayoutQueue />);

  await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  expect(mockReject).not.toHaveBeenCalled();
});

it('disables Approve and explains when a refund left too little balance', async () => {
  mockFetchQueue.mockResolvedValue([buildItem({ amount: 10, ambassador_balance: 4 })]);
  render(<PayoutQueue />);

  expect(await screen.findByText(/Their balance is now lower/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
});

it('shows the server error when approval is refused', async () => {
  mockFetchQueue.mockResolvedValue([buildItem()]);
  mockApprove.mockResolvedValue({ error: 'Only a pending request can be approved' });
  render(<PayoutQueue />);

  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));

  expect(await screen.findByText('Only a pending request can be approved')).toBeInTheDocument();
  expect(mockFetchQueue).toHaveBeenCalledTimes(1);
});

it('marks an approved request paid', async () => {
  mockFetchQueue.mockResolvedValue([buildItem({ status: 'approved' })]);
  render(<PayoutQueue />);

  await userEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));

  expect(mockMarkPaid).toHaveBeenCalledWith('request-1');
});

it('keeps finished requests in the history with no actions', async () => {
  mockFetchQueue.mockResolvedValue([
    buildItem({ id: 'a', status: 'paid' }),
    buildItem({ id: 'b', status: 'rejected', sponsor_note: 'Out of stock' }),
  ]);
  render(<PayoutQueue />);

  const history = await screen.findByRole('region', { name: 'History (2)' });
  expect(within(history).getByText('Paid')).toBeInTheDocument();
  expect(within(history).getByText('Your note: Out of stock')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark paid' })).not.toBeInTheDocument();
});
