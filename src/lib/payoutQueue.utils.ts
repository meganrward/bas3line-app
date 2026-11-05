import { PayoutQueueItem } from './types';

export interface PayoutQueueSections {
  pending: PayoutQueueItem[];
  approved: PayoutQueueItem[];
  history: PayoutQueueItem[];
}

function oldestFirst(first: PayoutQueueItem, second: PayoutQueueItem): number {
  return first.created_at.localeCompare(second.created_at);
}

function newestFirst(first: PayoutQueueItem, second: PayoutQueueItem): number {
  return second.created_at.localeCompare(first.created_at);
}

// Work to do goes first and oldest first (first come, first served). Finished requests sit
// below, newest first.
export function splitPayoutQueue(items: readonly PayoutQueueItem[]): PayoutQueueSections {
  const pending = items.filter((item) => item.status === 'pending').sort(oldestFirst);
  const approved = items.filter((item) => item.status === 'approved').sort(oldestFirst);
  const history = items
    .filter((item) => item.status === 'paid' || item.status === 'rejected')
    .sort(newestFirst);

  return { pending, approved, history };
}

// A refund can land after an ambassador asks, leaving less commission than they requested.
// The database refuses to approve it then, so the page says so up front.
export function exceedsBalance(item: PayoutQueueItem): boolean {
  return item.status === 'pending' && item.amount > item.ambassador_balance;
}
