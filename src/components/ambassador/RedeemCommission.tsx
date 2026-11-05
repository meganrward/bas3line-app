import { useRedeemCommission } from '../../hooks/useRedeemCommission';
import { formatGBP } from '../../lib/sales.utils';
import { PayoutHistory } from './PayoutHistory';
import { RedeemCommissionForm } from './RedeemCommissionForm';

// The bottom of the Sales tab: turn earned commission into a cash payout, and see past
// requests. The team pays out by hand once a request is approved.
export function RedeemCommission({ ambassadorId }: Readonly<{ ambassadorId: string }>) {
  const { data, loading, reload } = useRedeemCommission(ambassadorId);

  if (loading) return <div className="spinner" />;
  if (!data) return <p className="alert-error">Could not load your commission balance.</p>;

  const { balance, availableBalance, requests } = data;
  const pendingTotal = Math.round((balance.balance - availableBalance) * 100) / 100;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="heading-section">Redeem commission</h2>

      <div className="points-card flex flex-col gap-2">
        <p className="text-sm opacity-80">Available to redeem</p>
        <p className="text-3xl font-bold">{formatGBP(Math.max(availableBalance, 0))}</p>
        <p className="text-sm opacity-80">
          Earned {formatGBP(balance.totalEarned)} · Paid out {formatGBP(balance.totalPaidOut)}
          {pendingTotal > 0 && ` · ${formatGBP(pendingTotal)} waiting for approval`}
        </p>
        {balance.balance < 0 && (
          <p className="text-sm">
            A refund took your balance below zero. It will be taken off your future commission.
          </p>
        )}
      </div>

      <div className="card p-5">
        <RedeemCommissionForm availableBalance={availableBalance} onRequested={reload} />
      </div>

      <div className="card p-5 flex flex-col gap-2">
        <h3 className="heading-section">Your requests</h3>
        <PayoutHistory requests={requests} />
      </div>
    </section>
  );
}
