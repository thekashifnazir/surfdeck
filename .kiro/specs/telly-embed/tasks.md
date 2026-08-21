# Tasks: Cycle 6 — "Telly Is the Destination"

## Overview

Tasks are sequenced so the cycle has a shippable checkpoint after task 12. Bug fixes land first (safe, isolated), then filter consolidation, then card upgrade, then the iframe/embed work last. Each task is individually verifiable: `npm run test` + visual check after each.

---

## Phase A: Bug Fixes (tasks 1–3)

- [x] 1. Bug fix: move press-note outside `.scene` flex row
  - **Files:** `src/client/App.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - Move `<p className="press-note">` from inside the `.scene` div to immediately after it (before `<StatusMessage>`).
    - `.scene` now has exactly two children: `.remote` and `.telly-container`.
    - CSS `.press-note`: add `text-align: center; margin-top: 8px;` (remove any flex-related sizing if present).
  - **Done when:** At desktop width, the telly-container takes full remaining width (no third column squishing it). Press-note renders centred below the scene. All 115 tests pass.
  - _Requirements: 7.1–7.5_

- [x] 2. Bug fix: first-press card delay is positive
  - **Files:** `src/client/App.tsx`
  - **Changes:**
    - Line ~153: change `const cardDelay = isFirstSurf ? 600 : 500` → `const cardDelay = isFirstSurf ? 1200 : 500`.
    - Net delay becomes: first-press 1200 - 800 = 400ms, compressed 500 - 400 = 100ms.
  - **Done when:** On first surf, there is a visible ~400ms pause between the tuned overlay appearing and the card beginning its print animation. Compressed surfs still feel snappy. Tests pass.
  - _Requirements: 8.1–8.4_

- [x] 3. Bug fix: LCD shows channel number when tuned with mood selected
  - **Files:** `src/client/App.tsx`
  - **Changes:**
    - Refactor LCD text computation (lines ~249-261):
      1. `no_match` → `"NOTHING IN THAT CORNER RIGHT NOW"` (highest priority, unchanged).
      2. `zapping` → `"TUNING > CH ${channelCounter}"` (unchanged).
      3. `tuned` + mood selected → `"CH ${channelCounter} · ${selectedMood.toUpperCase()}"` (NEW — channel returns).
      4. Idle + mood → full mood label (unchanged pre-first-surf behaviour).
      5. Else → `channelNumber ? "CH ${channelCounter} - ${modeLabel}" : modeLabel`.
  - **Done when:** After surfing with a mood active, the LCD reads e.g. "CH 223 · BEAUTIFUL" instead of just "Show me something beautiful". Before first surf with mood selected, the full label still shows. Tests pass.
  - _Requirements: 9.1–9.4_

- [x] 4. Tests for bug fixes
  - **Files:** new `src/client/App.bugfixes.test.ts` (or extend existing test file)
  - **Changes:**
    - Test: press-note element is NOT inside `.scene` (DOM structure assertion).
    - Test: cardDelay for first surf produces a positive net value (unit test the timer values).
    - Test: LCD text when `zapState === "tuned"` and `selectedMood` is set includes "CH".
  - **Done when:** `npm run test` passes with new test cases covering all three fixes.
  - _Requirements: 10.3, 10.4_

---

## Phase B: Filter Consolidation (tasks 5–8)

- [x] 5. Add TUNE key to Remote
  - **Files:** `src/client/components/Remote.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - Add a new `<button className="tune-key">TUNE ▾</button>` below the INPUT key in Remote.tsx.
    - Accept new props: `tuneOpen: boolean`, `onTuneToggle: () => void`.
    - When `tuneOpen`, button text becomes "TUNE ▴" and class gains `tune-key--active` (coral bg).
    - CSS `.tune-key`: same as `.input-key` (full-width chiclet, 44px min-height, same shadow rules).
  - **Done when:** TUNE key appears below INPUT on the remote. Clicking it toggles between ▾/▴ and default/coral styling. Tests pass.
  - _Requirements: 5.1–5.2_

- [x] 6. Create TuneFlyout component
  - **Files:** new `src/client/components/TuneFlyout.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - Component accepts: `open`, `cornerMode`, `selectedCharacter`, `onCharacterChange`, `buildFilters`, `onSelectionChange`, `availableFilters`, `selectedTiers`, `onTierChange`, `onClearAll`.
    - Renders a `<div className="tune-flyout">` with max-height transition.
    - OPEN WEB mode: character chips + stack chips + host chips + static/dynamic chips (reuse existing chip markup/classes).
    - VIBECODED mode: corner tier chips.
    - "Clear all ×" button at the bottom.
    - CSS `.tune-flyout`: `max-height: 0; overflow: hidden; transition: max-height 0.25s ease;` → `.tune-flyout--open { max-height: min(400px, 50vh); overflow-y: auto; }`.
  - **Done when:** Component renders correct filter sets based on mode. Clear-all resets all secondary filters. Flyout animates open/closed. Tests pass.
  - _Requirements: 5.3–5.5, 5.8_

- [x] 7. Wire TUNE flyout into Remote and App; remove standalone filters section
  - **Files:** `src/client/App.tsx`, `src/client/components/Remote.tsx`
  - **Changes:**
    - App.tsx: add `const [tuneOpen, setTuneOpen] = useState(false);` state.
    - Pass `tuneOpen` and `onTuneToggle` to Remote. Pass all filter props to Remote for forwarding to TuneFlyout.
    - Remote.tsx: render `<TuneFlyout …>` below the TUNE key, inside the `.remote` div.
    - App.tsx: REMOVE the entire `<section className="filters">` block and its children (CharacterFilter, BuildFilter, CornerTierFilter direct renders).
    - Keep the component files (CharacterFilter.tsx, etc.) — they may be reused inside TuneFlyout or kept for reference.
  - **Done when:** Filters section below the scene is gone. All filter chips live inside the TUNE flyout on the remote. Filter functionality (selecting character, stack, etc.) still works. Tests pass.
  - _Requirements: 5.6–5.7_

- [x] 8. LCD summary of active filters + tests
  - **Files:** `src/client/App.tsx`, new or extended test file
  - **Changes:**
    - Extend the LCD logic for `tuned` state to append active secondary filter info:
      - If one secondary filter active: append `· {VALUE.toUpperCase()}` (e.g. "CH 218 · BEAUTY · NEOCITIES").
      - If multiple secondaries: append `· {FIRST} +{n}` (e.g. "CH 218 · THINK · NEXTJS +2").
    - Helper function: `getActiveFilterSummary(selectedCharacter, buildFilters, selectedTiers)` → `string | null`.
    - Tests: LCD text includes filter label when filters active and tuned. LCD truncates to "+N" with multiple.
  - **Done when:** LCD dynamically reflects active filters in its readout. Tests cover the summary logic. All tests pass.
  - _Requirements: 5.6, 9.1–9.4_

---

## Phase C: Provenance Card Upgrade (tasks 9–12)

- [x] 9. Add `/api/corpus-size` endpoint
  - **Files:** new `src/worker/routes/corpus-size.ts`, `src/worker/index.ts`
  - **Changes:**
    - New route: `GET /api/corpus-size` → `SELECT COUNT(*) as total FROM sites WHERE nsfw = 0`.
    - Response: `{ "total": <number> }` with `Cache-Control: public, max-age=3600`.
    - Register route in worker index.
  - **Done when:** `curl /api/corpus-size` returns `{"total":349}` (or current count). Tests cover the endpoint. All tests pass.
  - _Requirements: 6.6_

- [x] 10. Upgrade ProvenanceCard content (title, why-note, dynamic total)
  - **Files:** `src/client/components/ProvenanceCard.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - Add site title as first line: `<p className="prov-card__title">{site.title}</p>` — Familjen Grotesk 600, 14px, ink.
    - Change heading: `CATCH № {site.id} OF {corpusTotal}` where `corpusTotal` is a prop (fetched from /api/corpus-size by App.tsx).
    - Add why-note below provenance body: `<p className="prov-card__why">{site.why_note}</p>` — italic, body-grey, 12px.
    - Remove hardcoded `CORPUS_TOTAL = 349`.
    - App.tsx: fetch `/api/corpus-size` on mount, pass `corpusTotal` to ProvenanceCard.
  - **Done when:** Card displays site title, catch number with live total, provenance fields, and why-note. Tests pass.
  - _Requirements: 6.3–6.6_

- [x] 11. Move provenance card to a column beside the telly
  - **Files:** `src/client/App.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - App.tsx: restructure `.scene` to three children:
      1. `.remote`
      2. `.telly-container` (telly + stand + press-note area, flex: 1)
      3. `.card-column` (new div wrapping CardSlot + ProvenanceCard, 220px on desktop)
    - CSS: `.card-column { width: 220px; flex-shrink: 0; align-self: stretch; display: flex; flex-direction: column; justify-content: flex-end; }`.
    - Mobile (≤768px): `.card-column` goes to `width: 100%; order: 3;` (stacks below telly).
    - Remove CardSlot from inside `.telly-container`.
  - **Done when:** On desktop, provenance card sits to the right of the telly. On mobile, it stacks below. Card persists between presses. Tests pass.
  - _Requirements: 6.1–6.2_

- [x] 12. Card stamp and tests
  - **Files:** `src/client/components/ProvenanceCard.tsx`, new/extended test file
  - **Changes:**
    - Stamp text becomes conditional: accept `embedded: boolean` prop.
      - `embedded === true` → "OPENS IN TELLY"
      - `embedded === false` (or no embed yet) → "OPENS IN NEW TAB"
    - Tests: card renders title, why-note, dynamic total. Stamp text changes based on `embedded` prop.
  - **Done when:** Stamp reads correctly for both modes. Test coverage for card content and stamp logic. All tests pass.
  - _Requirements: 6.7, 10.4_

---

## SHIPPABLE CHECKPOINT

Tasks 1–12 are independently deployable without the iframe feature. The app functions identically to today (all sites open in new tabs) but with bug fixes, consolidated filters, and an upgraded card. If the embed must be cut for time, stop here.

---

## Phase D: Embeddable Pipeline + Iframe (tasks 13–19)

- [ ] 13. D1 schema: add `embeddable` column
  - **Files:** `schema.sql`
  - **Changes:**
    - Add to CREATE TABLE block: `embeddable INTEGER NOT NULL DEFAULT 1` (after `added_at`).
    - Add a migration comment at the top: `-- ALTER TABLE sites ADD COLUMN embeddable INTEGER NOT NULL DEFAULT 1;`
  - **Done when:** `schema.sql` has the new column. Existing seed re-run would create the column. Tests pass (no runtime code changed).
  - _Requirements: 3.2–3.3_

- [ ] 14. Pipeline script: `scripts/check-embeddable.ts`
  - **Files:** new `scripts/check-embeddable.ts`
  - **Changes:**
    - Reads URLs from `data/featured-sites.csv` (reuses `parseCSV` from seed-logic).
    - HTTP HEAD each URL (concurrency 5, timeout 10s per request).
    - Inspects `X-Frame-Options` (DENY/SAMEORIGIN → not embeddable) and `Content-Security-Policy` `frame-ancestors` (restrictive → not embeddable).
    - Writes per-URL results to `.embeddable-cache/<sha256-of-url>.json`.
    - Network errors or timeouts → embeddable = true (optimistic).
    - Console summary: `X of Y sites are embeddable`.
    - Add `.embeddable-cache/` to `.gitignore`.
  - **Done when:** Running `npx tsx scripts/check-embeddable.ts` produces `.embeddable-cache/` with one JSON per corpus URL. Script is idempotent (skips cached entries unless `--force` flag). Tests pass.
  - _Requirements: 3.1, 3.7, 3.8_

- [ ] 15. Seed script: populate `embeddable` from cache
  - **Files:** `scripts/seed.ts`, `scripts/seed-logic.ts`
  - **Changes:**
    - `seed-logic.ts`: `csvRowToSeedRow()` gains an `embeddable` field (default 1).
    - `seed.ts`: after CSV parse, load `.embeddable-cache/` files. For each URL, look up cache and set `embeddable = 0` if not embeddable.
    - Generated INSERT includes `embeddable` column.
    - If cache dir doesn't exist, all rows default to `embeddable = 1` (graceful degradation).
  - **Done when:** `npm run seed:local` produces a D1 database with the `embeddable` column populated. Spot-check: sites known to block framing (e.g. GitHub) have `embeddable = 0`. Tests pass.
  - _Requirements: 3.4–3.5_

- [ ] 16. API: include `embeddable` in surf response
  - **Files:** `src/worker/routes/surf.ts`, `src/worker/engine/surf.ts`
  - **Changes:**
    - `SiteRow` type gains `embeddable: number`.
    - `transformSiteResponse` maps `embeddable` integer to boolean: `embeddable: site.embeddable === 1`.
    - Engine query already uses `SELECT *`, so the column is fetched automatically.
  - **Done when:** `GET /api/surf` response includes `"embeddable": true` or `"embeddable": false`. Existing surf tests updated to expect the new field. All tests pass.
  - _Requirements: 3.6_

- [ ] 17. Client: conditional tab-open vs iframe in useSurf + App state
  - **Files:** `src/client/hooks/useSurf.ts`, `src/client/App.tsx`
  - **Changes:**
    - `SurfSite` interface gains `embeddable: boolean`.
    - App.tsx: add state `const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null)`.
    - useSurf.ts: after receiving response:
      - `embeddable === true`: close the optimistic blank tab, call `onEmbedUrl(site.url)`.
      - `embeddable === false`: navigate blank tab to `site.url` (existing path), call `onEmbedUrl(null)`.
    - New callback prop on useSurf: `onEmbedUrl: (url: string | null) => void`.
    - App.tsx passes `embeddedUrl` to Telly.
  - **Done when:** Embeddable sites don't open a visible new tab; non-embeddable sites do. State correctly tracks the embedded URL. Tests pass.
  - _Requirements: 1.1, 4.1_

- [ ] 18. Telly: render iframe + pop-out button + fallback state
  - **Files:** `src/client/components/Telly.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - New prop: `embeddedUrl: string | null`.
    - When `zapState === "tuned"` and `embeddedUrl` is truthy:
      - Render `<iframe src={embeddedUrl} className="telly__iframe" sandbox="…" referrerpolicy="no-referrer" />`.
      - CSS `.telly__iframe`: `position: absolute; inset: 0; width: 100%; height: 100%; border: none; border-radius: 6px; opacity: 0; transition: opacity 0.2s ease;` → `.telly__iframe--loaded { opacity: 1; }`.
      - Use onLoad to add the `--loaded` class (fade-in after ceremony).
    - When `zapState === "tuned"` and `embeddedUrl` is null and a surf was attempted (site was non-embeddable):
      - Render fallback: `.telly__screen--fallback` with "this channel won't tune in — opened across the room" (Doto 12px, ink, centred).
    - Pop-out button: `<button className="telly__popout">` with inline SVG external-link icon. Visible only when `embeddedUrl` is set. `onClick` → `window.open(embeddedUrl, '_blank')`.
    - CSS `.telly-container--embedded`: `flex-basis: 70%;` (desktop only; mobile stays full-width).
    - `prefers-reduced-motion`: iframe at `opacity: 1` immediately, no fade.
  - **Done when:** Embeddable sites render inside the telly screen after the ceremony. Non-embeddable sites show fallback text. Pop-out opens the embedded URL in a new tab. Telly grows on desktop. Tests pass.
  - _Requirements: 1.1–1.8, 2.1–2.5, 4.2–4.5_

- [ ] 19. Tests for iframe/embed behaviour
  - **Files:** new `src/client/Telly.embed.test.ts`, extended `src/worker/routes/surf.test.ts`
  - **Changes:**
    - Telly test: when embeddedUrl is set and tuned, renders iframe with correct sandbox/referrerpolicy.
    - Telly test: when embeddedUrl is null and tuned, renders fallback text.
    - Telly test: pop-out button visible only when embedded; clicking it calls window.open.
    - Surf route test: response includes `embeddable` boolean field.
    - useSurf test: embeddable=true closes blank tab; embeddable=false navigates blank tab.
  - **Done when:** All new behaviour has test coverage. `npm run test` passes fully (115 existing + new). `tsc --noEmit` clean.
  - _Requirements: 10.3, 10.4_

---

## Verification Checklist (run after final task)

- [ ] `tsc --noEmit` — zero errors
- [ ] `npm run test` — all tests pass (115 existing + new)
- [ ] Desktop (1280px): remote left, telly centre (grows to 70% when embedded), card right
- [ ] Mobile (390px): stacks vertically, no horizontal scroll
- [ ] Ceremony timing unchanged: first-press full, subsequent compressed
- [ ] `prefers-reduced-motion`: all end states shown statically
- [ ] No gold, dark-glow, handwriting fonts anywhere
- [ ] Non-embeddable sites still open in new tab
- [ ] Pop-out button works for embedded sites
- [ ] TUNE flyout shows correct filter set per INPUT mode
- [ ] LCD shows channel after mood selection when tuned
