# Requirements Document: Vibecoded Corner

## Introduction

Surfdeck's Vibecoded Corner is a curated sub-collection of sites genuinely built by AI, surfaced as a distinct surf mode. It spans a 4-tier ladder from no-code AI builders (T1) through AI app-builders (T2), AI coding assistants + managed hosting (T3), to developer cloud deployments (T4). Surfdeck itself — built end-to-end by AI in Kiro, deployed to Cloudflare Workers — is Exhibit #1 in its own corner (the Ouroboros). The feature adds a `built_with` column to the schema, a vibecoded surf mode with tier filtering, a self-referential colophon page, and a discovery sampler script for growing the pool.

## Glossary

- **Vibecoded_Corner**: The distinct surf mode returning only sites with `vibecoded = 1`.
- **Open_Web_Surf**: The default surf mode returning only sites with `vibecoded = 0` (the existing hand-made corpus).
- **Built_With**: A snake_case identifier stored in the `built_with` column indicating which AI tool/platform created the site.
- **Tier**: A 1–4 integer derived at render time from the `built_with` value. Never stored in DB/CSV.
- **Ouroboros**: The self-referential page (`/ouroboros`) serving as Surfdeck's own exhibit in the corner.
- **Discovery_Sampler**: An offline script (`scripts/discover-vibecoded.ts`) that finds candidate vibecoded sites from Certificate Transparency logs for human review.
- **Vetting_Gate**: The human review step where candidates are validated (live, renders, AI-build signal confirmed) before entering the CSV.

## Requirements

### Requirement 1: Schema — `built_with` Column

**User Story:** As a developer, I want a `built_with` column in the sites table so that vibecoded sites can store which AI tool created them.

#### Acceptance Criteria

1. THE `schema.sql` SHALL include `built_with TEXT` after the `static_or_dynamic` column.
2. THE column SHALL be nullable — NULL means "not vibecoded" or "unknown builder."
3. THE spec SHALL provide the one-time production migration: `ALTER TABLE sites ADD COLUMN built_with TEXT;`.
4. THE column SHALL store exactly one value from the `built_with` vocabulary defined in `.kiro/steering/vibecoded-taxonomy.md`, or NULL.
5. THE column SHALL never contain the string "unknown" — use NULL instead.

### Requirement 2: Seed UPSERT — `built_with` and `vibecoded` as Content Columns

**User Story:** As a developer, I want the seed script to write `built_with` and `vibecoded` from the CSV into D1, updating on reseed without churning identity columns.

#### Acceptance Criteria

1. THE CSV (`data/featured-sites.csv`) SHALL gain two new columns: `built_with` (after `static_or_dynamic`) and `vibecoded` (after `nsfw`), added to the header.
2. THE seed UPSERT's INSERT column list SHALL include `built_with` and `vibecoded`.
3. THE UPSERT's `ON CONFLICT(url) DO UPDATE SET` clause SHALL include `built_with` and `vibecoded` as content columns that get updated on reseed.
4. THE UPDATE SET clause SHALL still NOT include `id`, `added_at`, or `tier` — these never churn.
5. THE seed SHALL map CSV blank `built_with` to SQL NULL and CSV blank `vibecoded` to `0`.

### Requirement 3: Label & Tier Map (Render-Only)

**User Story:** As a user, I want vibecoded sites to show human-friendly builder names and tier labels, so the provenance card is readable.

#### Acceptance Criteria

1. A module `src/client/vibecoded-labels.ts` SHALL export `BUILT_WITH_LABELS`: a map from snake_case `built_with` IDs to display strings (e.g. `lovable` → "Lovable", `claude_code` → "Claude Code", `cloudflare_workers` → "Cloudflare Workers", `godaddy_airo` → "GoDaddy Airo").
2. THE module SHALL export `BUILT_WITH_TIER`: a map from each `built_with` ID to its tier number (1, 2, 3, or 4).
3. THE module SHALL export `TIER_LABELS`: a map from tier number to display string (`1` → "No-code AI builder", `2` → "AI app-builder", `3` → "AI-assisted + hosted", `4` → "Developer cloud").
4. An unknown `built_with` key SHALL fall through to its raw value for the label and `null` for the tier — never crash, never throw.
5. DB, CSV, and API responses SHALL always use the raw snake_case keys — labels are render-only.

### Requirement 4: Engine — Vibecoded Filter

**User Story:** As a user, I want default surf to show only the open web, and the Vibecoded Corner to show only AI-built sites, so the two pools are cleanly separated.

#### Acceptance Criteria

1. THE `surf()` engine SHALL accept a new optional parameter `vibecoded?: boolean`.
2. WHEN `vibecoded` is absent or `false`, THE engine SHALL add `vibecoded = 0` to the WHERE clause — default surf excludes corner sites.
3. WHEN `vibecoded` is `true`, THE engine SHALL add `vibecoded = 1` to the WHERE clause — corner returns only vibecoded sites.
4. THE existing seen-list, no-match, and exhausted behaviours SHALL apply identically within either pool.
5. THE `SiteRow` interface SHALL be extended with `built_with: string | null` and `vibecoded: number`.

### Requirement 5: Engine — Tier Filter (Corner-Only)

**User Story:** As a user browsing the Vibecoded Corner, I want to filter by tier so I can explore one level of the AI-build ladder at a time.

#### Acceptance Criteria

1. THE `surf()` engine SHALL accept a new optional parameter `tiers?: number[]`.
2. WHEN `tiers` is non-empty AND `vibecoded` is `true`, THE engine SHALL restrict results to rows whose `built_with` value maps to one of the requested tier numbers.
3. WHEN `tiers` is empty or absent, no tier restriction SHALL be applied (all vibecoded sites eligible).
4. THE tier-to-built_with mapping SHALL be maintained server-side (a reverse of the client's `BUILT_WITH_TIER` map) so filtering happens in SQL, not post-query.
5. IF a `built_with` value has no tier mapping (unknown key), it SHALL be excluded when any tier filter is active — only mapped values match.

### Requirement 6: API — Vibecoded + Tier Parameters

**User Story:** As a frontend developer, I want the /api/surf route to accept vibecoded and tier params so the corner UI can query its pool.

#### Acceptance Criteria

1. THE `/api/surf` route SHALL accept a query parameter `vibecoded=1` to activate corner mode.
2. THE `/api/surf` route SHALL accept a query parameter `tier` as a comma-separated list of integers (e.g. `tier=2,3`) to filter by tier within the corner.
3. THE `tier` parameter SHALL be ignored when `vibecoded` is not `1` (tier filtering only applies in the corner).
4. THE API response for a vibecoded site SHALL include `built_with` in the site object.
5. THE `/api/filters` route (or a new variant) SHALL expose the tiers present among `vibecoded = 1` rows, so the UI knows which tier buttons to render.

### Requirement 7: UI — Vibecoded Corner Mode

**User Story:** As a user, I want a distinct "Vibecoded Corner" mode with tier buttons and a way to return to open-web surf, so I can explore AI-built sites separately.

#### Acceptance Criteria

1. THE main surf UI SHALL include an "Enter the Vibecoded Corner" toggle or link that switches to corner mode.
2. IN corner mode, THE UI SHALL display the 4 tier buttons (multi-select) plus a "YOLO surf" button that ignores tier.
3. IN corner mode, THE surf request SHALL include `vibecoded=1` and the selected tier(s).
4. IN corner mode, THE UI SHALL provide a "Back to open-web surf" link/button to exit.
5. THE mood selector and character filter SHALL remain available in corner mode (they filter within the vibecoded pool just as they do in open-web surf).
6. THE stack/host/static_or_dynamic build filters SHALL be HIDDEN in corner mode — the builder is the star, and with ~50 sites those filters would mostly produce no-match.

### Requirement 8: UI — Provenance Card in Corner Mode

**User Story:** As a user in the corner, I want the provenance card to lead with the AI builder, not the runtime stack.

#### Acceptance Criteria

1. WHEN displaying a vibecoded site (`vibecoded = 1` and `built_with` is non-null), THE ProvenanceCard SHALL show the builder as the primary line: "Built with {BUILT_WITH_LABELS[built_with]}".
2. THE card SHALL show the tier as a secondary line: "{TIER_LABELS[tier]} · Tier {N}".
3. THE existing stack/host/static_or_dynamic SHALL be demoted to a tertiary line: "(runs: {stack} · {host} · {static_or_dynamic})" — only showing non-blank values.
4. WHEN `built_with` is null but `vibecoded = 1`, THE card SHALL gracefully omit the builder line (rare edge case).
5. THE existing "Hand-made on the open web." fallback SHALL apply for `vibecoded = 0` sites (unchanged from current behaviour).

### Requirement 9: Ouroboros Page

**User Story:** As a user who surfs to Surfdeck itself in the corner, I want a colophon page explaining the self-referential loop.

#### Acceptance Criteria

1. THE Worker SHALL serve a `/ouroboros` route that renders a minimal HTML page (not the SPA — a standalone page).
2. THE page SHALL contain the text: "You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner."
3. THE page SHALL include a link to the public GitHub repository.
4. THE page SHALL include a placeholder for a visual glyph (the real design comes in a later cycle).
5. THE Surfdeck row in the corner SHALL have its `url` set to `/ouroboros` (not `/`) so surfing to it opens the colophon.
6. WHEN the surfed site IS Surfdeck (url = `/ouroboros`), THE status/card area SHALL show a "the loop closes — you surfed to the surfer" treatment (copy only — no special rarity mechanics, it's naturally rare as one row in the pool).

### Requirement 10: Discovery Sampler Script

**User Story:** As a developer, I want an offline script that finds candidate vibecoded sites from Certificate Transparency logs, so I can grow the corner pool with reviewed additions.

#### Acceptance Criteria

1. THE script SHALL exist at `scripts/discover-vibecoded.ts` and run via `npx tsx scripts/discover-vibecoded.ts`.
2. THE script SHALL NOT be part of the deployed Worker — it is a sibling to `detect-provenance.ts`.
3. THE script SHALL query the crt.sh JSON API for recent certificates on tier-mapped domains: `%.lovable.app`, `%.bolt.host` (T2); `%.vercel.app`, `%.netlify.app` (T3); `%.pages.dev`, `%.fly.dev` (T4).
4. THE script SHALL apply a liveness filter: fetch each candidate URL with a short timeout, confirm it returns HTTP 2xx, and is not a parked/default page.
5. THE script SHALL reuse the fetch/cache/rate-limit patterns from `detect-provenance.ts`: robots-respecting, short timeout, cached in a gitignored dir, rate-limited (max 2 concurrent, 500ms delay), no retry storms.
6. THE script SHALL deduplicate candidates against existing CSV URLs — never suggest a site already in the corpus.
7. THE script SHALL write a confidence-sorted review report to `data/vibecoded-candidates-report.md` with columns: `url | built_with | tier | live? | evidence`.
8. THE script SHALL NEVER edit the CSV directly — it only emits the report for human review.
9. THE script SHALL fail gracefully on every error (network, parse, API) — never crash, never write a guess.

### Requirement 11: Vetting Gate & Initial Pool

**User Story:** As a curator, I want each candidate site validated (live, renders, AI-build signal confirmed) before it enters the CSV.

#### Acceptance Criteria

1. FOR each site in the seed list, THE vetting process SHALL navigate to it with a browser (Playwright), confirm it renders and is live, and capture a screenshot.
2. THE vetting process SHALL note any observable AI-build signal (builder badge, meta tag, domain pattern) as evidence in the report.
3. THE vetting process SHALL also render JS-heavy gallery pages (vibecoding.gallery, v0.app/gallery, framer.com/gallery) to find additional strong candidates.
4. THE vetting process SHALL output `data/vibecoded-candidates-report.md` and STOP for human review.
5. AFTER human approval (~50-60 sites), ONLY approved rows SHALL be written to `data/featured-sites.csv` with `built_with` set and `vibecoded=1`.
6. THE Surfdeck row SHALL have `url = /ouroboros`, `built_with = cloudflare_workers`, `vibecoded = 1`.
7. Unapproved candidates SHALL never enter the CSV — a false "vibecoded" label is worse than omitting a site.

### Requirement 12: Tests

**User Story:** As a developer, I want automated tests proving each critical behaviour so regressions are caught early.

#### Acceptance Criteria

1. THERE SHALL be engine tests proving: default surf excludes `vibecoded=1`; corner returns only `vibecoded=1`; tier filter narrows within the corner; seen-list / no-match / exhausted still hold in both pools.
2. THERE SHALL be tier/label map tests: known `built_with` → correct pretty label + correct tier; unknown key → raw value passthrough + null tier; never crash.
3. THERE SHALL be an ouroboros test: the Surfdeck exhibit row resolves to `/ouroboros`; the `/ouroboros` route serves valid HTML with the required text; the normal open-web card does not show builder info.
4. THERE SHALL be sampler pure-function tests: wildcard-domain → tier/built_with mapping; dedupe against existing URLs; report sorting/formatting. Network is behind the fetch seam, tested with fixtures.
5. EACH test SHALL fail without its corresponding implementation (test-first validation).
