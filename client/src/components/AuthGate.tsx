import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

/**
 * Redirects user immediately to the correct app area based on role.
 * Uses optimistic cached identity from AuthContext for instant launch.
 */
export function AuthGate() {
  const { user, isReady } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      setLocation("/auth");
      return;
    }

    if (user.role === "WAITER") setLocation("/waiter");
    else if (user.role === "KITCHEN") setLocation("/kitchen");
    else setLocation("/dashboard");
  }, [isReady, user, setLocation]);

  return null;
}
