# Design Document: Vibecoded Corner

## Overview

The Vibecoded Corner adds a distinct surf mode for AI-built sites, layered non-destructively on top of the existing open-web surf. The implementation touches schema, seed, engine, API, UI, a self-referential colophon page, and an offline discovery sampler. The key architectural insight: the `vibecoded` flag (already in schema) partitions the corpus into two pools, and a new `built_with` column enables tier derivation at render time without storing tier itself.

## Architecture

```mermaid
graph TD
    subgraph "Data Layer"
        CSV[data/featured-sites.csv<br/>+built_with, +vibecoded columns]
        SEED[scripts/seed.ts<br/>UPSERT with built_with + vibecoded]
        D1[(Cloudflare D1<br/>sites table + built_with column)]
    end

    subgraph "Worker (deployed)"
        ENGINE[src/worker/engine/surf.ts<br/>+vibecoded filter, +tier filter]
        SURF_ROUTE[/api/surf<br/>?vibecoded=1&tier=2,3]
        FILTERS_ROUTE[/api/filters<br/>+corner_tiers response]
        OUROBOROS[/ouroboros<br/>standalone HTML colophon]
        SPA[Static assets<br/>React SPA]
    end

    subgraph "Client (SPA)"
        APP[App.tsx<br/>corner mode toggle]
        CORNER_UI[CornerMode.tsx<br/>tier buttons + YOLO]
        CARD[ProvenanceCard.tsx<br/>builder-first in corner]
        LABELS[vibecoded-labels.ts<br/>BUILT_WITH_LABELS, TIER map]
    end

    subgraph "Offline Dev Tools"
        SAMPLER[scripts/discover-vibecoded.ts<br/>CT log sampler]
        REPORT[data/vibecoded-candidates-report.md]
    end

    CSV -->|seed| SEED
    SEED -->|UPSERT| D1
    D1 --> ENGINE
    ENGINE --> SURF_ROUTE
    D1 --> FILTERS_ROUTE
    SURF_ROUTE --> APP
    FILTERS_ROUTE --> APP
    APP --> CORNER_UI
    APP --> CARD
    CARD --> LABELS
    SAMPLER -->|emit| REPORT
```

### Key Architectural Decisions

1. **`vibecoded` partitions the corpus** — default surf adds `WHERE vibecoded = 0`; corner adds `WHERE vibecoded = 1`. The two pools never mix in a single surf query.
2. **Tier is derived, never stored** — ONE canonical `BUILT_WITH_TIER` map lives in `src/shared/vibecoded-tiers.ts` (DOM-free, importable by both client and worker). The reverse map (`TIER_TO_BUILT_WITH`) and filter lookups are derived programmatically from that single source. No hand-duplicated copies.
3. **`/ouroboros` is a Worker route, not an SPA page** — it's a standalone HTML document so it works when opened in a new tab from surf (same as any other site URL).
4. **Discovery sampler is offline** — sibling to `detect-provenance.ts`, never deployed, emits a report for human review.
5. **CSV is source of truth** — `built_with` and `vibecoded` are CSV columns that flow through the seed into D1. No runtime writes.
6. **Corner hides build filters** — in corner mode the builder IS the star; the stack/host/static_or_dynamic filters are hidden (with ~50 sites they would mostly produce no-match). Mood and character filters remain.

## Components and Interfaces

### Schema Change (`schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mood_tags TEXT NOT NULL,
  character TEXT NOT NULL,
  stack TEXT,
  host TEXT,
  static_or_dynamic TEXT,
  built_with TEXT,
  why_note TEXT NOT NULL,
  nsfw INTEGER NOT NULL DEFAULT 0,
  vibecoded INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  added_at TEXT NOT NULL
);
```

Production migration (one-time):
```sql
ALTER TABLE sites ADD COLUMN built_with TEXT;
```

Note: `vibecoded` already exists. `built_with` is inserted after `static_or_dynamic`.

### Updated UPSERT Pattern (`seed-logic.ts`)

```sql
INSERT INTO sites (url, title, mood_tags, character, stack, host, static_or_dynamic, built_with, why_note, nsfw, vibecoded, source, tier, added_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(url) DO UPDATE SET
  title = excluded.title,
  mood_tags = excluded.mood_tags,
  character = excluded.character,
  stack = excluded.stack,
  host = excluded.host,
  static_or_dynamic = excluded.static_or_dynamic,
  built_with = excluded.built_with,
  why_note = excluded.why_note,
  nsfw = excluded.nsfw,
  vibecoded = excluded.vibecoded,
  source = excluded.source;
```

Columns NOT in UPDATE SET: `id`, `added_at`, `tier`.

### CSV Column Order (updated header)

```
url,title,mood_tags,character,stack,host,static_or_dynamic,built_with,why_note,nsfw,vibecoded,source
```

- `built_with`: after `static_or_dynamic`, before `why_note`
- `vibecoded`: after `nsfw`, before `source`
- Existing rows get blank `built_with` and `0` for `vibecoded` (no-op on existing corpus)

### Shared Tier Map — Single Source of Truth (`src/shared/vibecoded-tiers.ts`)

This is the ONE canonical module for the built_with→tier relationship. It has NO DOM
dependencies so it can be imported by both the client SPA and the Cloudflare Worker.

```typescript
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
```

### Client Labels Module (`src/client/vibecoded-labels.ts`)

Re-exports the shared tier logic and adds the display-only `BUILT_WITH_LABELS` map
(which is client-only since the server never renders labels).

```typescript
// Re-export tier logic from the single source of truth
export { BUILT_WITH_TIER, TIER_LABELS, getBuiltWithTier, getTierLabel } from "../shared/vibecoded-tiers";

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
```

### Server-Side Tier Usage (`src/worker/engine/tier-map.ts`)

Simply re-exports from the shared module — no hand-maintained copy:

```typescript
// Re-export everything the engine and filters route need
export { BUILT_WITH_TIER, TIER_TO_BUILT_WITH, expandTiers, getBuiltWithTier } from "../../shared/vibecoded-tiers";
```

### Updated Surf Engine (`src/worker/engine/surf.ts`)

```typescript
export interface SurfParams {
  mood?: string;
  character?: string;
  stacks?: string[];
  hosts?: string[];
  staticOrDynamic?: string;
  seen?: number[];
  /** true = corner mode (vibecoded=1 only); false/absent = open web (vibecoded=0). */
  vibecoded?: boolean;
  /** Tier numbers to filter within the corner. Ignored when vibecoded is not true. */
  tiers?: number[];
}

export interface SiteRow {
  id: number;
  url: string;
  title: string;
  mood_tags: string;
  character: string;
  stack: string | null;
  host: string | null;
  static_or_dynamic: string | null;
  built_with: string | null;
  why_note: string;
  nsfw: number;
  vibecoded: number;
  source: string;
  tier: string;
  added_at: string;
}
```

Changes to `buildFilterConditions()`:

```typescript
// Vibecoded partition — always applied
if (params.vibecoded) {
  conditions.push("vibecoded = 1");
} else {
  conditions.push("vibecoded = 0");
}

// Tier filter (only meaningful in corner mode)
if (params.vibecoded && params.tiers && params.tiers.length > 0) {
  const builtWithValues = expandTiers(params.tiers);
  if (builtWithValues.length > 0) {
    const placeholders = builtWithValues.map(() => "?").join(",");
    conditions.push(`built_with IN (${placeholders})`);
    bindings.push(...builtWithValues);
  } else {
    // All requested tiers are unknown — no rows can match
    conditions.push("1 = 0");
  }
}
```

### Updated API Route (`src/worker/routes/surf.ts`)

New query parameters:
- `vibecoded=1` → `params.vibecoded = true`
- `tier=2,3` → `params.tiers = [2, 3]`

```typescript
// Vibecoded: "1" activates corner mode
const vibecodedParam = c.req.query("vibecoded");
if (vibecodedParam === "1") {
  params.vibecoded = true;
}

// Tier: comma-separated integers, only relevant in corner mode
if (params.vibecoded) {
  const tierParam = c.req.query("tier");
  if (tierParam) {
    const tiers = tierParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4);
    if (tiers.length > 0) {
      params.tiers = tiers;
    }
  }
}
```

Response transform adds `built_with`:

```typescript
function transformSiteResponse(site: SiteRow) {
  return {
    id: site.id,
    url: site.url,
    title: site.title,
    why_note: site.why_note,
    mood_tags: site.mood_tags.split(";").filter((t) => t.length > 0),
    character: site.character,
    stack: site.stack ?? null,
    host: site.host ?? null,
    static_or_dynamic: site.static_or_dynamic ?? null,
    built_with: site.built_with ?? null,
  };
}
```

### Updated Filters Route (`src/worker/routes/filters.ts`)

Add a `corner_tiers` field to the response, importing from the shared tier module:

```typescript
import { BUILT_WITH_TIER } from "../../shared/vibecoded-tiers";

// Distinct tiers present among vibecoded=1 rows
const cornerBuiltWithResult = await c.env.DB.prepare(
  "SELECT DISTINCT built_with FROM sites WHERE vibecoded = 1 AND built_with IS NOT NULL AND built_with != '' ORDER BY built_with"
).all<{ built_with: string }>();

// Derive tiers from the built_with values present (using the shared map)
const cornerBuiltWithValues = cornerBuiltWithResult.results.map((r) => r.built_with);
const presentTiers = new Set<number>();
for (const bw of cornerBuiltWithValues) {
  const tier = BUILT_WITH_TIER[bw];
  if (tier) presentTiers.add(tier);
}

return c.json({
  stacks: ...,
  hosts: ...,
  static_or_dynamic: ...,
  corner_tiers: [...presentTiers].sort((a, b) => a - b),
});
```

### Ouroboros Route (`src/worker/routes/ouroboros.ts`)

A standalone HTML page served by the Worker at `/ouroboros`:

```typescript
import { Hono } from "hono";

export const ouroborosRoute = new Hono();

ouroborosRoute.get("/ouroboros", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Surfdeck — The Ouroboros</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; line-height: 1.6; }
    .glyph { font-size: 4rem; text-align: center; margin: 2rem 0; opacity: 0.3; }
    h1 { font-size: 1.5rem; }
    a { color: inherit; }
  </style>
</head>
<body>
  <div class="glyph" aria-hidden="true">&#x1F40D;</div>
  <h1>The loop closes.</h1>
  <p>You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner.</p>
  <p><a href="https://github.com/thekashifnazir/surfdeck">View the repo &amp; process log</a></p>
  <p class="note"><em>Glyph placeholder — the real ouroboros design comes in a later cycle.</em></p>
</body>
</html>`;
  return c.html(html);
});
```

Mounted in `index.ts` before the catch-all:

```typescript
app.route("", ouroborosRoute);
```

### UI — Corner Mode (structural only)

The App component gains a `cornerMode` boolean state:

```typescript
const [cornerMode, setCornerMode] = useState(false);
```

When `cornerMode` is true:
- The mood selector and character filter remain visible
- The stack/host/static_or_dynamic build filters are HIDDEN (in the corner the builder is the star; with ~50 sites those filters would mostly produce no-match)
- A `CornerTierFilter` component renders 4 tier buttons (multi-select) + a "YOLO" button
- The SurfButton passes `vibecoded=1` and selected tier(s) to the API
- A "Back to open-web surf" button exits corner mode

The `CornerTierFilter` component:

```typescript
interface CornerTierFilterProps {
  availableTiers: number[];
  selectedTiers: number[];
  onTierChange: (tiers: number[]) => void;
}
```

### ProvenanceCard — Builder-First in Corner

When the site has `built_with` (non-null):

```
┌──────────────────────────────────────┐
│ Built with Lovable                   │  ← primary (BUILT_WITH_LABELS)
│ AI app-builder · Tier 2              │  ← secondary (TIER_LABELS)
│ (runs: Next.js · Vercel · Static)    │  ← tertiary (existing provenance, demoted)
└──────────────────────────────────────┘
```

When `built_with` is null and `vibecoded = 0` (normal open-web site):

```
┌──────────────────────────────────────┐
│ Next.js · Vercel · Static            │  ← existing primary
│ "Hand-made on the open web."         │  ← existing fallback for all-blank
└──────────────────────────────────────┘
```

### Status Message — Ouroboros Treatment

When the surfed site's URL is `/ouroboros`:

```typescript
if (site.url === "/ouroboros") {
  // Show special copy instead of normal status
  statusCopy = "The loop closes — you surfed to the surfer.";
}
```

No special rarity code — it's one row in the pool, naturally rare.

### Discovery Sampler (`scripts/discover-vibecoded.ts`)

```typescript
// High-level flow
async function main() {
  // 1. Query crt.sh for recent certs on known vibecoded domains
  const domains = [
    { pattern: "%.lovable.app", built_with: "lovable", tier: 2 },
    { pattern: "%.bolt.host", built_with: "bolt", tier: 2 },
    { pattern: "%.vercel.app", built_with: null, tier: 3 },  // tool unknown
    { pattern: "%.netlify.app", built_with: null, tier: 3 },
    { pattern: "%.pages.dev", built_with: "cloudflare_workers", tier: 4 },
    { pattern: "%.fly.dev", built_with: "fly", tier: 4 },
  ];

  // 2. For each domain pattern, fetch crt.sh JSON API
  const candidates = await queryCrtSh(domains);

  // 3. Deduplicate against existing CSV URLs
  const existing = loadExistingUrls("data/featured-sites.csv");
  const novel = candidates.filter(c => !existing.has(c.url));

  // 4. Liveness + not-parked check (rate-limited, cached)
  const verified = await checkLiveness(novel);

  // 5. Sort by confidence, emit report
  writeReport(verified, "data/vibecoded-candidates-report.md");
}
```

#### crt.sh Query

```
GET https://crt.sh/?q=%.lovable.app&output=json
```

Returns certificate entries with `common_name` and `name_value` fields. Extract unique subdomains, construct URLs as `https://{subdomain}/`.

#### Liveness Filter

- Fetch with 10s timeout, `User-Agent: SurfdeckBot/0.1`
- Accept: HTTP 200-299
- Reject: parked page detection (check for common parking page signatures: "this domain is parked", "buy this domain", default hosting provider pages)
- Cache in `.vibecoded-cache/` (gitignored)

#### Report Format

```markdown
# Vibecoded Candidates Report

Generated: 2026-08-20T12:00:00Z
Candidates found: 142 | Live: 87 | Novel (not in CSV): 72

| url | built_with | tier | live? | evidence |
|-----|-----------|------|-------|----------|
| https://coolapp.lovable.app | lovable | 2 | yes | *.lovable.app domain; renders React app |
| https://mysite.pages.dev | cloudflare_workers | 4 | yes | *.pages.dev domain; serves content |
| https://parked.vercel.app | null | 3 | no | parking page detected |
```

## Data Models

### Updated `SurfSite` Interface (client)

```typescript
export interface SurfSite {
  id: number;
  url: string;
  title: string;
  why_note: string;
  mood_tags: string[];
  character: string;
  stack: string | null;
  host: string | null;
  static_or_dynamic: string | null;
  built_with: string | null;
}
```

### Updated `AvailableFilters` Interface (client)

```typescript
export interface AvailableFilters {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
  corner_tiers: number[];
}
```

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Unknown `built_with` value in DB | Label falls through to raw value; tier = null; no crash |
| `vibecoded=1` with NULL `built_with` | Card omits builder line; tier buttons don't match (site appears in unfiltered corner surf only) |
| `/ouroboros` request by non-browser | Returns HTML normally (it's just a page) |
| Sampler: crt.sh API unavailable | Script logs error, exits 0 with empty report |
| Sampler: candidate site unreachable | Marked `live? = no` in report, never suggested for CSV |
| Tier filter with no matching rows | Standard `no_match` response (existing UX) |

## Testing Strategy

### Engine Tests (additions to `src/worker/engine/surf.test.ts`)

1. **Default excludes vibecoded** — corpus has vibecoded=0 and vibecoded=1 rows; surf without `vibecoded` param returns only vibecoded=0.
2. **Corner returns only vibecoded** — surf with `vibecoded=true` returns only vibecoded=1 rows.
3. **Tier filter narrows corner** — T2 sites with `built_with=lovable`; tier=[2] returns them; tier=[4] does not.
4. **Seen-list in corner** — marking all corner IDs as seen returns `exhausted`.
5. **No-match in corner** — tier=[1] when no T1 sites exist returns `no_match`.

### Label/Tier Map Tests (`src/client/vibecoded-labels.test.ts`)

1. `getBuiltWithLabel("lovable")` → "Lovable"
2. `getBuiltWithLabel("claude_code")` → "Claude Code"
3. `getBuiltWithLabel("unknown_thing")` → "unknown_thing" (passthrough)
4. `getBuiltWithTier("lovable")` → 2
5. `getBuiltWithTier("unknown_thing")` → null
6. `getTierLabel(1)` → "No-code AI builder"
7. `getTierLabel(99)` → null

### Ouroboros Tests

1. GET `/ouroboros` returns 200 with HTML containing required text.
2. The Surfdeck row in the corner has `url = "/ouroboros"`.
3. Normal open-web ProvenanceCard does NOT show builder info.

### Sampler Pure-Function Tests (`scripts/discover-vibecoded.test.ts`)

1. Domain pattern `%.lovable.app` + cert common_name `coolapp.lovable.app` → built_with=lovable, tier=2.
2. Dedupe: candidate URL already in CSV → excluded from report.
3. Report sorted by tier ascending, then alphabetically.
4. Parked page detection: HTML containing "this domain is parked" → `live? = no`.

## File Structure (new/modified)

```
schema.sql                              # MODIFIED — add built_with TEXT column
scripts/
├── seed-logic.ts                       # MODIFIED — add built_with + vibecoded to UPSERT
├── discover-vibecoded.ts               # NEW — CT log sampler
└── discover-vibecoded.test.ts          # NEW — sampler pure-function tests

src/shared/
└── vibecoded-tiers.ts                  # NEW — single source of truth for built_with→tier

src/worker/
├── index.ts                            # MODIFIED — mount ouroborosRoute
├── engine/
│   ├── surf.ts                         # MODIFIED — vibecoded + tier filter
│   ├── surf.test.ts                    # MODIFIED — corner engine tests
│   └── tier-map.ts                     # NEW — re-exports from src/shared/vibecoded-tiers
└── routes/
    ├── surf.ts                         # MODIFIED — vibecoded + tier params
    ├── filters.ts                      # MODIFIED — corner_tiers in response (imports shared)
    └── ouroboros.ts                    # NEW — /ouroboros standalone page

src/client/
├── App.tsx                             # MODIFIED — cornerMode state + toggle; hide build filters in corner
├── vibecoded-labels.ts                 # NEW — BUILT_WITH_LABELS + re-exports from shared
├── vibecoded-labels.test.ts            # NEW — label/tier map tests
└── components/
    ├── CornerTierFilter.tsx            # NEW — tier multi-select buttons
    ├── ProvenanceCard.tsx              # MODIFIED — builder-first in corner mode
    └── StatusMessage.tsx               # MODIFIED — ouroboros treatment

data/
├── featured-sites.csv                  # MODIFIED — add built_with + vibecoded columns to ALL rows, add corner rows
└── vibecoded-candidates-report.md      # NEW (generated by sampler/vetting)

.vibecoded-cache/                       # NEW directory (gitignored)
.gitignore                              # MODIFIED — add .vibecoded-cache/
```

## Dependencies

No new runtime dependencies. The discovery sampler uses Node.js built-in `fetch` (Node 18+) and reuses the cache/rate-limit patterns from `detect-provenance.ts`. Playwright is used via the Playwright MCP server for vetting (not a project dependency).
