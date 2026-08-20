# Implementation Plan: Vibecoded Corner

## Overview

Add a curated "Vibecoded Corner" — a distinct surf mode for AI-built sites spanning a 4-tier ladder. The implementation adds a `built_with` column to the schema, updates the seed UPSERT, introduces a render-only label/tier map, extends the surf engine with vibecoded + tier filtering, builds the corner UI with tier buttons, adds a self-referential `/ouroboros` colophon page, creates an offline discovery sampler, and vets the initial ~51-site pool via Playwright before writing approved rows to the CSV.

## Tasks

- [x] 1. Schema + seed update
  - [x] 1.1 Add `built_with TEXT` column to `schema.sql`
    - Insert `built_with TEXT` after `static_or_dynamic` in the CREATE TABLE statement
    - Add one-time production migration comment: `ALTER TABLE sites ADD COLUMN built_with TEXT;`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Update `scripts/seed-logic.ts` — add `built_with` and `vibecoded` to UPSERT
    - Add `built_with` to the `SeedRow` interface (type `string | null`)
    - Update `csvRowToSeedRow()` to read `built_with` (blank → null) and `vibecoded` (blank → 0) from CSV
    - Update `seedRowToSQL()` INSERT column list to include `built_with` and `vibecoded`
    - Update the `ON CONFLICT(url) DO UPDATE SET` clause to include `built_with` and `vibecoded`
    - Ensure `id`, `added_at`, `tier` remain outside the UPDATE SET
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.3 Update CSV in `data/featured-sites.csv` — add columns to header AND all data rows
    - Add `built_with` column after `static_or_dynamic` and `vibecoded` column after `nsfw` in the header
    - For EVERY existing data row, append the two new trailing fields: blank for `built_with`, `0` for `vibecoded` — so the RFC-4180 parser can't misalign columns
    - After modification, verify that every row has the same column count as the header (no misalignment)
    - Show verification output (e.g. count of rows, column count check)
    - _Requirements: 2.1_

  - [x] 1.4 Add `.vibecoded-cache/` to `.gitignore`
    - Append `.vibecoded-cache/` to the `.gitignore` file
    - _Requirements: 10.5_

- [x] 2. Label & tier map
  - [x] 2.1 Create `src/shared/vibecoded-tiers.ts` — single source of truth
    - Export `BUILT_WITH_TIER: Record<string, number>` — the ONE canonical built_with→tier map
    - Export `TIER_LABELS: Record<number, string>` — tier number → display string
    - Export `TIER_TO_BUILT_WITH: Record<number, string[]>` — DERIVED programmatically (reverse of BUILT_WITH_TIER, computed at import time)
    - Export `expandTiers(tiers: number[]): string[]` — expands tier numbers to built_with values using the derived reverse map
    - Export `getBuiltWithTier(value: string): number | null` — returns tier or null
    - Export `getTierLabel(tier: number): string | null` — returns label or null
    - Module is DOM-free (no browser APIs) — importable by both client and worker
    - _Requirements: 3.2, 3.3, 5.4_

  - [x] 2.2 Create `src/client/vibecoded-labels.ts` — client display labels
    - Re-export `BUILT_WITH_TIER`, `TIER_LABELS`, `getBuiltWithTier`, `getTierLabel` from `../shared/vibecoded-tiers`
    - Export `BUILT_WITH_LABELS: Record<string, string>` — display-only map (lovable→"Lovable", etc.)
    - Export `getBuiltWithLabel(value: string): string` — returns label or raw value fallback
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 2.3 Create `src/worker/engine/tier-map.ts` — server-side re-export
    - Re-export `BUILT_WITH_TIER`, `TIER_TO_BUILT_WITH`, `expandTiers`, `getBuiltWithTier` from `../../shared/vibecoded-tiers`
    - No hand-maintained copies — everything derives from the single shared map
    - _Requirements: 5.4_

  - [x] 2.4 Write label/tier map tests (`src/client/vibecoded-labels.test.ts`)
    - Test: `getBuiltWithLabel("lovable")` → "Lovable"
    - Test: `getBuiltWithLabel("claude_code")` → "Claude Code"
    - Test: `getBuiltWithLabel("unknown_thing")` → "unknown_thing" (passthrough, no crash)
    - Test: `getBuiltWithTier("lovable")` → 2
    - Test: `getBuiltWithTier("cloudflare_workers")` → 4
    - Test: `getBuiltWithTier("unknown_thing")` → null
    - Test: `getTierLabel(1)` → "No-code AI builder"
    - Test: `getTierLabel(99)` → null
    - Test: `expandTiers([2])` includes "lovable" and "bolt" (derived, not hand-coded)
    - Each test must fail without its corresponding implementation
    - _Requirements: 12.2_

- [x] 3. Engine + API
  - [x] 3.1 Extend `src/worker/engine/surf.ts` — vibecoded + tier filtering
    - Add `vibecoded?: boolean` and `tiers?: number[]` to `SurfParams`
    - Add `built_with: string | null` and `vibecoded: number` to `SiteRow`
    - In `buildFilterConditions()`: when `vibecoded` is true, add `vibecoded = 1`; otherwise add `vibecoded = 0`
    - In `buildFilterConditions()`: when `vibecoded` is true AND `tiers` is non-empty, call `expandTiers()` and add `built_with IN (...)` condition
    - If expandTiers returns empty (all unknown tiers), add `1 = 0` to force no-match
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.5_

  - [x] 3.2 Update `/api/surf` route — vibecoded + tier params
    - Parse `vibecoded=1` query param → `params.vibecoded = true`
    - Parse `tier` query param (comma-separated integers 1–4) → `params.tiers`; ignore `tier` when vibecoded is not 1
    - Add `built_with` to `transformSiteResponse()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 3.3 Update `/api/filters` route — expose corner tiers
    - Query distinct `built_with` values where `vibecoded = 1`
    - Derive which tiers are present using server-side tier map
    - Add `corner_tiers: number[]` to the JSON response
    - _Requirements: 6.5_

  - [x] 3.4 Write engine tests — vibecoded + tier filtering
    - Test: default surf (no vibecoded param) excludes vibecoded=1 rows
    - Test: corner mode (vibecoded=true) returns only vibecoded=1 rows
    - Test: tier=[2] in corner returns only T2 built_with rows
    - Test: tier=[4] in corner with no T4 rows returns no_match
    - Test: seen-list exhausts the corner pool → returns exhausted
    - Test: existing open-web seen/no_match/exhausted still work with vibecoded=0
    - _Requirements: 12.1_

- [x] 4. Corner UI (structural, minimal)
  - [x] 4.1 Create `src/client/components/CornerTierFilter.tsx`
    - Accept props: `availableTiers: number[]`, `selectedTiers: number[]`, `onTierChange: (tiers: number[]) => void`
    - Render 4 tier buttons (using TIER_LABELS) as multi-select toggles
    - Render a "YOLO — surf all tiers" button that clears tier selection
    - Only render buttons for tiers present in `availableTiers`
    - Accessible: proper ARIA roles and labels
    - _Requirements: 7.2, 7.3_

  - [x] 4.2 Update `src/client/App.tsx` — corner mode state and toggle
    - Add `cornerMode: boolean` state (default false)
    - Add `selectedTiers: number[]` state (default empty)
    - Add "Enter the Vibecoded Corner" link/toggle that sets cornerMode=true
    - Add "Back to open-web surf" link/button that sets cornerMode=false and clears tier selection
    - When cornerMode is true, pass `vibecoded=1` and selected tiers to SurfButton
    - When cornerMode is true, HIDE the BuildFilter component (stack/host/static_or_dynamic); mood and character filters remain visible
    - Update `AvailableFilters` interface to include `corner_tiers: number[]`
    - Render CornerTierFilter when cornerMode is true
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.3 Update `src/client/components/SurfButton.tsx` — pass vibecoded + tier params
    - Accept new props: `cornerMode: boolean`, `selectedTiers: number[]`
    - When `cornerMode` is true, append `&vibecoded=1` to the API URL
    - When `selectedTiers` is non-empty AND cornerMode, append `&tier=2,3` etc.
    - _Requirements: 7.3_

  - [x] 4.4 Update `src/client/components/ProvenanceCard.tsx` — builder-first in corner
    - When site has non-null `built_with`: show "Built with {label}" as primary line
    - Show "{TIER_LABELS[tier]} · Tier {N}" as secondary line
    - Demote existing stack/host/static_or_dynamic to tertiary "(runs: ...)" line
    - When `built_with` is null: existing behaviour unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.5 Update `src/client/components/StatusMessage.tsx` — ouroboros treatment
    - When surfed site URL is `/ouroboros`, show "The loop closes — you surfed to the surfer."
    - No special rarity code — it's naturally rare (one row in the pool)
    - _Requirements: 9.6_

- [x] 5. Ouroboros page
  - [x] 5.1 Create `src/worker/routes/ouroboros.ts` — standalone colophon HTML page
    - Export `ouroborosRoute` as a Hono router
    - Serve GET `/ouroboros` with a standalone HTML page (not the SPA)
    - Include required text: "You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner."
    - Include link to the public GitHub repo (NOT /docs/kiro-process.md which would 404 in prod)
    - Include glyph placeholder
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 5.2 Mount ouroboros route in `src/worker/index.ts`
    - Import and mount `ouroborosRoute` before the `/api/*` catch-all
    - Ensure `/ouroboros` is served by the Worker, not the SPA fallback
    - _Requirements: 9.1_

  - [x] 5.3 Write ouroboros tests
    - Test: GET `/ouroboros` returns 200 with Content-Type text/html
    - Test: Response body contains required colophon text
    - Test: Response body contains a link
    - _Requirements: 12.3_

- [x] 6. Discovery sampler
  - [x] 6.1 Create `scripts/discover-vibecoded.ts`
    - Query crt.sh JSON API for recent certs on: `%.lovable.app`, `%.bolt.host`, `%.vercel.app`, `%.netlify.app`, `%.pages.dev`, `%.fly.dev`
    - Extract unique subdomains from cert entries, construct URLs
    - Liveness check: fetch with 10s timeout, confirm 2xx, detect parked pages
    - Rate-limit: max 2 concurrent, 500ms delay between fetches
    - Cache responses in `.vibecoded-cache/` (gitignored)
    - Deduplicate against existing CSV URLs
    - Sort by tier ascending, then alphabetically
    - Write `data/vibecoded-candidates-report.md`
    - Fail gracefully on every error — never crash, never write a guess
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [x] 6.2 Write sampler pure-function tests (`scripts/discover-vibecoded.test.ts`)
    - Test: domain pattern mapping — `coolapp.lovable.app` → built_with=lovable, tier=2
    - Test: dedupe — candidate URL in existing CSV → excluded
    - Test: report sorting — tier ascending, then alphabetical
    - Test: parked page detection — HTML with "this domain is parked" → live=false
    - Network behind the fetch seam, tested with fixtures only
    - _Requirements: 12.4_

- [ ] 7. Vetting gate + initial pool
  - [x] 7.1 Vet seed list via Playwright MCP
    - For each of the ~51 seed list URLs: navigate, confirm renders & is live, capture screenshot
    - Note observable AI-build signals (builder badges, meta tags, domain patterns) as evidence
    - Also render JS-heavy galleries: vibecoding.gallery, v0.app/gallery, framer.com/gallery — add strong new candidates
    - Output everything to `data/vibecoded-candidates-report.md`
    - STOP and present report for human review
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 7.2 Write approved rows to CSV (AFTER human approval only)
    - Only write rows explicitly approved by reviewer (~50-60 sites)
    - Set `built_with` and `vibecoded=1` for each approved row
    - Surfdeck row: url=/ouroboros, built_with=cloudflare_workers, vibecoded=1
    - Existing open-web rows: built_with stays blank, vibecoded stays 0
    - Never write unapproved candidates — false label is worse than omitting
    - _Requirements: 11.5, 11.6, 11.7_

- [ ] 8. Reseed + checkpoint
  - [ ] 8.1 Reseed local D1 and run full test suite
    - Run `npx tsx scripts/seed.ts` to UPSERT all rows including new corner sites
    - Run `npx tsc --noEmit` — show output
    - Run `npm test` — show output (all engine, label, ouroboros, sampler tests must pass)
    - Verify `/api/filters` returns `corner_tiers` with populated tiers
    - Verify `/api/surf?vibecoded=1` returns a corner site
    - Show all command output to user
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

## Notes

- The `vibecoded` column already exists in `schema.sql` (added during provenance-enrichment). Only `built_with` is new.
- Tier is NEVER stored — it is derived at render time from `built_with`. The existing `tier` column means "featured" (corpus tier), not vibecoded tier.
- The discovery sampler and vetting gate are offline dev tools — they never deploy.
- Task 7.1 is a hard STOP gate: no CSV writes happen without explicit human approval.
- Visual polish for the corner UI is a later design cycle — this spec covers structural/functional only.
- The Ouroboros page is intentionally minimal — the real glyph design comes later.

## Suggested Task Order

The recommended execution sequence groups by dependency layer:

1. **Schema + Seed** (Tasks 1.1–1.4) — foundation, no runtime impact until corner rows exist
2. **Shared Tier Map** (Task 2.1) — the single source of truth, DOM-free, no deps
3. **Client Labels + Server Re-export** (Tasks 2.2–2.3) — import from shared, pure modules
4. **Label/Tier Tests** (Task 2.4) — validates the shared + client + server modules
5. **Engine + API** (Tasks 3.1–3.4) — backend logic, testable against local D1
6. **Corner UI** (Tasks 4.1–4.5) — frontend integration
7. **Ouroboros** (Tasks 5.1–5.3) — standalone route + tests
8. **Discovery Sampler** (Tasks 6.1–6.2) — offline script + tests
9. **Vetting Gate** (Tasks 7.1–7.2) — Playwright validation + human review gate
10. **Reseed + Checkpoint** (Task 8.1) — integration validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4"] },
    { "id": 4, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 5, "tasks": ["3.4"] },
    { "id": 6, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 7, "tasks": ["5.1", "5.2"] },
    { "id": 8, "tasks": ["5.3"] },
    { "id": 9, "tasks": ["6.1"] },
    { "id": 10, "tasks": ["6.2"] },
    { "id": 11, "tasks": ["7.1"] },
    { "id": 12, "tasks": ["7.2"] },
    { "id": 13, "tasks": ["8.1"] }
  ]
}
```
