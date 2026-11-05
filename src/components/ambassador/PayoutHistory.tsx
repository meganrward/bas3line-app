import { describeRequest, statusClassName, statusLabel } from '../../lib/redeem.utils';
import { formatSaleDate } from '../../lib/sales.utils';
import { PayoutRequest } from '../../lib/types';

export function PayoutHistory({ requests }: Readonly<{ requests: readonly PayoutRequest[] }>) {
  if (requests.length === 0) {
    return <p className="text-muted">No requests yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-gray-100">
      {requests.map((request) => (
        <li key={request.id} className="flex items-start justify-between gap-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-900">{describeRequest(request)}</span>
            <span className="text-hint">{formatSaleDate(request.created_at)}</span>
            {request.status === 'rejected' && request.sponsor_note && (
              <span className="text-hint">Note from the team: {request.sponsor_note}</span>
            )}
          </div>
          <span className={statusClassName(request.status)}>{statusLabel(request.status)}</span>
        </li>
      ))}
    </ul>
  );
}
