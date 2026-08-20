// Re-export tier logic from the single source of truth
export {
  BUILT_WITH_TIER,
  TIER_LABELS,
  getBuiltWithTier,
  getTierLabel,
} from "../shared/vibecoded-tiers";

/** Maps built_with snake_case IDs to human-friendly display labels. */
export const BUILT_WITH_LABELS: Record<string, string> = {
  // T1 — No-code AI builders
  squarespace_ai: "Squarespace AI",
  wix_adi: "Wix ADI",
  framer_ai: "Framer AI",
  godaddy_airo: "GoDaddy Airo",
  // T2 — AI app-builders
  lovable: "Lovable",
  v0: "v0",
  bolt: "Bolt",
  replit: "Replit",
  // T3 — AI-assisted + hosted
  claude_code: "Claude Code",
  cursor: "Cursor",
  kiro: "Kiro",
  github_copilot: "GitHub Copilot",
  // T4 — Developer cloud
  cloudflare_workers: "Cloudflare Workers",
  fly: "Fly.io",
};

/**
 * Returns the display label for a built_with value.
 * Falls through to raw value if unknown — never crashes.
 */
export function getBuiltWithLabel(value: string): string {
  return BUILT_WITH_LABELS[value] ?? value;
}
