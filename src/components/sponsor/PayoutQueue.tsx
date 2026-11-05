import { usePayoutQueue } from '../../hooks/usePayoutQueue';
import { splitPayoutQueue } from '../../lib/payoutQueue.utils';
import { PayoutQueueItem } from '../../lib/types';
import { PayoutQueueRow } from './PayoutQueueRow';

interface SectionProps {
  title: string;
  hint?: string;
  emptyMessage: string;
  items: readonly PayoutQueueItem[];
  onChanged: () => void;
}

function PayoutSection({ title, hint, emptyMessage, items, onChanged }: Readonly<SectionProps>) {
  const headingId = `payout-section-${title.toLowerCase().replaceAll(/\W+/g, '-')}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="heading-section">
        {title} ({items.length})
      </h2>
      {hint && <p className="text-hint">{hint}</p>}
      {items.length === 0 ? (
        <p className="text-muted">{emptyMessage}</p>
      ) : (
        <ul className="card divide-y divide-gray-100">
          {items.map((item) => (
            <PayoutQueueRow key={item.id} item={item} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function PayoutQueue() {
  const { items, loading, reload } = usePayoutQueue();

  if (loading) return <div className="spinner" />;

  const { pending, approved, history } = splitPayoutQueue(items);

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="heading-page">Payouts</h1>
        <p className="text-muted mt-1">
          Approving takes the amount off the ambassador’s commission balance. Pay them yourself,
          then mark it paid.
        </p>
      </div>

      <PayoutSection
        title="Waiting for approval"
        emptyMessage="Nothing waiting."
        items={pending}
        onChanged={reload}
      />
      <PayoutSection
        title="Approved, to pay"
        hint="These are approved and already taken off the balance. Mark them paid once you have sent the money, or undo the approval to put one back to waiting and give the commission back."
        emptyMessage="Nothing to pay."
        items={approved}
        onChanged={reload}
      />
      <PayoutSection
        title="History"
        emptyMessage="No finished requests yet."
        items={history}
        onChanged={reload}
      />
    </div>
  );
}
