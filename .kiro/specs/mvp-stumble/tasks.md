# Implementation Plan: MVP Stumble

## Overview

Implement Surfdeck's core stumble interaction as a single Cloudflare Worker (Hono) serving both a Vite + React + TypeScript SPA and the Stumble Engine API backed by Cloudflare D1. The implementation builds incrementally: project scaffolding → database schema + seed → API routes → React SPA → integration wiring.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize project with Vite, React, TypeScript, Hono, and Wrangler
    - Create `package.json` with pinned dependencies: `hono`, `react`, `react-dom`, `@cloudflare/workers-types`, `wrangler`, `vite`, `@vitejs/plugin-react`, `vitest`, `fast-check`, `typescript`
    - Create `tsconfig.json` for TypeScript with strict mode
    - Create `vite.config.ts` with React plugin and Cloudflare dev integration
    - Create `wrangler.jsonc` with D1 binding (`DB`), `main` pointing to `src/worker/index.ts`, and `assets.not_found_handling: "single-page-application"`
    - Create directory structure: `src/worker/`, `src/worker/routes/`, `src/worker/engine/`, `src/client/`, `src/client/components/`, `scripts/`
    - _Requirements: 9.1, 9.3_

  - [x] 1.2 Create D1 schema file
    - Create `schema.sql` with the `sites` table definition (id, url, title, mood_tags, character, stack, host, static_or_dynamic, why_note, nsfw, source, tier, added_at)
    - url is TEXT NOT NULL UNIQUE, stack/host/static_or_dynamic are nullable TEXT, nsfw is INTEGER NOT NULL DEFAULT 0
    - _Requirements: 8.1, 8.3_

- [x] 2. Seed import script
  - [x] 2.1 Implement CSV-to-D1 seed script (`scripts/seed.ts`)
    - Read and parse `data/featured-sites.csv` (UTF-8, header row, handle quoted fields with commas)
    - Skip rows with empty `url`, log warning for each skipped row
    - Map CSV columns to D1 columns: blank `stack`/`host`/`static_or_dynamic` → NULL, `nsfw` false→0 / true→1
    - Add `tier = 'featured'` and `added_at = ISO 8601 UTC now` to each row
    - Use `INSERT OR IGNORE` on `url` for idempotency
    - Execute via D1 batch (single batch call for all 288 rows — under 1000-statement limit)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 2.2 Write property tests for seed import (Properties 8, 9, 10)
    - **Property 8: Seed import idempotency** — running import N times produces same row count as once
    - **Property 9: No "unknown" strings** — provenance fields are NULL or valid vocabulary, never "unknown"
    - **Property 10: Blanks preserved as NULL** — blank CSV values become NULL in D1
    - **Validates: Requirements 8.3, 8.4**

- [x] 3. Checkpoint - Seed import working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Stumble Engine (API core logic)
  - [x] 4.1 Implement Stumble Engine query builder (`src/worker/engine/stumble.ts`)
    - Define `StumbleParams` interface (mood, character, stacks, hosts, staticOrDynamic, seen)
    - Build D1 batch: temp table for seen-list, WHERE conditions for NSFW exclusion, mood LIKE patterns, character exact match, build filter IN clauses, seen-list subquery exclusion
    - ORDER BY RANDOM() LIMIT 1
    - Validate seen IDs as positive integers before use
    - Distinguish zero-match vs exhausted: query once without seen-list exclusion to check if pool exists, then with exclusion
    - _Requirements: 1.1, 1.3, 2.2, 2.3, 2.4, 3.2, 4.2, 4.3, 10.5, 10.6, 12.1, 12.2_

  - [x] 4.2 Write property tests for Stumble Engine (Properties 1, 2, 3, 4, 5, 6, 7)
    - **Property 1: Filter-matching** — returned site satisfies all active filter constraints
    - **Property 2: NSFW exclusion** — NSFW sites never returned regardless of filters
    - **Property 3: Seen-list exclusion** — returned site ID never in seen-list
    - **Property 4: Mood filter semicolon parsing** — mood LIKE patterns match correctly, no substring false positives
    - **Property 5: Surprise equivalence** — mood=surprise produces same pool as mood absent
    - **Property 6: Build filter OR-within-AND-across** — multi-value within dimension uses OR, across dimensions uses AND
    - **Property 7: Zero-match vs exhausted distinction** — correct status based on pool state
    - **Validates: Requirements 1.1, 1.3, 1.4, 2.2, 2.3, 2.4, 3.2, 4.2, 4.3, 10.5, 10.6, 12.1, 12.2**

- [ ] 5. API routes
  - [x] 5.1 Implement `/api/stumble` route (`src/worker/routes/stumble.ts`)
    - Parse and validate query parameters (mood, character, stack, host, static_or_dynamic, seen)
    - Call Stumble Engine with parsed params
    - Return JSON responses: `{ status: "ok", site: {...} }`, `{ status: "no_match" }`, or `{ status: "exhausted" }`
    - Return 500 with JSON body on D1 errors
    - Ignore invalid filter values (treat as absent)
    - _Requirements: 1.1, 1.4, 5.4, 10.5, 10.6, 11.1_

  - [ ] 5.2 Implement `/api/filters` route (`src/worker/routes/filters.ts`)
    - Query D1 for distinct non-NULL values of `stack`, `host`, and `static_or_dynamic`
    - Return JSON: `{ stacks: [...], hosts: [...], static_or_dynamic: [...] }`
    - Exclude blank/NULL values from response
    - _Requirements: 4.1, 4.5_

  - [ ] 5.3 Implement Worker entry point (`src/worker/index.ts`)
    - Create Hono app with Bindings type (DB: D1Database)
    - Mount stumble and filters routes under `/api`
    - Add catch-all `/api/*` route returning 404 JSON for unknown API paths
    - _Requirements: 9.2, 9.4, 9.5_

  - [ ]* 5.4 Write property test for filters endpoint (Property 11)
    - **Property 11: Filter endpoint returns exactly distinct non-null values** — response matches corpus data, no blanks, no duplicates
    - **Validates: Requirements 4.1, 4.5**

- [ ] 6. Checkpoint - API routes working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. React SPA - Filter components
  - [ ] 7.1 Create SPA entry point and App shell (`src/client/main.tsx`, `src/client/App.tsx`)
    - Set up React root mount
    - App component manages top-level state: selected mood, character, build filters, last stumble result, status messages
    - Fetch `/api/filters` on mount to populate build filter options
    - _Requirements: 9.6_

  - [ ] 7.2 Implement MoodSelector component (`src/client/components/MoodSelector.tsx`)
    - Render six buttons with exact labels: "Show me something useful", "Teach me something", "Waste my time", "Show me something beautiful", "Make me think", "Surprise me"
    - Single-select with toggle-off (tap selected → deselect)
    - Visually distinguish selected button
    - Persist selection across stumbles until explicit change
    - "Surprise me" sends no mood filter (equivalent to unselected)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 7.3 Implement CharacterFilter component (`src/client/components/CharacterFilter.tsx`)
    - Render four options: `modern_indie`, `old_web`, `retro_personal`, `minimal_static`
    - Single-select with toggle-off, no default selection
    - Persist selection across stumbles
    - _Requirements: 3.1, 3.3, 3.4, 3.6_

  - [ ] 7.4 Implement BuildFilter component (`src/client/components/BuildFilter.tsx`)
    - Three filter groups (stack, host, static_or_dynamic) populated from `/api/filters` response
    - Multi-select within each group
    - Deselect removes constraint; all deselected = no build filter
    - Do not display blank/empty values
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ]* 7.5 Write unit tests for filter components
    - MoodSelector: single-select toggle, visual distinction, correct query values
    - CharacterFilter: single-select toggle, no default
    - BuildFilter: multi-select within group, populated from API data
    - _Requirements: 2.1, 2.5, 2.6, 3.1, 3.3, 4.1, 4.4_

- [ ] 8. React SPA - Stumble interaction and results
  - [ ] 8.1 Implement StumbleButton component (`src/client/components/StumbleButton.tsx`)
    - Open-then-navigate pattern: `window.open('about:blank', '_blank')` synchronously within click handler
    - Send GET `/api/stumble` with active filters + seen-list from localStorage
    - On success: navigate pre-opened tab to site URL, update seen-list in localStorage
    - On failure/timeout: close blank tab via `tab.close()`, show error state
    - Disable button only during in-flight request, re-enable within 100ms of response
    - AbortController with 5-second timeout
    - Detect popup-blocked: if `window.open` returns null, show fallback message with clickable link
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4_

  - [ ] 8.2 Implement ProvenanceCard component (`src/client/components/ProvenanceCard.tsx`)
    - Display non-blank provenance fields with labels: "Stack", "Hosted on", "Type"
    - Omit fields whose value is null/blank
    - If all three blank: display "Hand-made on the open web."
    - Never display the string "unknown"
    - Render from precomputed data in stumble response (no secondary network request)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.3 Implement StatusMessage component (`src/client/components/StatusMessage.tsx`)
    - Zero-match: heading "Nothing in that corner right now." + sub-line "Loosen a filter and try again."
    - Exhausted: heading "You've wandered the whole neighbourhood." + sub-line "Reset history to start fresh?" + reset button
    - Popup-blocked: message with clickable link to the site URL
    - Visually distinguish exhausted from zero-match (exhausted is not an error)
    - Clear zero-match message when user changes a filter
    - _Requirements: 1.4, 1.6, 6.2, 6.3, 6.4, 11.1, 11.2, 11.3_

  - [ ] 8.4 Implement seen-list management (localStorage)
    - Store seen site IDs as JSON array under key `surfdeck_seen`
    - Append site ID after successful stumble
    - Send seen-list with each stumble request
    - Reset action clears the key
    - _Requirements: 10.3, 10.4, 11.3, 11.4_

  - [ ]* 8.5 Write unit tests for StumbleButton and ProvenanceCard
    - StumbleButton: loading state, timeout handling, popup-blocked detection, tab lifecycle
    - ProvenanceCard: all-blank renders fallback line, partial fields render correctly, never shows "unknown"
    - StatusMessage: correct headings for zero-match vs exhausted, reset clears seen-list
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 7.1, 7.2, 11.1, 11.2_

- [ ] 9. Checkpoint - SPA components working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration wiring and final polish
  - [ ] 10.1 Wire SPA to Worker (full end-to-end stumble flow)
    - Ensure SPA fetches filters on mount and sends correct query params on stumble
    - Verify the open-then-navigate tab lifecycle works end-to-end
    - Verify filter combination (mood AND character AND build) produces correct API calls
    - Verify seen-list grows across stumbles and exclusion works
    - Create `src/client/index.html` entry point with correct script/link tags
    - _Requirements: 1.1, 1.2, 6.1, 9.1, 9.6_

  - [ ] 10.2 Configure Vite build output for Workers Assets
    - Ensure `vite build` outputs to the directory referenced by `wrangler.jsonc` assets config
    - Verify correct MIME types served for JS, CSS, HTML
    - Verify SPA fallback: non-API, non-asset paths return index.html with 200
    - _Requirements: 9.1, 9.3_

  - [ ]* 10.3 Write integration tests
    - Full stumble request/response cycle against local D1
    - Seed import: verify row counts, NULL handling, idempotency
    - Workers Assets: correct MIME types
    - SPA fallback: non-API paths return index.html
    - API 404: unknown `/api/` routes return JSON 404
    - _Requirements: 1.1, 8.1, 8.3, 8.4, 9.1, 9.3, 9.4_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Production deployment
  - [ ] 12.1 Create production D1 database and apply schema
    - Create the production D1 database via `wrangler d1 create`
    - Apply `schema.sql` to production D1 via `wrangler d1 execute --remote`
    - _Requirements: 8.1_

  - [ ] 12.2 Run seed import against production D1
    - Execute the seed script targeting the production (remote) D1 database
    - Verify 288 rows imported with correct tier/added_at values and NULL preservation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 12.3 Deploy to workers.dev
    - Run `npx wrangler deploy` to deploy the Worker + SPA to workers.dev
    - Verify deployment succeeds and the workers.dev URL is accessible
    - _Requirements: 9.1_

  - [ ] 12.4 Verify deployed stumble flow end-to-end
    - From a logged-out/incognito browser, verify the full stumble flow on the deployed URL:
    - Filters load correctly (mood, character, build)
    - Stumble returns a random site and opens in new tab
    - Provenance card displays correctly (blank-safe, never "unknown")
    - Seen-list exclusion works across consecutive stumbles
    - Zero-match state displays correct copy when filters match nothing
    - Exhausted state displays correct copy and reset works
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 5.2, 6.2, 10.3, 10.5, 11.1_

## Notes

- Tasks marked with `*` are optional (UI unit tests 7.5, 8.5, and integration tests 10.3 may be deferred under time pressure). Property tests for seed import (2.2) and Stumble Engine (4.2) are required — they are part of the definition of done for their respective waves.
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The D1 batch approach (not interactive transactions) is used for both seed import and the stumble engine's temp-table pattern
- Dependencies must use exact pinned versions (no ranges)
- All data values use `lowercase_snake_case` per project conventions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["7.5", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["8.5", "10.1", "10.2"] },
    { "id": 8, "tasks": ["10.3"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["12.2"] },
    { "id": 11, "tasks": ["12.3"] },
    { "id": 12, "tasks": ["12.4"] }
  ]
}
```
