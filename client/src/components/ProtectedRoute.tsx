import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, requiredRole, redirectTo = "/auth" }: ProtectedRouteProps) {
  const [_, setLocation] = useLocation();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    
    if (!user) {
      setLocation(redirectTo);
      return;
    }

    if (requiredRole && !requiredRole.includes(user.role)) {
      setLocation("/dashboard");
    }
  }, [user, isReady, requiredRole, redirectTo, setLocation]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (requiredRole && !requiredRole.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
