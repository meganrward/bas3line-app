import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PointsTransaction } from '../../lib/types';

export function PointsDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [athleteProfileResult, transactionData] = await Promise.all([
        supabase
          .from('athlete_profiles')
          .select('points_balance')
          .eq('id', user!.id)
          .single(),
        supabase
          .from('points_transactions')
          .select('*')
          .eq('athlete_id', user!.id)
          .order('created_at', { ascending: false }),
      ]);

      setBalance((athleteProfileResult.data as any)?.points_balance ?? 0);
      setTransactions((transactionData.data ?? []) as PointsTransaction[]);
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Points</h1>

      <div className="bg-brand-600 rounded-xl p-6 text-white">
        <p className="text-sm font-medium opacity-80">Current balance</p>
        <p className="text-5xl font-bold mt-1">{balance ?? 0}</p>
        <p className="text-sm opacity-70 mt-1">points</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No points earned yet. Submit posts to start earning.</p>
        ) : (
          <ul className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {transactions.map(transaction => (
              <li key={transaction.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm text-gray-900">{transaction.description ?? 'Points awarded'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(transaction.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${transaction.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {transaction.points >= 0 ? '+' : ''}{transaction.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
