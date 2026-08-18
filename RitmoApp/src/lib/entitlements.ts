// Subscription plans + what each unlocks. This is the single source of truth the
// whole app checks against. Billing is mocked for now (subscribing just sets the
// plan locally); later this gets wired to RevenueCat / App Store / Play billing
// without changing the gating logic below.

import type { Tier } from "../data/presets";

// MASTER SWITCH for subscriptions/paywall. While the app is still being built,
// this is OFF: nothing is locked, creations are unlimited, and no pay options
// show anywhere. Flip to true when you're ready to charge (and wire real
// billing). Everything else in this file stays ready for that day.
export const BILLING_ENABLED = false;

export type PlanId = "free" | "basic" | "plus" | "unlimited";

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  levels: Tier[]; // which lesson levels are unlocked
  creations: number; // songs the user may create per month
  monthly: number; // USD (0 = free)
  annual: number; // USD
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  { id: "free", name: "Free", blurb: "First Words + Starter", levels: ["prestarter", "starter"], creations: 2, monthly: 0, annual: 0 },
  { id: "basic", name: "Basic", blurb: "Through the Explorer level", levels: ["prestarter", "starter", "beginner"], creations: 15, monthly: 4.99, annual: 49 },
  { id: "plus", name: "Plus", blurb: "All 5 levels", levels: ["prestarter", "starter", "beginner", "intermediate", "advanced"], creations: 50, monthly: 9.99, annual: 99, highlight: true },
  { id: "unlimited", name: "Unlimited", blurb: "All levels + tons of songs", levels: ["prestarter", "starter", "beginner", "intermediate", "advanced"], creations: 300, monthly: 19.99, annual: 199 },
];

export const getPlan = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const planName = (id: PlanId): string => getPlan(id).name;
export const levelUnlocked = (id: PlanId, tier: Tier): boolean => getPlan(id).levels.includes(tier);
export const creationCap = (id: PlanId): number => getPlan(id).creations;

// A calendar-month key like "2026-8" used to reset the monthly creation count.
export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}
