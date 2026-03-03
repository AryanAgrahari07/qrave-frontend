import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

type Subscription = {
    plan: string;
    subscriptionValidUntil: string | null;
    subscriptionStatus: "ACTIVE" | "EXPIRED" | "GRACE_PERIOD" | "PENDING";
};

type SubscriptionContextValue = {
    subscription: Subscription | null;
    isLoading: boolean;
    isExpired: boolean;
    refetch: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { isReady, user, restaurantId } = useAuth();

    const { data: subscription, isLoading, refetch } = useQuery({
        queryKey: ["subscription", restaurantId],
        queryFn: async () => {
            const res = await api.get<Subscription>(`/api/subscriptions/${restaurantId}/current`);
            return res;
        },
        enabled: isReady && !!user && !!restaurantId,
        retry: false,
    });

    const now = new Date();

    // Implicitly active if validUntil is null and status is not EXPIRED
    const isExpired = Boolean(
        subscription && (
            subscription.subscriptionStatus === "EXPIRED" ||
            (subscription.subscriptionValidUntil && new Date(subscription.subscriptionValidUntil) < now)
        )
    );

    return (
        <SubscriptionContext.Provider value={{
            subscription: subscription || null,
            isLoading: Boolean(isReady && user && restaurantId && isLoading),
            isExpired,
            refetch,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
    return context;
}
