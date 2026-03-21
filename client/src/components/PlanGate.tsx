import React from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import type { PlanFeatures } from "@/lib/plan-config";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface PlanGateProps {
  /** Feature name to check access for */
  feature: keyof PlanFeatures;
  /** Required plan to access this feature */
  requiredPlan?: string;
  /** Content to show when feature is accessible */
  children: React.ReactNode;
  /** Optional custom fallback. Defaults to an upgrade prompt. */
  fallback?: React.ReactNode;
  /** If true, renders nothing instead of an upgrade card when blocked */
  hidden?: boolean;
}

/**
 * Conditionally renders children only if the current plan has access to the given feature.
 * Shows an upgrade prompt otherwise.
 */
export function PlanGate({ feature, requiredPlan = "MAX", children, fallback, hidden = false }: PlanGateProps) {
  const { canAccess } = useSubscription();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (hidden) return null;

  if (fallback) return <>{fallback}</>;

  return <UpgradePrompt feature={feature} requiredPlan={requiredPlan} />;
}

interface UpgradePromptProps {
  feature: string;
  requiredPlan: string;
}

const FEATURE_LABELS: Record<string, string> = {
  waiter: "Waiter Management",
  kitchen: "Kitchen Display (KDS)",
  kds: "Kitchen Display System",
  kot: "KOT Printing",
  inventory: "Inventory Management",
  cookingNotes: "Cooking Notes",
};

function UpgradePrompt({ feature, requiredPlan }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const label = FEATURE_LABELS[feature] || feature;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {label} — {requiredPlan} Plan Feature
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md">
        This feature is not available on your current plan. Upgrade to <strong>{requiredPlan}</strong> to unlock {label.toLowerCase()} and more.
      </p>
      <Button
        onClick={() => setLocation("/admin/subscription-expired")}
        className="gap-2"
      >
        <Crown className="h-4 w-4" />
        Upgrade Plan
      </Button>
    </div>
  );
}
