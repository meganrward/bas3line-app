import { useState } from 'react';
import { exceedsBalance } from '../../lib/payoutQueue.utils';
import { approvePayout, markPayoutPaid, rejectPayout } from '../../lib/queries';
import { describeRequest, statusClassName, statusLabel } from '../../lib/redeem.utils';
import { formatGBP, formatSaleDate } from '../../lib/sales.utils';
import { PayoutQueueItem } from '../../lib/types';

interface Props {
  item: PayoutQueueItem;
  onChanged: () => void;
}

export function PayoutQueueRow({ item, onChanged }: Readonly<Props>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const shortfall = exceedsBalance(item);

  async function run(action: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setRejecting(false);
    onChanged();
  }

  return (
    <li className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-900">
            {item.ambassador_name ?? 'Unknown ambassador'}
          </span>
          <span className="text-sm text-gray-700">{describeRequest(item)}</span>
          {item.note && <span className="text-muted">“{item.note}”</span>}
          <span className="text-hint">
            Asked {formatSaleDate(item.created_at)} · their balance is{' '}
            {formatGBP(item.ambassador_balance)}
          </span>
          {item.sponsor_note && <span className="text-hint">Your note: {item.sponsor_note}</span>}
        </div>
        <span className={statusClassName(item.status)}>{statusLabel(item.status)}</span>
      </div>

      {shortfall && (
        <p className="alert-error">
          Their balance is now lower than this request (a refund may have landed), so it can’t be
          approved. You can reject it and ask them to request again.
        </p>
      )}
      {error && <p className="alert-error">{error}</p>}

      {item.status === 'pending' && !rejecting && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-success"
            disabled={busy || shortfall}
            onClick={() => run(() => approvePayout(item.id))}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            Reject
          </button>
        </div>
      )}

      {item.status === 'pending' && rejecting && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`reject-note-${item.id}`} className="input-label">
            Reason (optional, the ambassador sees this)
          </label>
          <textarea
            id={`reject-note-${item.id}`}
            className="input"
            rows={2}
            maxLength={500}
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => run(() => rejectPayout(item.id, rejectNote.trim() || null))}
            >
              Confirm reject
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => setRejecting(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {item.status === 'approved' && (
        <div>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => run(() => markPayoutPaid(item.id))}
          >
            Mark paid
          </button>
        </div>
      )}
    </li>
  );
}
