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

- [x] B.5. Amendment — on-screen TUNING menu (design revision, approved comp)
  - **Context:** The TUNE flyout currently expands inside the remote body, stacking all filter chips into a ~210px column. The approved comp (Option A — "TV on-screen menu") reworks it into an on-screen display (OSD) overlay drawn inside the telly screen: the remote stays at four controls and the wide screen shows every filter at once. This is a reskin + relocation of existing logic only — no engine/API/data changes.
  - **Files:** `src/client/components/Remote.tsx`, `src/client/components/Telly.tsx`, `src/client/components/TuneFlyout.tsx` → `src/client/components/TellyMenu.tsx`, `src/client/components/TuneFlyout.test.ts` → `src/client/components/TellyMenu.test.ts`, `src/client/App.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - **MENU key:** Rename the remote's `TUNE` key to `MENU`. Keep the ▾/▴ arrow flip and the coral active state (props `tuneOpen`/`onTuneToggle` unchanged; keycap text and aria-labels become MENU-oriented).
    - **Relocate panel to the screen:** Move the filter panel out of `.remote` and into the telly screen as an OSD overlay. Telly gains the filter props + `menuOpen`; it renders `<TellyMenu>` absolutely positioned inside `.telly__screen` (inset ~6%/5%). Remote no longer renders the panel.
    - **Rename component:** `TuneFlyout` → `TellyMenu`; CSS classes `tune-flyout*` → `osd*`. Header `— TUNING —` in Doto (`--font-lcd`), letterspaced, centred.
    - **OSD styling:** background `rgba(16,18,15,0.93)`; `1px solid #9FE870` border; subtle scanline texture via a `::before` repeating horizontal gradient with `pointer-events: none`; group labels small green uppercase at reduced opacity; chips transparent with `1px solid rgba(159,232,112,.55)` border and `#9FE870` text; active chip = solid `#9FE870` bg with dark `#141613` text; a green `Clear all ✕`; ~180ms fade/rise (`opacity` + `translateY`) respecting `prefers-reduced-motion`; content scrolls **inside** the overlay on overflow (`overflow-y: auto`), never the page.
    - **Layering:** OSD sits above whatever the screen shows (idle/static/tuned and the future Phase D iframe) via `z-index`/stacking within `.telly__screen`.
    - **Logic unchanged:** character single-select toggle-off, build filters multi-select, corner-mode tier chips, clear-all, and the LCD filter summary all stay as-is. MENU toggles the OSD; a SURF press closes it and surfs; INPUT while open swaps the chip set in place (mode change re-renders OSD content).
  - **Done when:** MENU key toggles an on-screen TUNING overlay inside the telly (not a column in the remote). OSD matches the comp (green-on-dark, Doto header, scanlines, chip states). SURF closes the OSD and surfs; INPUT swaps chips in place. `tsc --noEmit` clean; all existing tests green (renamed imports/strings only); mobile 390px keeps no horizontal scroll.
  - _Requirements: 5.1–5.8 (revised)_
  - **Polish tweak (design revision, no new task):** Card + remote legibility pass on the under-the-telly layout.
    - `ProvenanceCard.tsx`: wrapped fields in two render-only groups — `.prov-card__left` (title + catch № heading) and `.prov-card__right` (provenance body + why-note + footer). Content/props unchanged; existing text/class assertions intact.
    - `surfdeck.css`: `.prov-card` is now a landscape card — removed `max-width: 300px` (now `max-width: 680px`, full width up to the cap, `align-self: flex-start`), laid out as a two-column CSS grid (`minmax(0,1fr) minmax(0,1.4fr)`). Bumped type for legibility (title 16px, body 15px, why 13px) while keeping the Special Elite receipt character. `.prov-card__stamp` stays top-right; right column gets top padding so the body clears the stamp. At ≤768px the grid collapses to a single stacked column. Raised `.card-slot` visible/reduced-motion `max-height` (190px → 320px) so the taller stacked mobile card is not clipped.
    - `.scene { align-items: flex-end }` → `flex-start` so the remote pins to the top, aligned with the telly (no longer drops to the bottom).
    - Verified: `tsc --noEmit` clean; all 194 tests green; TUNING OSD still overlays the screen; card persists between surfs; no horizontal scroll at 390px (stacked) or ~1024px (two-column landscape).

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

- [x] 13. D1 schema: add `embeddable` column
  - **Files:** `schema.sql`
  - **Changes:**
    - Add to CREATE TABLE block: `embeddable INTEGER NOT NULL DEFAULT 1` (after `added_at`).
    - Add a migration comment at the top: `-- ALTER TABLE sites ADD COLUMN embeddable INTEGER NOT NULL DEFAULT 1;`
  - **Done when:** `schema.sql` has the new column. Existing seed re-run would create the column. Tests pass (no runtime code changed).
  - _Requirements: 3.2–3.3_

- [x] 14. Pipeline script: `scripts/check-embeddable.ts`
  - **Files:** new `scripts/check-embeddable.ts`
  - **Changes:**
    - Reads URLs from `data/featured-sites.csv` (reuses `parseCSV` from seed-logic).
    - HTTP **GET** each URL (concurrency 5, timeout 10s per request, follow redirects, desktop-browser User-Agent). Read-and-discard the body — do not download/persist it. GET is used over HEAD because some sites (neal.fun, measured on 30 corpus sites) return a 403 block page to HEAD whose headers are misleading; GET returns the real page headers.
    - Inspects `X-Frame-Options` (DENY/SAMEORIGIN → not embeddable) and `Content-Security-Policy` `frame-ancestors` (restrictive → not embeddable).
    - Writes per-URL results to `.embeddable-cache/<sha256-of-url>.json`.
    - Network errors or timeouts → embeddable = **false** (pessimistic — a false negative costs a harmless new-tab fallback; a false positive shows a blank telly).
    - Console summary: `X of Y sites are embeddable`.
    - Add `.embeddable-cache/` to `.gitignore`.
    - Update the file's doc comments to describe GET + discard-body + pessimistic-on-failure.
  - **Done when:** Running `npx tsx scripts/check-embeddable.ts` produces `.embeddable-cache/` with one JSON per corpus URL. Script is idempotent (skips cached entries unless `--force` flag). Tests pass.
  - _Requirements: 3.1, 3.7, 3.8_

- [x] 15. Seed script: populate `embeddable` from cache
  - **Files:** `scripts/seed.ts`, `scripts/seed-logic.ts`
  - **Changes:**
    - `seed-logic.ts`: `csvRowToSeedRow()` gains an `embeddable` field (default 1).
    - `seed.ts`: after CSV parse, load `.embeddable-cache/` files. For each URL, look up cache and set `embeddable = 0` if not embeddable.
    - Generated INSERT includes `embeddable` column.
    - If cache dir doesn't exist, all rows default to `embeddable = 1` (graceful degradation).
  - **Done when:** `npm run seed:local` produces a D1 database with the `embeddable` column populated. Spot-check: sites known to block framing (e.g. GitHub) have `embeddable = 0`. Tests pass.
  - _Requirements: 3.4–3.5_

- [x] 16. API: include `embeddable` in surf response
  - **Files:** `src/worker/routes/surf.ts`, `src/worker/engine/surf.ts`
  - **Changes:**
    - `SiteRow` type gains `embeddable: number`.
    - `transformSiteResponse` maps `embeddable` integer to boolean: `embeddable: site.embeddable === 1`.
    - Engine query already uses `SELECT *`, so the column is fetched automatically.
  - **Done when:** `GET /api/surf` response includes `"embeddable": true` or `"embeddable": false`. Existing surf tests updated to expect the new field. All tests pass.
  - _Requirements: 3.6_

- [x] 17. Client: iframe-or-fallback in useSurf + App state (no auto-open)
  - **Files:** `src/client/hooks/useSurf.ts`, `src/client/App.tsx`
  - **Changes:**
    - `SurfSite` interface gains `embeddable: boolean`.
    - App.tsx: add state `const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null)`.
    - useSurf.ts: **remove the optimistic pre-opened blank tab entirely** — nothing opens on SURF press, and all tab-close logic goes. After receiving response:
      - `embeddable === true`: call `onEmbedUrl(site.url)`.
      - `embeddable === false`: do NOT auto-open anything; call `onEmbedUrl(null)` and let the telly fallback control be the opener.
    - New callback prop on useSurf: `onEmbedUrl: (url: string | null) => void`.
    - App.tsx passes `embeddedUrl` to Telly.
  - **Done when:** No blank tab opens on any surf path. Embeddable sites embed; non-embeddable sites show the pressable fallback (no auto tab). State correctly tracks the embedded URL. Tests pass.
  - _Requirements: 1.1, 4.1, 10.8_

- [x] 18. Telly: render iframe + pop-out button + pressable fallback + load-failure timer
  - **Files:** `src/client/components/Telly.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - New prop: `embeddedUrl: string | null`.
    - When `zapState === "tuned"` and `embeddedUrl` is truthy:
      - Render `<iframe src={embeddedUrl} className="telly__iframe" sandbox="…" referrerpolicy="no-referrer" />`.
      - CSS `.telly__iframe`: `position: absolute; inset: 0; width: 100%; height: 100%; border: none; border-radius: 6px; opacity: 0; transition: opacity 0.2s ease;` → `.telly__iframe--loaded { opacity: 1; }`.
      - Use onLoad to add the `--loaded` class (fade-in after ceremony).
      - **Load-failure timer:** when the embed starts, arm a 5-second timer cleared by the iframe's `onload`; on expiry, swap to the pressable fallback for that site. Do NOT treat `onload` as proof the site rendered (Chrome fires `onload` even for XFO-blocked frames — that is the precomputed flag's job).
    - **Pressable fallback** — shown when tuned and there is a fallback URL (non-embeddable site) OR the load-failure timer expired:
      - Render a real `<button className="telly__screen--fallback">` reading "this channel won't tune in — press to open it across the room" (Doto 12px, ink, centred).
      - `onClick` → `window.open(url, '_blank')` (a user gesture, so never popup-blocked).
    - Pop-out button: `<button className="telly__popout">` with inline SVG external-link icon. Visible whenever a site is embedded (stays visible for the embedded session); hidden in idle and while the pressable fallback is shown. `onClick` → `window.open(embeddedUrl, '_blank')`.
    - CSS `.telly-container--embedded`: `flex-basis: 70%;` (desktop only; mobile stays full-width).
    - `prefers-reduced-motion`: iframe at `opacity: 1` immediately, no fade.
  - **Done when:** Embeddable sites render inside the telly screen after the ceremony. Non-embeddable sites (and embeds that fail to load within 5s) show the pressable fallback, which opens the URL in a new tab on press. Pop-out opens the embedded URL in a new tab. Telly grows on desktop. Tests pass.
  - _Requirements: 1.1–1.9, 2.1–2.5, 4.1–4.5_

- [x] 19. Tests for iframe/embed behaviour
  - **Files:** new `src/client/Telly.embed.test.ts`, extended `src/worker/routes/surf.test.ts`
  - **Changes:**
    - Telly test: when embeddedUrl is set and tuned, renders iframe with correct sandbox/referrerpolicy.
    - Telly test: when embeddedUrl is null and tuned after a surf, renders the pressable fallback button; pressing it opens the URL in a new tab.
    - Telly test: the 5s load-failure timer expiry swaps to the pressable fallback for that site.
    - Telly test: pop-out button visible when embedded; clicking it calls window.open.
    - Surf route test: response includes `embeddable` boolean field.
    - useSurf test: no blank tab opens in any path; embeddable=true → onEmbedUrl(url); embeddable=false → onEmbedUrl(null) with no auto-open.
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

---

## Phase D.1 — Telly Polish (visual + interaction pass)

- [x] D.1. Telly polish: loading static, no bleed-through, real pop-out button, big fallback button, always-visible OSD scrollbar
  - **Context:** A visual/interaction polish pass over the telly embed. Reskin + interaction layer only — zero behaviour/API/routing/data/DDL changes, ceremony timing untouched, palette/fonts unchanged, mobile 390px keeps no horizontal scroll.
  - **Files:** `src/client/components/Telly.tsx`, `src/client/components/ProvenanceCard.tsx` (bezel/embed area context), `src/client/surfdeck.css`, `src/client/App.tsx` (pass site title for fallback), `scripts/check-embeddable.ts` (relative-URL rule — already applied, verify + test).
  - **Changes:**
    1. **Loading static:** While an embed is loading (iframe mounted but `onLoad` not yet fired), keep the TV static/noise animation running on the screen — same visual language as the zap ceremony — instead of a bare tuned backdrop. When `onLoad` fires, fade the static out as the iframe fades in (existing `--loaded` opacity transition). Under `prefers-reduced-motion`, show a plain dark screen (no animated static) and cut straight to the site.
    2. **No bleed-through:** The `CH n` readout and any tuned-state text must NOT be visible behind or through the iframe while a site is loading or showing. When an embed is live (loading or loaded), the screen shows static then the site — nothing else. The `CH` readout still appears in non-embedded states (fallback, no-signal, plain tuned with no embed).
    3. **Pop-out as a real button:** Restyle the pop-out control as a clearly visible button on the telly bezel — coral background, cream text/icon, label "POP OUT ↗" (icon + short label, not icon-only), with obvious hover and keyboard-focus states.
    4. **Fallback as a big titled button:** Replace the plain fallback text line with one large, centred, unmistakably pressable button on the screen, showing the caught site's title, e.g. "SMASHING MAGAZINE won't tune in — press to open it across the room". Big hit area, high contrast on the dark screen, pressed/hover/focus states, keyboard operable. Same behaviour (opens the site in a new tab on press).
    5. **Always-visible OSD scrollbar:** The TUNING OSD's scrollable region must show a visible scrollbar at all times when content overflows (thin, styled to the OSD's green-on-dark language), so people without a scroll wheel can drag it — not reliant on the OS overlay scrollbar that only appears during wheel scroll.
    6. **Relative-URL embeddable rule:** In `scripts/check-embeddable.ts`, treat relative corpus URLs (starting `/`, e.g. the `/ouroboros` row) as `embeddable = true` — same-origin and cannot be header-checked. Add a test. (Already applied in a prior task — verify and ensure test coverage exists.)
  - **Done when:** Embed loading shows animated static (dark screen under reduced-motion); no CH/tuned text bleeds through a loading/shown iframe; pop-out reads as a pressable coral button with label + focus ring; fallback is a big titled button with hover/focus/pressed states, keyboard operable, opening the site in a new tab; OSD shows a persistent styled scrollbar on overflow; relative URLs resolve embeddable=true with a test. `tsc --noEmit` clean; all tests green (new coverage for loading-state logic + relative-URL case); ceremony timing, palette, and fonts unchanged; mobile 390px no horizontal scroll.
  - _Requirements: 1.x, 2.x, 4.x (polish revision)_
  - **Follow-up (pop-out placement):** Moved the POP OUT button off the screen and onto the telly bezel — a new `.telly__bezel` row inside the `.telly` frame, rendered below `.telly__screen`, right-aligned near the stand — so it never overlaps the embedded site's own content.
    - `Telly.tsx`: pop-out relocated from an absolutely-positioned on-screen control to a `<div className="telly__bezel">` after the screen div (still gated on `showIframe`, so visible only while embedded and hidden once the fallback takes over). Same coral style, "POP OUT ↗" label, icon, and `window.open(embeddedUrl, "_blank")` behaviour.
    - `surfdeck.css`: `.telly__popout` no longer `position: absolute` (drops top/right/z-index); new `.telly__bezel` is a right-aligned flex row with `margin-top: 6px` and `margin-bottom: -6px` so it sits within the telly's existing 12px bottom padding and does not grow the telly's footprint. Hover/active/`:focus-visible` states unchanged.
    - `Telly.embed.test.ts`: added a "pop-out placement (bezel below the screen)" block asserting the bezel wraps the pop-out, renders after the screen, and is hidden when not embedded.
    - Verified: `tsc --noEmit` clean; all tests green; pop-out sits on the bezel below the screen (no overlap with the iframe); 390px no horizontal scroll.
  - **Follow-up (TUNING scroll rocker on the bezel) — SUPERSEDED, see the REVERT note below.** The TUNING menu's scroll affordance moves off the screen onto the telly bezel, matching the pop-out's treatment.
    - **Rocker control:** Added a vertical ▲/▼ rocker on the right edge of the bezel — two chunky keys styled like the bezel controls (coral on the dark frame). Visible ONLY while the menu is open AND the OSD body overflows. Each key scrolls the OSD body by a step (~60% of the visible height, floored at 24px) and repeats while held (pointer-down interval, cleared on up/leave/cancel/unmount). Disabled + dimmed at the corresponding end of the scroll range. Keyboard operable (real `<button>`s; Enter/Space scroll once via a click guard that suppresses the click following a pointer press, so mouse/touch never double-steps) with a `:focus-visible` ring. The rocker shares the bezel's right-hand slot with the pop-out — they never co-occur (a surf closes the menu).
    - **Scroll container:** Confirmed `.osd__body` is the real scroll container — `.osd` is `overflow: hidden` and `inset`-bounded inside the `overflow: hidden` screen, and `.osd__body` is `flex: 1; min-height: 0; overflow-y: scroll` (measured scrollHeight 700 vs clientHeight 150). Wheel/trackpad/keyboard scrolling and the in-OSD green scrollbar remain as secondary affordances; the bezel rocker is the visible control.
    - **Reactive visibility:** Telly holds a ref to `.osd__body` (passed to `TellyMenu` via a new `bodyRef` prop) and derives overflow / per-end scroll state via a new pure helper `src/client/osd-scroll.ts` (`computeOsdScrollState`, `osdScrollStep`). A `ResizeObserver` watches the body AND its content children (so chip wrap/unwrap on filter toggles is detected), plus a scroll listener and re-sync on menu/mode/filter changes.
    - **Footprint / mobile:** The rocker (two 20px keys) sits below the screen, right-aligned near the stand within the telly's 12px bottom padding (bezel `margin-bottom: -8px`); it does not overlap the pop-out spot and does not grow the non-embedded footprint. 390px: no horizontal scroll.
    - **Files:** `Telly.tsx` (rocker + scroll logic + `bodyRef`), `TellyMenu.tsx` (`bodyRef` on `.osd__body`), new `osd-scroll.ts`, `surfdeck.css` (`.telly__rocker`/`.telly__rocker-key`), new `osd-scroll.test.ts` (overflow-visibility maths), extended `Telly.embed.test.ts` (rocker wiring + closed-menu absence).
    - Verified: `tsc --noEmit` clean; all tests green (268); ceremony/palette/fonts untouched; rocker shows only on overflow and hides reactively; ends dim correctly; keyboard + hold-to-scroll work; 390px no horizontal scroll.
  - **REVERT (the rocker + OSD-scroll rework solved the wrong problem and regressed the TUNING menu):** The bezel ▲/▼ rocker and the OSD-scroll machinery are removed entirely; the OSD is restored to size-to-content within the screen. The real scrolling need was the EMBEDDED SITE, which the parent page cannot scroll for a cross-origin iframe (no button/script can), so no such control is provided.
    - **Removed:** the bezel ▲/▼ rocker UI, `src/client/osd-scroll.ts` + `osd-scroll.test.ts`, the `bodyRef` threading (`TellyMenu` prop + ref on `.osd__body`), and all `ResizeObserver`/scroll-sync/hold-to-scroll state, effects, and helpers in `Telly.tsx`. Dropped the `.telly__rocker*` CSS. The rocker test block in `Telly.embed.test.ts` is replaced by an "iframe scrolling is not stolen" block.
    - **OSD sizes to content:** `.osd` is anchored `top/left/right: 12px; bottom: auto; max-height: calc(100% - 24px)` so the panel grows only as far as its content needs and never spills past the screen. `.osd__body` drops `flex: 1` and uses `overflow-y: auto` (was `scroll`), so at desktop the menu fits with **no internal clipping and no scrollbar**; only when the screen is genuinely small (mobile) does the body scroll, with the existing styled green scrollbar as the affordance there.
    - **Nothing steals iframe scrolling:** verified the topmost element at the screen centre while embedded is the `IFRAME.telly__iframe` (no overlay above it); the closed OSD is `pointer-events: none` (only `.osd--open` is interactive) and the iframe is `pointer-events: auto`, so pointer/wheel/touch over the screen reach the embedded site. No parent-side scrolling of the cross-origin frame is attempted.
    - **Pop-out unchanged** on the bezel (coral "POP OUT ↗" button, visible only while embedded).
    - **Files:** `Telly.tsx`, `TellyMenu.tsx`, `surfdeck.css`, `Telly.embed.test.ts`; deleted `osd-scroll.ts` + `osd-scroll.test.ts`.
    - Verified: `tsc --noEmit` clean; all tests green (253); ceremony/palette/fonts untouched; desktop TUNING menu fits its content within the screen (no clip/scroll); 390px no horizontal scroll (body scrolls inside the OSD).
