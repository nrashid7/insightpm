import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({ children, redirectTo = "/auth" }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
