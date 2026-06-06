import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { VoucherCode } from '../../lib/types';

interface VoucherWithStatus extends VoucherCode {
  canAfford: boolean;
}

export function VoucherRedemption() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<VoucherWithStatus[]>([]);
  const [redeemedVouchers, setRedeemedVouchers] = useState<VoucherCode[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [revealedCode, setRevealedCode] = useState<{ id: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;

    const [athleteProfileResult, voucherData] = await Promise.all([
      supabase.from('athlete_profiles').select('points_balance').eq('id', user.id).single(),
      supabase.from('voucher_codes').select('*').order('points_required'),
    ]);

    const currentBalance = (athleteProfileResult.data as any)?.points_balance ?? 0;
    setBalance(currentBalance);

    const allVouchers = (voucherData.data ?? []) as VoucherCode[];
    setVouchers(
      allVouchers
        .filter(voucher => !voucher.is_used)
        .map(voucher => ({ ...voucher, canAfford: currentBalance >= voucher.points_required }))
    );
    setRedeemedVouchers(allVouchers.filter(voucher => voucher.is_used && voucher.used_by === user.id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRedeem(voucher: VoucherWithStatus) {
    setError(null);
    setRedeeming(voucher.id);

    const { data: errorMessage } = await (supabase as any).rpc('redeem_voucher', { voucher_id: voucher.id });

    if (errorMessage) {
      setError(errorMessage as string);
    } else {
      setRevealedCode({ id: voucher.id, code: voucher.code });
      await load();
    }

    setRedeeming(null);
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
        <span className="text-sm text-gray-500">Balance: <span className="font-semibold text-brand-700">{balance} pts</span></span>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {revealedCode && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm font-medium text-green-800 mb-2">Your voucher code:</p>
          <p className="text-2xl font-bold text-green-900 tracking-widest font-mono">{revealedCode.code}</p>
          <p className="text-xs text-green-600 mt-2">Copy this code and use it at checkout on the Bas3line website.</p>
          <button onClick={() => setRevealedCode(null)} className="mt-3 text-xs text-green-600 hover:text-green-800 underline">Dismiss</button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Available vouchers</h2>
        {vouchers.length === 0 ? (
          <p className="text-sm text-gray-500">No vouchers available right now.</p>
        ) : (
          <ul className="space-y-3">
            {vouchers.map(voucher => (
              <li key={voucher.id} className={`bg-white rounded-xl shadow-sm p-5 flex items-center justify-between gap-4 ${!voucher.canAfford ? 'opacity-60' : ''}`}>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{voucher.description ?? 'Voucher'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{voucher.points_required} pts required</p>
                  {!voucher.canAfford && (
                    <p className="text-xs text-gray-400 mt-1">You need {voucher.points_required - balance} more points</p>
                  )}
                </div>
                <button
                  onClick={() => handleRedeem(voucher)}
                  disabled={!voucher.canAfford || redeeming === voucher.id}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {redeeming === voucher.id ? 'Redeeming…' : 'Redeem'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {redeemedVouchers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Redeemed</h2>
          <ul className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {redeemedVouchers.map(voucher => (
              <li key={voucher.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{voucher.description ?? 'Voucher'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Redeemed {voucher.used_at ? new Date(voucher.used_at).toLocaleDateString() : ''}</p>
                </div>
                <span className="font-mono text-sm text-gray-500">{voucher.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
