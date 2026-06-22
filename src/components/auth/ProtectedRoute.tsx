import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../lib/types";

interface Props {
  role: UserRole;
  children: React.ReactNode;
}

export function ProtectedRoute({ role, children }: Props) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== role) {
    return (
      <Navigate
        to={profile?.role === "sponsor" ? "/sponsor" : "/athlete"}
        replace
      />
    );
  }

  return <>{children}</>;
}
