# Design Document: Provenance Enrichment

## Overview

This feature adds an offline build-time detector (`scripts/detect-provenance.ts`) that fetches each of the 288 featured sites, applies a hand-authored rule set against passive client-observable signals (response headers, HTML fingerprints, public DNS CNAMEs), and emits a confidence-sorted report (`data/provenance-report.md`) for human review. After approval, a separate manual step writes the approved values into `data/featured-sites.csv`, which is then reseeded into D1 via the upgraded UPSERT seed script. The existing ProvenanceCard and BuildFilter components gain a `PROVENANCE_LABELS` display map so raw snake_case values render as readable text.

The detector is purely a local dev tool — it never ships in the deployed Worker.

## Architecture

```mermaid
graph TD
    subgraph "Developer Machine (offline)"
        CSV[data/featured-sites.csv<br/>288 URLs, provenance blank]
        DET[scripts/detect-provenance.ts<br/>Detector]
        CACHE[.provenance-cache/<br/>gitignored]
        REPORT[data/provenance-report.md<br/>committed]
    end

    subgraph "HTTP Targets"
        ROBOTS[robots.txt]
        HEAD[HEAD response]
        GET[GET HTML]
        DNS[Public DNS CNAME]
    end

    subgraph "After Human Review"
        CSV2[data/featured-sites.csv<br/>provenance populated]
        SEED[scripts/seed.ts<br/>UPSERT seed]
        D1[(Cloudflare D1)]
    end

    subgraph "Live App (unchanged API)"
        FILTERS[/api/filters<br/>auto-populates from D1]
        CARD[ProvenanceCard<br/>+ PROVENANCE_LABELS]
        BF[BuildFilter<br/>+ PROVENANCE_LABELS]
    end

    CSV -->|read URLs| DET
    DET -->|check| ROBOTS
    DET -->|1 HEAD| HEAD
    DET -->|1 GET| GET
    DET -->|CNAME lookup| DNS
    DET -->|cache responses| CACHE
    CACHE -->|reuse on re-run| DET
    DET -->|emit| REPORT
    REPORT -->|human approves| CSV2
    CSV2 -->|npx tsx scripts/seed.ts| SEED
    SEED -->|UPSERT| D1
    D1 --> FILTERS
    D1 --> CARD
    D1 --> BF
```

### Key Architectural Decisions

1. **Detector is NOT deployed** — it's a `scripts/` dev tool run with `npx tsx`. It has no Cloudflare Worker dependency.
2. **Detector does NOT edit the CSV** — it emits a report. A human reviews it, then a separate step (manual or assisted) writes approved values back to the CSV.
3. **Cache avoids re-fetching** — keyed by URL hash, stored in `.provenance-cache/`, gitignored. Re-runs pick up cached responses instantly.
4. **Rate limiting protects targets** — max 2 concurrent, 500ms between fetch initiations, 10s timeout, no retries.
5. **DNS lookup for host** — uses Node's `dns.promises.resolveCname()` as a supplementary signal when headers don't identify the host.
6. **UPSERT preserves identity** — the seed script switches to `ON CONFLICT(url) DO UPDATE SET` for content columns, leaving `id`, `added_at`, `tier`, and `vibecoded` untouched.
7. **robots.txt is per-domain, cached separately** — fetched once per origin (not per URL), cached in `.provenance-cache/robots/<domain>.txt`. This is an additional request beyond the per-URL HEAD + GET.

## Components and Interfaces

### Detector Script (`scripts/detect-provenance.ts`)

Entry point: `npx tsx scripts/detect-provenance.ts`

```typescript
// High-level flow
async function main() {
  const urls = readUrlsFromCSV("data/featured-sites.csv");
  const results: DetectionResult[] = [];

  for (const url of urls) {  // rate-limited, max 2 concurrent
    const cached = loadFromCache(url);
    const response = cached ?? await fetchWithRobots(url);
    if (!cached && response) saveToCache(url, response);

    const result = applyRules(url, response);
    results.push(result);
  }

  const sorted = results.sort(byConfidenceDesc);
  writeReport(sorted, "data/provenance-report.md");
}
```

### Detection Result Interface

```typescript
interface DetectionResult {
  url: string;
  stack: string;           // controlled vocab value or "" (blank)
  host: string;            // controlled vocab value or "" (blank)
  static_or_dynamic: string; // "static" | "dynamic" | "" (blank)
  confidence: "HIGH" | "MEDIUM" | "LOW" | "";
  evidence: string[];      // human-readable signal descriptions
}
```

### Fetch Response Cache

```typescript
interface CachedResponse {
  url: string;
  fetchedAt: string;       // ISO 8601
  headHeaders: Record<string, string>;
  getHeaders: Record<string, string>;
  html: string;            // GET response body (truncated at 500KB)
  statusCode: number;
  cnames: string[];        // resolved CNAME records for the hostname
}
```

Cache location: `.provenance-cache/<sha256-of-url>.json`

### Rule Set Module (`scripts/rules.ts`)

A pure-function module with no I/O dependencies — accepts headers + HTML + CNAMEs, returns detection results. Fully testable in isolation.

```typescript
interface SignalInput {
  headHeaders: Record<string, string>;
  getHeaders: Record<string, string>;
  html: string;
  cnames: string[];
  statusCode: number;
}

interface RuleResult {
  stack: string;
  stackConfidence: "HIGH" | "MEDIUM" | "";
  host: string;
  hostConfidence: "HIGH" | "MEDIUM" | "";
  static_or_dynamic: string;
  sodConfidence: "HIGH" | "MEDIUM" | "";
  evidence: string[];
}

function detectProvenance(input: SignalInput): RuleResult;
```

## Detection Rules (Implementation Spec)

### Stack Detection (`detectStack`)

Rules are evaluated in priority order. First HIGH-confidence match wins. If no HIGH match, fall through to MEDIUM. If no MEDIUM match, return blank.

#### HIGH Confidence (HTML fingerprints emitted by the build tool)

| Priority | Signal | Result |
|----------|--------|--------|
| 1 | `<script id="__NEXT_DATA__">` OR path containing `/_next/static/` | `nextjs` |
| 2 | `<meta name="generator"` content starts with "Hugo" (case-insensitive) | `hugo` |
| 3 | `<meta name="generator"` content starts with "Jekyll" (case-insensitive) | `jekyll` |
| 4 | `<meta name="generator"` content contains "WordPress" AND (`wp-content/` OR `wp-json` in HTML) | `wordpress` |
| 5 | `<meta name="generator"` content starts with "Astro" OR path containing `/_astro/` | `astro` |
| 6 | `window.__NUXT__` in HTML OR path containing `/_nuxt/` | `nuxt` |
| 7 | `id="___gatsby"` OR path containing `/page-data/` | `gatsby` |
| 8 | `data-sveltekit-` attribute in HTML OR path containing `/_app/immutable/` | `sveltekit` |
| 9 | `window.__remixContext` in HTML | `remix` |
| 10 | `<meta name="generator"` content starts with "Docusaurus" | `docusaurus` |
| 11 | `<meta name="generator"` content starts with "Ghost" | `ghost` |

#### MEDIUM Confidence (weaker / absence-based signals)

| Priority | Signal | Result | Guard |
|----------|--------|--------|-------|
| 12 | `id="root"` + path containing `/static/js/` | `react_spa` | No HIGH-confidence match already |
| 13 | `data-v-` attribute OR `window.__VUE__` in HTML | `vue_spa` | No `__NUXT__` / `/_nuxt/` (would be `nuxt`) |
| 14 | `svelte-` class hash pattern in HTML | `svelte_spa` | No `data-sveltekit-` / `/_app/immutable/` (would be `sveltekit`) |
| 15 | No generator meta, no framework markers, plain semantic HTML (only `<html>`, `<head>`, `<body>`, standard tags; no large JS bundles) | `static_html` | Positive signal: HTML is simple/semantic with no script bundles > 50KB referenced |

**TRAP: The Eleventy / Zola blind spot.** These SSGs emit no fingerprint. Absence of markers does NOT imply hand-rolled — collapse to `static_html` only with positive evidence of simplicity, otherwise blank.

If no rule matches → blank.

### Host Detection (`detectHost`)

Headers checked case-insensitively. DNS CNAMEs supplement headers.

#### HIGH Confidence

| Priority | Signal | Result |
|----------|--------|--------|
| 1 | Header `x-vercel-id` present OR CNAME contains `vercel-dns.com` or `*.vercel.app` | `vercel` |
| 2 | Header `x-nf-request-id` present OR CNAME contains `*.netlify.app` | `netlify` |
| 3 | Header `x-github-request-id` present AND `server` is `GitHub.com`, OR CNAME to `*.github.io` | `github_pages` |
| 4 | CNAME contains `*.pages.dev` | `cloudflare_pages` |
| 5 | Header `fly-request-id` present | `fly` |
| 6 | Header key starts with `x-render-` OR CNAME contains `*.onrender.com` | `render` |
| 7 | Header `server` is `AmazonS3` AND any `x-amz-*` header present | `aws_s3` |
| 8 | CNAME contains `*.amplifyapp.com` | `aws_amplify` |
| 9 | CNAME contains `*.neocities.org` | `neocities` |
| 10 | CNAME contains `*.surge.sh` | `surge` |
| 11 | CNAME contains `*.web.app` or `*.firebaseapp.com` | `firebase` |
| 12 | Header contains `via: 1.1 vegur` (Heroku router) | `heroku` |

#### TRAPS

- **`CF-Ray` / `Server: cloudflare` alone → blank.** Cloudflare is a proxy, not a host. Only `*.pages.dev` CNAME means `cloudflare_pages`.
- **`Server: nginx` / `Apache` / `Caddy` → blank.** These identify a web server, not a hosting platform.
- **Fastly/Varnish `X-Cache` headers → blank.** CDN cache layer, not origin host.

If no rule matches → blank. (Could be `self` only if positive evidence like unique IP with no platform CNAME exists, but for safety we leave blank and let the human reviewer assign `self`.)

### Static/Dynamic Detection (`detectStaticOrDynamic`)

Composite scoring — not a single-signal decision. Evaluate all signals, tally static vs dynamic leanings, decide only if one side clearly dominates.

#### Static Signals (each adds +1 to static score)

- No `Set-Cookie` header on GET response
- `Cache-Control` contains `public` or `immutable`
- `X-Vercel-Cache: HIT` or `CF-Cache-Status: HIT` or similar CDN cache hit
- Host is a known static platform (`github_pages`, `netlify`, `cloudflare_pages`, `neocities`, `aws_s3`)
- No script bundles > 100KB referenced in HTML

#### Dynamic Signals (each adds +1 to dynamic score)

- `Set-Cookie` header present (especially session-like cookies)
- `Cache-Control` contains `no-store` or `private`
- `X-Powered-By` contains `Express` or `PHP`
- `Vary` header contains `Cookie`
- Stack is server-rendered framework AND no CDN cache hit (e.g. `wordpress` + no cache HIT)

#### Decision Logic

```typescript
if (staticScore >= 2 && dynamicScore === 0) return "static";   // HIGH
if (staticScore >= 1 && dynamicScore === 0) return "static";   // MEDIUM
if (dynamicScore >= 2 && staticScore === 0) return "dynamic";  // HIGH
if (dynamicScore >= 1 && staticScore === 0) return "dynamic";  // MEDIUM
return "";  // ambiguous — blank
```

**TRAP: Hybrid frameworks.** `__NEXT_DATA__` tells you the framework (Next.js), NOT the rendering mode. Decide static-vs-dynamic from cookies + cache headers, not framework fingerprint.

### Confidence Assignment

Row-level confidence = minimum of the individual field confidences (only counting non-blank fields):

- If all detected fields are HIGH → row is HIGH
- If any detected field is MEDIUM → row is MEDIUM
- If a field is blank, it doesn't lower confidence (it's just absent)
- If all fields blank (nothing detected) → row confidence is "" (blank/LOW)

## Data Models

### Updated D1 Schema (`schema.sql`)

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
  why_note TEXT NOT NULL,
  nsfw INTEGER NOT NULL DEFAULT 0,
  vibecoded INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  added_at TEXT NOT NULL
);
```

Production migration (one-time, run manually):
```sql
ALTER TABLE sites ADD COLUMN vibecoded INTEGER NOT NULL DEFAULT 0;
```

### UPSERT SQL Pattern (seed-logic.ts)

```sql
INSERT INTO sites (url, title, mood_tags, character, stack, host, static_or_dynamic, why_note, nsfw, source, tier, added_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(url) DO UPDATE SET
  title = excluded.title,
  mood_tags = excluded.mood_tags,
  character = excluded.character,
  stack = excluded.stack,
  host = excluded.host,
  static_or_dynamic = excluded.static_or_dynamic,
  why_note = excluded.why_note,
  nsfw = excluded.nsfw,
  source = excluded.source;
```

Columns NOT in UPDATE SET: `id`, `added_at`, `tier`, `vibecoded`.

### Provenance Report Format (`data/provenance-report.md`)

```markdown
# Provenance Detection Report

Generated: 2026-08-20T12:00:00Z
Sites scanned: 288 | Detected (≥1 field): 180 | All-blank: 108

| url | stack | host | static_or_dynamic | confidence | evidence |
|-----|-------|------|-------------------|------------|----------|
| https://example.com | nextjs | vercel | dynamic | HIGH | __NEXT_DATA__ script tag; X-Vercel-Id header; Set-Cookie present |
| https://another.site | hugo | github_pages | static | HIGH | generator meta "Hugo 0.120"; CNAME *.github.io; no Set-Cookie, Cache-Control: public |
| https://minimal.page | static_html | | static | MEDIUM | plain semantic HTML, no JS bundles; no Set-Cookie |
| https://mystery.dev | | | | | unreachable (timeout) |
```

### PROVENANCE_LABELS Map (`src/client/provenance-labels.ts`)

```typescript
export const PROVENANCE_LABELS: Record<string, string> = {
  // Stack
  nextjs: "Next.js",
  nuxt: "Nuxt",
  astro: "Astro",
  sveltekit: "SvelteKit",
  gatsby: "Gatsby",
  remix: "Remix",
  hugo: "Hugo",
  jekyll: "Jekyll",
  eleventy: "Eleventy",
  zola: "Zola",
  docusaurus: "Docusaurus",
  wordpress: "WordPress",
  ghost: "Ghost",
  react_spa: "React SPA",
  vue_spa: "Vue SPA",
  svelte_spa: "Svelte SPA",
  static_html: "Static HTML",
  // Host
  github_pages: "GitHub Pages",
  vercel: "Vercel",
  netlify: "Netlify",
  cloudflare_pages: "Cloudflare Pages",
  neocities: "Neocities",
  surge: "Surge",
  firebase: "Firebase",
  render: "Render",
  fly: "Fly.io",
  aws_s3: "AWS S3",
  aws_amplify: "AWS Amplify",
  heroku: "Heroku",
  self: "Self-hosted",
  // Static/Dynamic
  static: "Static",
  dynamic: "Dynamic",
};

/**
 * Returns the display label for a provenance value.
 * Falls through to the raw value if no label is defined.
 */
export function getProvenanceLabel(value: string): string {
  return PROVENANCE_LABELS[value] ?? value;
}
```

## Component Changes

### ProvenanceCard — add label rendering

The existing `ProvenanceCard` already handles graceful degradation (all-blank → "Hand-made on the open web."). The only change: apply `getProvenanceLabel()` to the `value` before rendering in the `<dd>`.

### BuildFilter — add label rendering

The existing `BuildFilter` renders raw values as button text. The only change: apply `getProvenanceLabel()` to the `value` in the button's content. The `value` sent to the API remains the raw snake_case string.

## Error Handling

| Scenario | Detector Behavior |
|----------|-------------------|
| Site unreachable (timeout / DNS failure) | All-blank row in report, continue to next site |
| robots.txt disallows path | All-blank row, note "robots.txt disallowed" in evidence |
| Non-2xx status code | All-blank row, note "HTTP {status}" in evidence |
| HTML body too large (> 500KB) | Truncate to first 500KB, proceed with partial analysis |
| Cache read failure | Ignore cache, fetch fresh |
| DNS CNAME lookup fails | Skip DNS signal, continue with headers + HTML |

## Testing Strategy

### Unit Tests for Detection Rules (`scripts/rules.test.ts`)

Test the pure `detectProvenance()` function against static fixtures. Each test provides a `SignalInput` and asserts the correct output.

**Required fixture tests:**

1. **Next.js HIGH** — HTML contains `<script id="__NEXT_DATA__">`, headers contain `X-Vercel-Id` → stack=`nextjs`, host=`vercel`
2. **Hugo + GitHub Pages** — generator meta "Hugo 0.120.4", CNAME `*.github.io`, no Set-Cookie → stack=`hugo`, host=`github_pages`, sod=`static`
3. **CF-Ray trap** — headers have `CF-Ray` and `Server: cloudflare`, no `*.pages.dev` CNAME → host=blank (NOT `cloudflare_pages`)
4. **Next.js + dynamic trap** — `__NEXT_DATA__` in HTML but `Set-Cookie` present + `Cache-Control: no-store` → stack=`nextjs`, sod=`dynamic` (framework ≠ rendering mode)
5. **Minimal static** — plain `<html><head><title>Hi</title></head><body><p>Hello</p></body></html>`, no scripts, no framework markers → stack=`static_html`, sod=`static`
6. **Ambiguous/blank** — generic `Server: nginx`, `CF-Ray` present, no HTML markers → all blank
7. **WordPress** — generator meta "WordPress 6.4", `wp-content/themes/` in HTML, `Set-Cookie` present → stack=`wordpress`, sod=`dynamic`
8. **Netlify static** — `X-Nf-Request-Id` header, no Set-Cookie, `Cache-Control: public, max-age=31536000` → host=`netlify`, sod=`static`

### UPSERT Tests (`scripts/seed-logic.test.ts` additions)

1. **UPSERT updates provenance** — insert a row with blank stack, then re-insert with stack=`nextjs` → row has stack=`nextjs`, same `added_at`, same `id`, no duplicate.
2. **UPSERT preserves added_at** — original added_at timestamp survives re-seed.
3. **Idempotency** — running UPSERT N times produces same state as once.

### Label Tests (`src/client/provenance-labels.test.ts`)

1. **Known key renders pretty** — `getProvenanceLabel("nextjs")` → "Next.js"
2. **Unknown key passes through** — `getProvenanceLabel("some_future_value")` → "some_future_value"
3. **"unknown" never in output** — verify ProvenanceCard never renders "unknown" (existing test, confirm it still passes)
4. **All-blank fallback unchanged** — ProvenanceCard with all-blank fields still shows "Hand-made on the open web."

### Test Runner

Vitest (already configured). Detection rule tests use static fixtures (no network). UPSERT tests use D1 local via wrangler. Label tests are pure unit tests.

## Dependencies

New dev dependency needed for the detector:

- `robots-parser` — lightweight robots.txt parser (MIT licensed, ~5KB)

No new runtime dependencies. The detector uses Node.js built-in `fetch` (available since Node 18), `dns/promises`, `crypto` (for URL hashing), and `fs/promises`.

## File Structure (new/modified)

```
scripts/
├── detect-provenance.ts    # NEW — detector entry point
├── rules.ts                # NEW — pure detection rule set
├── rules.test.ts           # NEW — rule fixtures + trap tests
├── seed.ts                 # MODIFIED — uses UPSERT from seed-logic
├── seed-logic.ts           # MODIFIED — seedRowToSQL → UPSERT pattern
└── seed-logic.test.ts      # MODIFIED — add UPSERT tests

src/client/
├── provenance-labels.ts    # NEW — PROVENANCE_LABELS map + getProvenanceLabel()
├── provenance-labels.test.ts # NEW — label unit tests
├── components/
│   ├── ProvenanceCard.tsx  # MODIFIED — apply getProvenanceLabel()
│   └── BuildFilter.tsx     # MODIFIED — apply getProvenanceLabel()

data/
├── provenance-report.md    # NEW (generated by detector, committed)

.provenance-cache/          # NEW directory (gitignored)

schema.sql                  # MODIFIED — add vibecoded column
.gitignore                  # MODIFIED — add .provenance-cache/
```
