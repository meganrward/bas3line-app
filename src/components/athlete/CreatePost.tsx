import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PostType } from '../../lib/types';

export function CreatePost() {
  const { user } = useAuth();
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadPostTypes() {
      const { data: athleteProfileData } = await supabase
        .from('athlete_profiles')
        .select('sponsor_id')
        .eq('id', user!.id)
        .single();

      const sponsorId = (athleteProfileData as { sponsor_id: string } | null)?.sponsor_id;
      if (!sponsorId) return;

      const { data } = await supabase
        .from('post_types')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true)
        .order('name');

      const rows = (data ?? []) as unknown as PostType[];
      setPostTypes(rows);
      if (rows[0]) setSelectedTypeId(rows[0].id);
    }

    loadPostTypes();
  }, [user]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!user || !selectedTypeId) return;
    setError(null);
    setSubmitting(true);

    const insertResult = await supabase.from('posts').insert({
      athlete_id: user.id,
      post_type_id: selectedTypeId,
      title,
      content: content || null,
      link_url: linkUrl || null,
    } as any);

    if (insertResult.error) {
      setError(insertResult.error.message);
    } else {
      setSuccess(true);
      setTitle('');
      setContent('');
      setLinkUrl('');
    }

    setSubmitting(false);
  }

  const selectedType = postTypes.find(t => t.id === selectedTypeId);

  if (postTypes.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit a Post</h1>
        <p className="text-sm text-gray-500">No post types have been set up by your sponsor yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit a Post</h1>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-green-700 font-medium">Post submitted! Your sponsor will review it shortly.</p>
          <button onClick={() => setSuccess(false)} className="text-green-500 hover:text-green-700 text-xs underline">Submit another</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Post type</label>
          <select
            value={selectedTypeId}
            onChange={e => setSelectedTypeId(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          >
            {postTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name} — {t.points_value} pts</option>
            ))}
          </select>
          {selectedType?.description && (
            <p className="mt-1 text-xs text-gray-500">{selectedType.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Madrid Open — Round of 16 result"
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            rows={3}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add any extra context…"
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit post'}
        </button>
      </form>
    </div>
  );
}
