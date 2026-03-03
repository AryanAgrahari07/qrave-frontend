import React, { useEffect } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const { isExpired, isLoading } = useSubscription();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!isLoading && isExpired) {
            setLocation("/admin/subscription-expired");
        }
    }, [isExpired, isLoading, setLocation]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isExpired) {
        // Avoid flash of protected content before unmount/redirect
        return null;
    }

    return <>{children}</>;
}
