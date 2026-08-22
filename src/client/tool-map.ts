/**
 * Tool map — per-tool "make one yourself" info for the vibecoded corner card.
 *
 * Keyed on the 8 real corpus `built_with` values. Each entry carries the tool's
 * official site URL and a plain, italic dot-separated time cue (no marketing
 * superlatives). `getToolInfo` returns the info for a mapped value, or `null`
 * for anything unmapped (so callers omit the whole make-one block).
 *
 * URLs + cues APPROVED verbatim (Final Cut, design §3.2). DOM-free — safe to
 * import anywhere on the client.
 */
export interface ToolInfo {
  url: string; // official site
  timeCue: string; // italic dot-separated fragments
}

export const TOOL_MAP: Record<string, ToolInfo> = {
  lovable:            { url: "https://lovable.dev",             timeCue: "type what you want · free to start · a site by tonight" },
  bolt:               { url: "https://bolt.new",                timeCue: "prompt in the browser · free to start · a site by tonight" },
  godaddy_airo:       { url: "https://www.godaddy.com/airo",    timeCue: "guided setup · a site in an afternoon" },
  cursor:             { url: "https://cursor.com",              timeCue: "an AI editor pair-codes with you · free tier · a weekend project" },
  claude_code:        { url: "https://claude.com/claude-code",  timeCue: "an AI agent codes in your terminal · you review, it builds" },
  kiro:               { url: "https://kiro.dev",                timeCue: "spec it, agents build it — this site's own recipe" },
  cloudflare_workers: { url: "https://workers.cloudflare.com",  timeCue: "for developers · free tier · deploys in minutes" },
  fly:                { url: "https://fly.io",                  timeCue: "for developers · runs apps near your visitors" },
};

export function getToolInfo(value: string): ToolInfo | null {
  return TOOL_MAP[value] ?? null;
}

/**
 * Corner-mode MAKE ONE YOURSELF lead line, keyed off the SITE's tier
 * (`getBuiltWithTier(built_with)`), not the tool. `{Tool}` is substituted with
 * the linked `getBuiltWithLabel(built_with)`. Note tier 4 uses "See {Tool} →"
 * rather than "Try {Tool} →".
 *
 * Copy APPROVED verbatim (Final Cut, design §3.1).
 */
export const LEAD_LINE_BY_TIER: Record<number, string> = {
  1: "This site was described into existence. Try {Tool} →",
  2: "This site was prompted together in the browser. Try {Tool} →",
  3: "This site was pair-coded with AI. Try {Tool} →",
  4: "This site was built by AI agents on a developer platform. See {Tool} →",
};
