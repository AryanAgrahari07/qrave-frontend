import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { canAccessFeature, getPlanLimits, type PlanFeatures, type PlanLimits } from "@/lib/plan-config";

type Subscription = {
    plan: string;
    subscriptionValidUntil: string | null;
    subscriptionStatus: "ACTIVE" | "EXPIRED" | "GRACE_PERIOD" | "PENDING";
    isEligibleForTrial?: boolean;
    limits?: PlanLimits;
};

type SubscriptionContextValue = {
    subscription: Subscription | null;
    isLoading: boolean;
    isExpired: boolean;
    refetch: () => void;
    /** Check if a feature is accessible on the current plan. */
    canAccess: (feature: keyof PlanFeatures) => boolean;
    /** Get the current plan's limits object. */
    planLimits: PlanLimits;
    /** Shorthand: current plan name (e.g. 'STARTER', 'PRO', 'MAX'). */
    currentPlan: string;
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

    const isExpired = useMemo(() => {
        if (!subscription) return false;
        if (subscription.subscriptionStatus === "EXPIRED") return true;
        if (!subscription.subscriptionValidUntil) return false;
        return new Date(subscription.subscriptionValidUntil) < new Date();
    }, [subscription?.subscriptionStatus, subscription?.subscriptionValidUntil]);

    const currentPlan = subscription?.plan || "STARTER";

    const canAccess = useCallback(
        (feature: keyof PlanFeatures) => canAccessFeature(currentPlan, feature),
        [currentPlan]
    );

    // Use API-returned limits if available, otherwise fall back to local config
    const planLimits = useMemo(
        () => subscription?.limits || getPlanLimits(currentPlan),
        [subscription?.limits, currentPlan]
    );

    const value = useMemo(() => ({
        subscription: subscription || null,
        isLoading: Boolean(isReady && user && restaurantId && isLoading),
        isExpired,
        refetch,
        canAccess,
        planLimits,
        currentPlan,
    }), [subscription, isReady, user, restaurantId, isLoading, isExpired, refetch, canAccess, planLimits, currentPlan]);

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
    return context;
}
