import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PostStatus } from '../../lib/types';

interface PostRow {
  id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  status: PostStatus;
  points_awarded: number | null;
  created_at: string;
  post_type_name: string;
}

const statusStyles: Record<PostStatus, { label: string; classes: string }> = {
  pending:  { label: 'Pending',  classes: 'bg-yellow-50 text-yellow-700' },
  approved: { label: 'Approved', classes: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', classes: 'bg-red-50 text-red-600' },
};

export function MyPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data } = await supabase
        .from('posts')
        .select('id, title, content, link_url, status, points_awarded, created_at, post_types(name)')
        .eq('athlete_id', user!.id)
        .order('created_at', { ascending: false });

      setPosts(
        (data ?? []).map((row: any) => ({
          ...row,
          post_type_name: row.post_types?.name ?? '—',
        }))
      );
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Posts</h1>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-500">No posts yet. Head to <span className="font-medium">Submit Post</span> to get started.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map(post => {
            const statusStyle = statusStyles[post.status];
            return (
              <li key={post.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{post.post_type_name} · {new Date(post.created_at).toLocaleDateString()}</p>
                    {post.content && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.content}</p>}
                    {post.link_url && (
                      <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline mt-1 inline-block truncate max-w-xs">
                        {post.link_url}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.classes}`}>
                      {statusStyle.label}
                    </span>
                    {post.status === 'approved' && post.points_awarded != null && (
                      <span className="text-xs font-semibold text-brand-700">+{post.points_awarded} pts</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
