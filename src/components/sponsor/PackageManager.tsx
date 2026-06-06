import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SponsorshipPackage } from '../../lib/types';

export function PackageManager() {
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [sponsorId, setSponsorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const sponsorResult = await supabase.from('sponsors').select('id').single();
    const resolvedSponsorId = (sponsorResult.data as any)?.id ?? null;
    setSponsorId(resolvedSponsorId);

    if (resolvedSponsorId) {
      const result = await supabase
        .from('sponsorship_packages')
        .select('*')
        .eq('sponsor_id', resolvedSponsorId)
        .order('name');
      setPackages((result.data ?? []) as SponsorshipPackage[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!sponsorId || !newName.trim()) return;
    setError(null);
    setAdding(true);

    const result = await supabase.from('sponsorship_packages').insert({
      sponsor_id: sponsorId,
      name: newName.trim(),
      description: newDescription.trim() || null,
    } as any);

    if (result.error) {
      setError(result.error.message);
    } else {
      setNewName('');
      setNewDescription('');
      await load();
    }
    setAdding(false);
  }

  async function handleDelete(packageId: string) {
    const result = await supabase.from('sponsorship_packages').delete().eq('id', packageId);
    if (result.error) { setError(result.error.message); return; }
    setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Packages</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-5 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Add package</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Name (e.g. Elite)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={adding} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {adding ? 'Adding…' : 'Add package'}
          </button>
        </div>
      </form>

      {packages.length === 0 ? (
        <p className="text-sm text-gray-500">No packages yet.</p>
      ) : (
        <ul className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {packages.map(pkg => (
            <li key={pkg.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{pkg.name}</p>
                {pkg.description && <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(pkg.id)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
