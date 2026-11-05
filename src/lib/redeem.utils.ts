import { roundToPence, formatGBP } from './sales.utils';
import { PayoutRequest, PayoutStatus } from './types';

export const MAX_NOTE_LENGTH = 500;

export interface KitDiscount {
  commissionSpent: number;
  discountValue: number;
  amountToPay: number;
}

type AmountCheck = { amount: number; error: null } | { amount: null; error: string };

function floorToPence(amount: number): number {
  // The small nudge stops values like 0.29 * 100 = 28.999... from losing a penny.
  return Math.floor(amount * 100 + 1e-9) / 100;
}

// Tidies an amount when the ambassador leaves the box: "20" becomes "20.00". Anything that
// is not a valid amount is left alone, so they can see and fix what they typed.
export function formatAmountInput(raw: string): string {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return raw;
  return Number(trimmed).toFixed(2);
}

// Turns what the ambassador typed into pounds and pence, or an error to show them.
export function validateCashAmount(raw: string, availableBalance: number): AmountCheck {
  const trimmed = raw.trim();
  if (trimmed === '') return { amount: null, error: 'Enter an amount.' };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { amount: null, error: 'Enter an amount in pounds and pence, like 12.50.' };
  }

  const amount = Number(trimmed);
  if (amount <= 0) return { amount: null, error: 'The amount must be more than £0.' };
  if (amount > availableBalance) {
    return {
      amount: null,
      error: `You can request up to ${formatGBP(Math.max(availableBalance, 0))}.`,
    };
  }
  return { amount, error: null };
}

// Not used by the Sales page. Kept for the Marketplace checkout, where commission becomes a
// discount on kit. Spend as much commission as helps, without paying more discount than the item costs.
// An item dearer than the balance is fine: the discount is partial and the ambassador pays
// the rest on the store. `multiplier` is what £1 of commission is worth as kit (1 today).
export function calculateKitDiscount(
  itemPrice: number,
  availableBalance: number,
  multiplier: number,
): KitDiscount {
  const usableBalance = Math.max(floorToPence(availableBalance), 0);
  const mostUsefulSpend = floorToPence(itemPrice / multiplier);
  const commissionSpent = Math.min(usableBalance, mostUsefulSpend);
  const discountValue = Math.min(roundToPence(commissionSpent * multiplier), itemPrice);

  return {
    commissionSpent,
    discountValue,
    amountToPay: roundToPence(itemPrice - discountValue),
  };
}

export function describeRequest(request: PayoutRequest): string {
  if (request.request_type === 'cash') return `Cash payout of ${formatGBP(request.amount)}`;

  const item = request.kit_item_name ?? 'Kit';
  const value = request.kit_credit_value ?? request.amount;
  return `${item}: ${formatGBP(request.amount)} commission for ${formatGBP(value)} off`;
}

const STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Not approved',
};

export function statusLabel(status: PayoutStatus): string {
  return STATUS_LABELS[status];
}

export function statusClassName(status: PayoutStatus): string {
  if (status === 'pending') return 'status-pending';
  if (status === 'rejected') return 'status-rejected';
  return 'status-approved';
}
