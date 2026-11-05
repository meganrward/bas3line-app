import { useState } from 'react';
import { formatAmountInput, MAX_NOTE_LENGTH, validateCashAmount } from '../../lib/redeem.utils';
import { requestPayout } from '../../lib/queries';
import { formatGBP } from '../../lib/sales.utils';

interface Props {
  availableBalance: number;
  onRequested: () => void;
}

export function RedeemCommissionForm({ availableBalance, onRequested }: Readonly<Props>) {
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const nothingToRequest = availableBalance <= 0;

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError(null);
    setConfirmation(null);

    const check = validateCashAmount(amountInput, availableBalance);
    if (check.error !== null) {
      setError(check.error);
      return;
    }

    setSubmitting(true);
    const { error: requestError } = await requestPayout({
      type: 'cash',
      amount: check.amount,
      note: note.trim() === '' ? null : note.trim(),
      kitItemId: null,
    });
    setSubmitting(false);

    if (requestError) {
      setError(requestError);
      return;
    }

    setAmountInput('');
    setNote('');
    setConfirmation('Request sent. The team will review it.');
    onRequested();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="alert-error">{error}</p>}
      {confirmation && <p className="alert-success">{confirmation}</p>}

      <div>
        <label htmlFor="cash-amount" className="input-label">
          Amount (£)
        </label>
        <input
          id="cash-amount"
          className="input max-w-xs"
          inputMode="decimal"
          placeholder="0.00"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          onBlur={() => setAmountInput(formatAmountInput(amountInput))}
        />
        <p className="text-hint mt-1">
          {formatGBP(Math.max(availableBalance, 0))} available to request.
        </p>
      </div>

      <div>
        <label htmlFor="request-note" className="input-label">
          Note (optional)
        </label>
        <textarea
          id="request-note"
          className="input"
          rows={2}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Anything we should know?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div>
        <button type="submit" className="btn-primary" disabled={submitting || nothingToRequest}>
          {submitting ? 'Sending…' : 'Request payout'}
        </button>
        {nothingToRequest && (
          <p className="text-hint mt-2">You have no commission available to request yet.</p>
        )}
      </div>
    </form>
  );
}
