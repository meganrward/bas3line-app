import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PostType } from '../../lib/types';
import { loadPostTypes } from '../../lib/queries';

export function PostTypeManager() {
  const { sponsorId, loading: authLoading } = useAuth();
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPoints, setNewPoints] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      if (!sponsorId) { setLoading(false); return; }
      setPostTypes(await loadPostTypes(sponsorId));
      setLoading(false);
    }

    load();
  }, [authLoading, sponsorId]);

  async function handleAdd(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!sponsorId || !newName.trim()) return;
    setError(null);
    setAdding(true);

    const result = await supabase.from('post_types').insert({
      sponsor_id: sponsorId,
      name: newName.trim(),
      points_value: parseInt(newPoints) || 0,
      description: newDescription.trim() || null,
      is_active: true,
    } as any);

    if (result.error) {
      setError(result.error.message);
    } else {
      setNewName('');
      setNewPoints('');
      setNewDescription('');
      setPostTypes(await loadPostTypes(sponsorId));
    }
    setAdding(false);
  }

  async function toggleActive(postType: PostType) {
    const result = await (supabase.from('post_types') as any)
      .update({ is_active: !postType.is_active })
      .eq('id', postType.id);
    if (result.error) { setError(result.error.message); return; }
    setPostTypes(prev => prev.map(pt => pt.id === postType.id ? { ...pt, is_active: !pt.is_active } : pt));
  }

  async function handleDelete(postTypeId: string) {
    const result = await supabase.from('post_types').delete().eq('id', postTypeId);
    if (result.error) { setError(result.error.message); return; }
    setPostTypes(prev => prev.filter(pt => pt.id !== postTypeId));
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Post Types</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-5 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Add post type</h2>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Name (e.g. Instagram Reel)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="col-span-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
          <div className="relative">
            <input
              type="number"
              min="0"
              required
              placeholder="Points"
              value={newPoints}
              onChange={e => setNewPoints(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">pts</span>
          </div>
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDescription}
          onChange={e => setNewDescription(e.target.value)}
          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={adding} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {adding ? 'Adding…' : 'Add post type'}
          </button>
        </div>
      </form>

      {postTypes.length === 0 ? (
        <p className="text-sm text-gray-500">No post types yet.</p>
      ) : (
        <ul className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {postTypes.map(postType => (
            <li key={postType.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${postType.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{postType.name}</p>
                  {postType.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{postType.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <span className="text-sm font-semibold text-brand-700">{postType.points_value} pts</span>
                <button onClick={() => toggleActive(postType)} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
                  {postType.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(postType.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
