/**
 * Single source of truth: built_with → tier mapping.
 * DOM-free — safe for both client and worker.
 */
export const BUILT_WITH_TIER: Record<string, number> = {
  // T1 — No-code AI builders
  squarespace_ai: 1,
  wix_adi: 1,
  framer_ai: 1,
  godaddy_airo: 1,
  // T2 — AI app-builders
  lovable: 2,
  v0: 2,
  bolt: 2,
  replit: 2,
  // T3 — AI-assisted + hosted
  claude_code: 3,
  cursor: 3,
  kiro: 3,
  github_copilot: 3,
  // T4 — Developer cloud
  cloudflare_workers: 4,
  fly: 4,
};

/** Maps tier number to display label. */
export const TIER_LABELS: Record<number, string> = {
  1: "No-code AI builder",
  2: "AI app-builder",
  3: "AI-assisted + hosted",
  4: "Developer cloud",
};

/**
 * Derived reverse map: tier → built_with values in that tier.
 * Computed once at import time from BUILT_WITH_TIER.
 */
export const TIER_TO_BUILT_WITH: Record<number, string[]> = Object.entries(
  BUILT_WITH_TIER
).reduce(
  (acc, [key, tier]) => {
    (acc[tier] ??= []).push(key);
    return acc;
  },
  {} as Record<number, string[]>
);

/**
 * Expand tier numbers into the full list of built_with values.
 * Unknown tier numbers are silently ignored.
 */
export function expandTiers(tiers: number[]): string[] {
  const result: string[] = [];
  for (const t of tiers) {
    const values = TIER_TO_BUILT_WITH[t];
    if (values) result.push(...values);
  }
  return result;
}

/** Returns the tier number for a built_with value, or null if unknown. */
export function getBuiltWithTier(value: string): number | null {
  return BUILT_WITH_TIER[value] ?? null;
}

/** Returns the tier display label, or null if tier is unknown. */
export function getTierLabel(tier: number): string | null {
  return TIER_LABELS[tier] ?? null;
}
