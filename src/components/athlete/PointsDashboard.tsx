import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { loadPointsDashboard } from "../../lib/queries";
import { PointsTransaction } from "../../lib/types";

export function PointsDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { balance: bal, transactions: txns } = await loadPointsDashboard(
        user!.id,
      );
      setBalance(bal);
      setTransactions(txns);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="heading-page">Points</h1>

      <div className="points-card">
        <p className="text-sm font-medium opacity-80">Current balance</p>
        <p className="text-5xl font-bold mt-1">{balance ?? 0}</p>
        <p className="text-sm opacity-70 mt-1">points</p>
      </div>

      <div>
        <h2 className="heading-section mb-3">History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No points earned yet. Submit posts to start earning.
          </p>
        ) : (
          <ul className="card divide-y divide-gray-100">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <p className="text-sm text-gray-900">
                    {transaction.description ?? "Points awarded"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${transaction.points >= 0 ? "text-green-600" : "text-red-500"}`}
                >
                  {transaction.points >= 0 ? "+" : ""}
                  {transaction.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
