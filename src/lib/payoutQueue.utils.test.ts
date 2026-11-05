import { exceedsBalance, splitPayoutQueue } from './payoutQueue.utils';
import { PayoutQueueItem } from './types';

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

describe('splitPayoutQueue', () => {
  it('returns empty sections for no requests', () => {
    expect(splitPayoutQueue([])).toEqual({ pending: [], approved: [], history: [] });
  });

  it('sorts each status into its own section', () => {
    const sections = splitPayoutQueue([
      buildItem({ id: 'a', status: 'pending' }),
      buildItem({ id: 'b', status: 'approved' }),
      buildItem({ id: 'c', status: 'paid', created_at: '2026-07-01T10:00:00Z' }),
      buildItem({ id: 'd', status: 'rejected', created_at: '2026-07-02T10:00:00Z' }),
    ]);
    expect(sections.pending.map((item) => item.id)).toEqual(['a']);
    expect(sections.approved.map((item) => item.id)).toEqual(['b']);
    expect(sections.history.map((item) => item.id)).toEqual(['d', 'c']);
  });

  it('puts the oldest pending request first', () => {
    const sections = splitPayoutQueue([
      buildItem({ id: 'new', created_at: '2026-07-03T10:00:00Z' }),
      buildItem({ id: 'old', created_at: '2026-07-01T10:00:00Z' }),
    ]);
    expect(sections.pending.map((item) => item.id)).toEqual(['old', 'new']);
  });

  it('puts the newest finished request first', () => {
    const sections = splitPayoutQueue([
      buildItem({ id: 'old', status: 'paid', created_at: '2026-07-01T10:00:00Z' }),
      buildItem({ id: 'new', status: 'rejected', created_at: '2026-07-03T10:00:00Z' }),
    ]);
    expect(sections.history.map((item) => item.id)).toEqual(['new', 'old']);
  });

  it('does not change the list it is given', () => {
    const items = [
      buildItem({ id: 'new', created_at: '2026-07-03T10:00:00Z' }),
      buildItem({ id: 'old', created_at: '2026-07-01T10:00:00Z' }),
    ];
    splitPayoutQueue(items);
    expect(items.map((item) => item.id)).toEqual(['new', 'old']);
  });
});

describe('exceedsBalance', () => {
  it('is false when the balance covers the request', () => {
    expect(exceedsBalance(buildItem({ amount: 10, ambassador_balance: 10 }))).toBe(false);
  });

  it('is true when a refund left less than was asked for', () => {
    expect(exceedsBalance(buildItem({ amount: 10, ambassador_balance: 4 }))).toBe(true);
  });

  it('only applies to pending requests', () => {
    expect(exceedsBalance(buildItem({ status: 'approved', ambassador_balance: 0 }))).toBe(false);
    expect(exceedsBalance(buildItem({ status: 'paid', ambassador_balance: 0 }))).toBe(false);
  });
});
