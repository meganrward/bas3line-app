import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { homePathForRole } from '../../lib/routes.utils';

// Landing route ("/"): sends each signed-in user to their own home.
export function RoleRedirect() {
  const { user, profile, loading } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const homePath = homePathForRole(profile?.role);
  if (homePath) return <Navigate to={homePath} replace />;

  // Signed in but no usable profile. Redirecting to /login would loop, because
  // the login page sends signed-in users straight back here.
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-sm space-y-4">
        <p className="alert-error">Your account isn&apos;t set up yet. Please contact Bas3line.</p>
        <button onClick={handleSignOut} className="btn-secondary w-full">
          Sign out
        </button>
      </div>
    </div>
  );
}
