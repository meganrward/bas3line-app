import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { loadVouchers } from '../../lib/queries';
import { VoucherRow } from '../../lib/queryTypes';

export function VoucherManager() {
  const { sponsorId, loading: authLoading } = useAuth();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPoints, setNewPoints] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      if (!sponsorId) { setLoading(false); return; }
      setVouchers(await loadVouchers(sponsorId));
      setLoading(false);
    }

    load();
  }, [authLoading, sponsorId]);

  async function handleAdd(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!sponsorId || !newCode.trim()) return;
    setError(null);
    setAdding(true);

    const result = await supabase.from('voucher_codes').insert({
      sponsor_id: sponsorId,
      code: newCode.trim().toUpperCase(),
      description: newDescription.trim() || null,
      points_required: parseInt(newPoints) || 0,
    } as any);

    if (result.error) {
      setError(result.error.message);
    } else {
      setNewCode('');
      setNewDescription('');
      setNewPoints('');
      setVouchers(await loadVouchers(sponsorId));
    }
    setAdding(false);
  }

  async function handleDelete(voucherId: string) {
    const result = await supabase.from('voucher_codes').delete().eq('id', voucherId);
    if (result.error) { setError(result.error.message); return; }
    setVouchers(prev => prev.filter(voucher => voucher.id !== voucherId));
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const unusedVouchers = vouchers.filter(voucher => !voucher.is_used);
  const usedVouchers = vouchers.filter(voucher => voucher.is_used);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Vouchers</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-5 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Add voucher code</h2>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Code (e.g. BAS20)"
            value={newCode}
            onChange={e => setNewCode(e.target.value.toUpperCase())}
            className="font-mono block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
          <input
            type="text"
            placeholder="Description (e.g. 20% off)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
          <div className="relative">
            <input
              type="number"
              min="0"
              required
              placeholder="Points needed"
              value={newPoints}
              onChange={e => setNewPoints(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">pts</span>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={adding} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {adding ? 'Adding…' : 'Add voucher'}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Available ({unusedVouchers.length})</h2>
          {unusedVouchers.length === 0 ? (
            <p className="text-sm text-gray-500">No unused vouchers.</p>
          ) : (
            <ul className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {unusedVouchers.map(voucher => (
                <li key={voucher.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{voucher.code}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{voucher.description ?? '—'} · {voucher.points_required} pts required</p>
                  </div>
                  <button onClick={() => handleDelete(voucher.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {usedVouchers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Redeemed ({usedVouchers.length})</h2>
            <ul className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {usedVouchers.map(voucher => (
                <li key={voucher.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-500 line-through">{voucher.code}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {voucher.description ?? '—'} · redeemed by {voucher.used_by_name ?? 'unknown'}
                      {voucher.used_at ? ` on ${new Date(voucher.used_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
