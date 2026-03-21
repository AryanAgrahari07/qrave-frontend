/**
 * Plan Configuration (Frontend)
 * ─────────────────────────────
 * Mirrors backend plan-limits.js for client-side feature gating.
 * Values of -1 mean "unlimited" (serialized from Infinity).
 */

export type PlanName = "TRIAL" | "STARTER" | "PRO" | "MAX";

export type PlanFeatures = {
  waiter: boolean;
  kitchen: boolean;
  kds: boolean;
  kot: boolean;
  inventory: boolean;
  cookingNotes: boolean;
};

export type PlanLimits = {
  maxTables: number;
  maxMenuItems: number;
  maxQueueActive: number;
  maxTransactions: number;
  maxAdmins: number;
  features: PlanFeatures;
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  TRIAL: {
    maxTables: 5,
    maxMenuItems: 20,
    maxQueueActive: 10,
    maxTransactions: 50,
    maxAdmins: 2,
    features: {
      waiter: true,
      kitchen: true,
      kds: true,
      kot: true,
      inventory: true,
      cookingNotes: true,
    },
  },
  STARTER: {
    maxTables: 5,
    maxMenuItems: 20,
    maxQueueActive: 10,
    maxTransactions: 50,
    maxAdmins: 2,
    features: {
      waiter: true,
      kitchen: true,
      kds: true,
      kot: true,
      inventory: true,
      cookingNotes: true,
    },
  },
  PRO: {
    maxTables: -1,
    maxMenuItems: -1,
    maxQueueActive: -1,
    maxTransactions: -1,
    maxAdmins: 4,
    features: {
      waiter: false,
      kitchen: false,
      kds: false,
      kot: false,
      inventory: false,
      cookingNotes: false,
    },
  },
  MAX: {
    maxTables: -1,
    maxMenuItems: -1,
    maxQueueActive: -1,
    maxTransactions: -1,
    maxAdmins: -1,
    features: {
      waiter: true,
      kitchen: true,
      kds: true,
      kot: true,
      inventory: true,
      cookingNotes: true,
    },
  },
};

/**
 * Get limits for a plan. Falls back to TRIAL if unknown.
 */
export function getPlanLimits(planName: string | null | undefined): PlanLimits {
  const key = (planName || "STARTER").toUpperCase();
  return PLAN_LIMITS[key] || PLAN_LIMITS.TRIAL;
}

/**
 * Check if a feature is accessible for a given plan.
 * -1 values from the API also mean unlimited / true.
 */
export function canAccessFeature(planName: string | null | undefined, feature: keyof PlanFeatures): boolean {
  const limits = getPlanLimits(planName);
  return limits.features[feature] !== false;
}

/**
 * Get a numeric limit. Returns -1 for unlimited.
 */
export function getPlanLimit(planName: string | null | undefined, resource: keyof Omit<PlanLimits, "features">): number {
  const limits = getPlanLimits(planName);
  return limits[resource] ?? -1;
}

/**
 * Check if a limit is unlimited (Infinity on backend, -1 on frontend).
 */
export function isUnlimited(value: number): boolean {
  return value === -1 || value === Infinity;
}

/**
 * Plan display info for UI cards.
 */
export const PLAN_DISPLAY = {
  TRIAL: {
    name: "Trial",
    tagline: "7-Day Free Trial",
    badge: null,
    color: "green" as const,
  },
  PRO: {
    name: "Pro",
    tagline: "Billing & POS Only",
    badge: null,
    color: "blue" as const,
  },
  MAX: {
    name: "Max",
    tagline: "Everything Included",
    badge: "Most Popular",
    color: "primary" as const,
  },
};
