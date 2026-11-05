import {
  calculateKitDiscount,
  describeRequest,
  formatAmountInput,
  statusClassName,
  statusLabel,
  validateCashAmount,
} from './redeem.utils';
import { PayoutRequest } from './types';

function buildRequest(overrides: Partial<PayoutRequest> = {}): PayoutRequest {
  return {
    id: 'request-1',
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

describe('validateCashAmount', () => {
  it('accepts pounds and pence within the balance', () => {
    expect(validateCashAmount('12.50', 20)).toEqual({ amount: 12.5, error: null });
    expect(validateCashAmount(' 5 ', 20)).toEqual({ amount: 5, error: null });
  });

  it('accepts exactly the whole balance', () => {
    expect(validateCashAmount('20', 20)).toEqual({ amount: 20, error: null });
  });

  it('asks for an amount when empty', () => {
    expect(validateCashAmount('', 20).error).toBe('Enter an amount.');
  });

  it('rejects text, negatives and fractions of a penny', () => {
    expect(validateCashAmount('abc', 20).error).toMatch(/pounds and pence/);
    expect(validateCashAmount('-5', 20).error).toMatch(/pounds and pence/);
    expect(validateCashAmount('1.005', 20).error).toMatch(/pounds and pence/);
  });

  it('rejects zero', () => {
    expect(validateCashAmount('0', 20).error).toBe('The amount must be more than £0.');
  });

  it('cannot go over the balance and says how much they can ask for', () => {
    expect(validateCashAmount('20.01', 20).error).toBe('You can request up to £20.00.');
  });

  it('never suggests a negative limit when the balance is below zero', () => {
    expect(validateCashAmount('1', -4).error).toBe('You can request up to £0.00.');
  });
});

describe('calculateKitDiscount', () => {
  it('covers the whole item when the balance is enough', () => {
    expect(calculateKitDiscount(20, 50, 1)).toEqual({
      commissionSpent: 20,
      discountValue: 20,
      amountToPay: 0,
    });
  });

  it('gives a partial discount when the item costs more than the balance', () => {
    expect(calculateKitDiscount(30, 12, 1)).toEqual({
      commissionSpent: 12,
      discountValue: 12,
      amountToPay: 18,
    });
  });

  it('spends nothing and pays full price with no balance', () => {
    expect(calculateKitDiscount(30, 0, 1)).toEqual({
      commissionSpent: 0,
      discountValue: 0,
      amountToPay: 30,
    });
    expect(calculateKitDiscount(30, -5, 1).commissionSpent).toBe(0);
  });

  it('with a boost, spends less commission to cover the item', () => {
    expect(calculateKitDiscount(30, 100, 1.25)).toEqual({
      commissionSpent: 24,
      discountValue: 30,
      amountToPay: 0,
    });
  });

  it('with a boost, a partial discount is worth more than the commission spent', () => {
    expect(calculateKitDiscount(30, 12, 1.25)).toEqual({
      commissionSpent: 12,
      discountValue: 15,
      amountToPay: 15,
    });
  });

  it('never discounts more than the item costs, even when prices do not divide evenly', () => {
    const result = calculateKitDiscount(19.99, 100, 1.25);
    expect(result.discountValue).toBeLessThanOrEqual(19.99);
    expect(result.commissionSpent * 1.25).toBeLessThanOrEqual(19.99);
  });

  it('keeps the penny when floating point would drop it', () => {
    expect(calculateKitDiscount(0.29, 100, 1).commissionSpent).toBe(0.29);
  });
});

describe('describeRequest', () => {
  it('describes a cash request', () => {
    expect(describeRequest(buildRequest())).toBe('Cash payout of £10.00');
  });

  it('describes a kit request with its item and discount', () => {
    const request = buildRequest({
      request_type: 'kit',
      amount: 12,
      kit_credit_value: 15,
      kit_item_name: 'Shorts',
    });
    expect(describeRequest(request)).toBe('Shorts: £12.00 commission for £15.00 off');
  });

  it('copes with a kit request that has no item', () => {
    const request = buildRequest({ request_type: 'kit', amount: 5 });
    expect(describeRequest(request)).toBe('Kit: £5.00 commission for £5.00 off');
  });
});

describe('status helpers', () => {
  it('labels every status in plain words', () => {
    expect(statusLabel('pending')).toBe('Waiting for approval');
    expect(statusLabel('approved')).toBe('Approved');
    expect(statusLabel('paid')).toBe('Paid');
    expect(statusLabel('rejected')).toBe('Not approved');
  });

  it('picks a pill style for each status', () => {
    expect(statusClassName('pending')).toBe('status-pending');
    expect(statusClassName('rejected')).toBe('status-rejected');
    expect(statusClassName('approved')).toBe('status-approved');
    expect(statusClassName('paid')).toBe('status-approved');
  });
});

describe('formatAmountInput', () => {
  it('adds the pence', () => {
    expect(formatAmountInput('20')).toBe('20.00');
    expect(formatAmountInput('7.5')).toBe('7.50');
    expect(formatAmountInput('0.5')).toBe('0.50');
  });

  it('leaves a complete amount as it is', () => {
    expect(formatAmountInput('12.34')).toBe('12.34');
  });

  it('trims spaces around a valid amount', () => {
    expect(formatAmountInput(' 20 ')).toBe('20.00');
  });

  it('leaves anything invalid untouched so the ambassador can see it', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('abc')).toBe('abc');
    expect(formatAmountInput('1.005')).toBe('1.005');
    expect(formatAmountInput('-5')).toBe('-5');
  });
});
