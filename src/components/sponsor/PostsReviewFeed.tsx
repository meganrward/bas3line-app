import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { loadPendingPosts } from '../../lib/queries';
import { PendingPost } from '../../lib/queryTypes';
import { useAuth } from '../../hooks/useAuth';

export function PostsReviewFeed() {
  const { sponsorId, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      if (!sponsorId) { setLoading(false); return; }
      setPosts(await loadPendingPosts(sponsorId));
      setLoading(false);
    }
    load();
  }, [authLoading, sponsorId]);

  async function handleApprove(postId: string) {
    setError(null);
    setActioning(postId);
    const result = await (supabase as any).rpc('approve_post', { post_id: postId });
    if (result.error) {
      setError(result.error.message);
    } else {
      setPosts(prev => prev.filter(post => post.id !== postId));
    }
    setActioning(null);
  }

  async function handleReject(postId: string) {
    setError(null);
    setActioning(postId);
    const result = await (supabase.from('posts') as any)
      .update({ status: 'rejected' })
      .eq('id', postId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setPosts(prev => prev.filter(post => post.id !== postId));
    }
    setActioning(null);
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Review Posts</h1>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-sm font-medium text-gray-900">All caught up!</p>
          <p className="text-sm text-gray-500 mt-1">No posts waiting for review.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map(post => (
            <li key={post.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{post.athlete_name ?? 'Unknown athlete'}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">{post.post_type_name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                      +{post.points_value} pts
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-2">{post.title}</p>
                  {post.content && <p className="text-sm text-gray-600 mt-1">{post.content}</p>}
                  {post.link_url && (
                    <a
                      href={post.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline mt-1 inline-block truncate max-w-sm"
                    >
                      {post.link_url}
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(post.id)}
                    disabled={actioning === post.id}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actioning === post.id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(post.id)}
                    disabled={actioning === post.id}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
