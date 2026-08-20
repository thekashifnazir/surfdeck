# Requirements Document: Provenance Enrichment

## Introduction

Surfdeck's provenance columns (`stack`, `host`, `static_or_dynamic`) are currently blank across all 288 featured sites. This feature populates them via an offline build-time detector script that fetches each site once, applies a hand-authored rule set against passive client-observable signals (response headers, HTML, public DNS), and emits a confidence-sorted report for human review. Approved values are then written to `data/featured-sites.csv` and reseeded into D1, lighting up the existing (but empty) Build Filters and Provenance Card in the live app.

The detector is a local dev tool — it is NOT part of the deployed Worker.

## Glossary

- **Detector**: The offline TypeScript script (`scripts/detect-provenance.ts`) that fetches sites and infers provenance.
- **Provenance_Report**: The markdown file (`data/provenance-report.md`) emitted by the detector with confidence-sorted findings.
- **Rule_Set**: The hand-authored detection rules mapping response headers, HTML fingerprints, and DNS signals to controlled-vocabulary values.
- **Fetch_Cache**: A gitignored directory caching raw HTTP responses keyed by URL so re-runs don't re-fetch.
- **PROVENANCE_LABELS**: A render-only mapping from snake_case DB values to human-friendly display labels (e.g. `nextjs` → "Next.js").

## Requirements

### Requirement 1: Detector Script Existence and Scope

**User Story:** As a developer, I want an offline detector script that infers provenance for each featured site, so that I can populate the currently-blank columns after reviewing results.

#### Acceptance Criteria

1. THE Detector SHALL exist at `scripts/detect-provenance.ts` and run via `npx tsx scripts/detect-provenance.ts`.
2. THE Detector SHALL read URLs from `data/featured-sites.csv` and process every row that has a non-empty `url` field.
3. THE Detector SHALL NOT be bundled in the deployed Worker — it runs only at build/ingest time on the developer's machine.
4. THE Detector SHALL NOT modify `data/featured-sites.csv` — it only emits `data/provenance-report.md`.

### Requirement 2: Polite Fetching

**User Story:** As a developer, I want the detector to be a polite HTTP client, so that target sites are not harmed and the project's reputation is not damaged.

#### Acceptance Criteria

1. THE Detector SHALL honour each site's `robots.txt` — if the path is disallowed, skip detection for that site and leave all fields blank. The `robots.txt` fetch is an additional request beyond the HEAD + GET (one per domain, cached across URLs sharing the same origin).
2. THE Detector SHALL make at most one HEAD request and one GET request per URL (for the HTML body). The `robots.txt` fetch is not counted against this limit — it is a separate per-domain request, cached and reused for all URLs on that domain.
3. THE Detector SHALL use a short timeout (10 seconds per request) and SHALL NOT retry on failure.
4. THE Detector SHALL rate-limit requests so that no more than 2 concurrent fetches are in flight and there is at least a 500ms delay between initiating new fetches.
5. THE Detector SHALL set a descriptive `User-Agent` header (e.g. `SurfdeckBot/0.1 (+https://github.com/...)`) identifying itself.

### Requirement 3: Response Caching

**User Story:** As a developer, I want detector results cached locally so that re-runs don't re-fetch sites I've already scanned.

#### Acceptance Criteria

1. THE Detector SHALL cache the HEAD response headers and GET response (headers + HTML body) for each URL in a gitignored directory (e.g. `.provenance-cache/`).
2. THE cache key SHALL be derived from the URL (e.g. a hash of the URL).
3. IF a cache entry exists for a URL, THE Detector SHALL use the cached data instead of making new HTTP requests.
4. THE `.gitignore` SHALL include the cache directory so cached responses are never committed.

### Requirement 4: Stack Detection Rules

**User Story:** As a developer, I want the detector to identify the framework/generator a site was built with, using only passive HTML and header signals.

#### Acceptance Criteria

1. THE Detector SHALL assign exactly one `stack` value from the controlled vocabulary: `nextjs`, `nuxt`, `astro`, `sveltekit`, `gatsby`, `remix`, `hugo`, `jekyll`, `eleventy`, `zola`, `docusaurus`, `wordpress`, `ghost`, `react_spa`, `vue_spa`, `svelte_spa`, `static_html`, or blank.
2. THE Detector SHALL classify a detection as HIGH confidence when it matches an HTML fingerprint emitted by the build tool itself (e.g. `<script id="__NEXT_DATA__">`, `/_next/static/` paths → `nextjs`; `<meta name="generator" content="Hugo ...">` → `hugo`).
3. THE Detector SHALL classify a detection as MEDIUM confidence for weaker signals (e.g. `id="root"` + `/static/js/` without framework markers → `react_spa`; no markers and plain semantic HTML → `static_html`).
4. THE Detector SHALL assign blank (not "unknown", not `static_html`) when it cannot determine the stack — absence of framework markers is NOT sufficient evidence that a site is hand-rolled HTML.
5. THE Detector SHALL never assert a stack from absence of evidence alone; `static_html` requires the positive signal of plain semantic HTML with no script bundles suggesting a framework.

### Requirement 5: Host Detection Rules

**User Story:** As a developer, I want the detector to identify where a site is hosted using response headers and public DNS.

#### Acceptance Criteria

1. THE Detector SHALL assign exactly one `host` value from the controlled vocabulary: `github_pages`, `vercel`, `netlify`, `cloudflare_pages`, `neocities`, `surge`, `firebase`, `render`, `fly`, `aws_s3`, `aws_amplify`, `heroku`, `self`, or blank. This list matches `reference/provenance-rules.md` §3 exactly.
2. THE Detector SHALL use HIGH-confidence signals: specific response headers (e.g. `X-Vercel-Id` → `vercel`; `X-Nf-Request-Id` → `netlify`; `X-GitHub-Request-Id` + `Server: GitHub.com` → `github_pages`) and public DNS CNAME patterns (e.g. `*.pages.dev` → `cloudflare_pages`; `*.github.io` → `github_pages`; `*.surge.sh` → `surge`; `*.web.app` or `*.firebaseapp.com` → `firebase`).
3. THE Detector SHALL NOT conclude `cloudflare_pages` from `CF-Ray` or `Server: cloudflare` alone — these indicate Cloudflare is a proxy, not the host. Only a `*.pages.dev` CNAME confirms `cloudflare_pages`.
4. THE Detector SHALL NOT conclude any host from generic server headers (`Server: nginx`, `Server: Apache`, `Server: Caddy`) — these say nothing about hosting platform.
5. THE Detector SHALL assign blank when the host cannot be determined from positive signals.

### Requirement 6: Static/Dynamic Detection Rules

**User Story:** As a developer, I want the detector to determine whether a site serves static or dynamic content.

#### Acceptance Criteria

1. THE Detector SHALL assign one of: `static`, `dynamic`, or blank for the `static_or_dynamic` field.
2. THE Detector SHALL lean `static` when: no `Set-Cookie` on a plain GET; `Cache-Control` includes `public` or `immutable`; served from a known static host; CDN cache HIT.
3. THE Detector SHALL lean `dynamic` when: session `Set-Cookie` present; `Cache-Control: no-store` or `private`; `X-Powered-By: Express` or `PHP`; `Vary: Cookie`.
4. THE Detector SHALL NOT infer static-vs-dynamic from framework fingerprints alone — `__NEXT_DATA__` (Next.js) does not mean dynamic; decide from cookies and cache headers.
5. THE Detector SHALL assign blank when signals are ambiguous or contradictory.

### Requirement 7: Fail-Open Semantics

**User Story:** As a developer, I want the detector to prefer blank over guesses, so that I never have to clean up false positives in the corpus.

#### Acceptance Criteria

1. THE Detector SHALL produce blank for any field it cannot determine with at least MEDIUM confidence — it SHALL never fabricate a value.
2. THE Detector SHALL never write the string "unknown" into any output field — internally it may use "unknown" but it collapses to blank on output.
3. THE Detector SHALL never assert a conclusion from the absence of evidence alone.
4. IF a site is unreachable (timeout, DNS failure, non-2xx status), THE Detector SHALL produce all-blank for that site and continue processing the remaining corpus.
5. THE Detector SHALL emit an all-blank row rather than crashing when an individual site fails.

### Requirement 8: Report Output

**User Story:** As a developer, I want a human-readable report showing what the detector found for every site, sorted by confidence, so I can verify before writing to the CSV.

#### Acceptance Criteria

1. THE Detector SHALL emit `data/provenance-report.md` as a committed markdown file.
2. THE report SHALL contain a table with columns: `url | stack | host | static_or_dynamic | confidence | evidence`.
3. THE report SHALL be sorted by confidence descending (HIGH first, then MEDIUM, then LOW/blank).
4. THE `evidence` column SHALL list the specific signals observed (e.g. "X-Vercel-Id header present", "`__NEXT_DATA__` script tag found").
5. THE `confidence` column SHALL reflect the lowest-confidence field in that row (i.e. if stack is HIGH but host is MEDIUM, the row confidence is MEDIUM).
6. Blank fields in the report SHALL render as empty (not "unknown", not "N/A").

### Requirement 9: Schema Migration — vibecoded Column

**User Story:** As a developer, I want a `vibecoded` column added to the schema for a future feature cycle, along with the production ALTER statement.

#### Acceptance Criteria

1. THE `schema.sql` SHALL be updated to include `vibecoded INTEGER NOT NULL DEFAULT 0` after the `nsfw` column.
2. THE spec SHALL provide the one-time production migration statement: `ALTER TABLE sites ADD COLUMN vibecoded INTEGER NOT NULL DEFAULT 0;`.
3. THE Detector and seed script SHALL NOT populate or modify the `vibecoded` column — it is reserved for a later cycle.

### Requirement 10: Seed Script UPSERT Migration

**User Story:** As a developer, I want the seed script to update existing rows' content columns on re-seed (so enriched provenance data flows into D1), while preserving `id`, `added_at`, `tier`, and `vibecoded`.

#### Acceptance Criteria

1. THE seed script SHALL switch from `INSERT OR IGNORE` to `INSERT INTO sites (...) VALUES (...) ON CONFLICT(url) DO UPDATE SET` for content columns.
2. THE UPDATE SET clause SHALL include: `title`, `mood_tags`, `character`, `stack`, `host`, `static_or_dynamic`, `why_note`, `nsfw`, `source`.
3. THE UPDATE SET clause SHALL NOT include: `id`, `added_at`, `tier`, `vibecoded` — these are preserved on re-seed.
4. THE UPSERT SHALL be idempotent: running it N times produces the same result as running once.
5. THE UPSERT SHALL correctly update a row's provenance values when the CSV changes from blank to a value (e.g. stack goes from blank to `nextjs`).

### Requirement 11: Display Labels (PROVENANCE_LABELS)

**User Story:** As a user, I want provenance values displayed as human-friendly labels (e.g. "Next.js" not "nextjs"), so the UI is readable.

#### Acceptance Criteria

1. A `PROVENANCE_LABELS` map SHALL exist mapping snake_case DB values to display strings (e.g. `nextjs` → "Next.js", `github_pages` → "GitHub Pages", `static` → "Static", `dynamic` → "Dynamic").
2. THE ProvenanceCard component SHALL apply PROVENANCE_LABELS when rendering `stack`, `host`, and `static_or_dynamic` values.
3. THE BuildFilter component SHALL apply PROVENANCE_LABELS when rendering button text for filter values.
4. Any key not present in PROVENANCE_LABELS SHALL fall through to its raw value (passthrough).
5. THE labels are RENDER-ONLY — stored values in the DB, CSV, and API responses remain snake_case.
6. THE existing "Hand-made on the open web." fallback for all-blank provenance SHALL remain unchanged.

### Requirement 12: Tests

**User Story:** As a developer, I want automated tests proving each critical behaviour, so that regressions are caught early.

#### Acceptance Criteria

1. THERE SHALL be tests for detector rules against static header/HTML fixtures, including trap cases:
   - CF-Ray-only → host blank (not `cloudflare_pages`)
   - `__NEXT_DATA__` present but `Set-Cookie` + `Cache-Control: no-store` → static_or_dynamic = `dynamic` (not inferred from framework)
   - Minimal build with no markers → `static_html` only if plain semantic HTML confirmed; otherwise blank
2. THERE SHALL be a test proving the UPSERT updates an existing URL's provenance while preserving `added_at` with no duplicate row.
3. THERE SHALL be tests for PROVENANCE_LABELS: known keys render pretty, "unknown" never passes through, all-blank still shows the "Hand-made on the open web." fallback.
4. EACH test SHALL fail without its corresponding implementation (test-first validation).

### Requirement 13: Approval-to-CSV Write Gate

**User Story:** As a developer/reviewer, I want a defined step that writes ONLY my explicitly approved provenance values into the CSV, so that unapproved or low-confidence guesses never enter the corpus.

#### Acceptance Criteria

1. THE approval-to-CSV step SHALL be a separate operation from the detector — the detector emits the report; this step consumes the reviewer's approval and writes to `data/featured-sites.csv`.
2. ONLY rows the reviewer explicitly approves SHALL be modified in the CSV — all other rows remain unchanged.
3. FOR each approved row, the approved `stack`, `host`, and/or `static_or_dynamic` values SHALL overwrite the corresponding blank fields for exactly that URL's row.
4. THE step SHALL never write a value the reviewer has not approved, and SHALL never write a value below MEDIUM confidence unless the reviewer explicitly overrides.
5. THE reviewer SHALL select the approved subset aiming for coverage that lights up the demo: several distinct `stack` values, several distinct `host` values, both `static` and `dynamic` represented, and at least one value rare enough that a mood × character × build-filter combination can yield zero matches (so the zero-match UI state is reachable).
6. THE step SHALL never write the string "unknown" into any CSV field.
