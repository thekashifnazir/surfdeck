# Design: Cycle 6 — "Telly Is the Destination"

## Overview

This document describes the technical design for embedding surfed sites inside the telly, consolidating filters into a TUNE flyout, upgrading the provenance card, and fixing three verified bugs. It maps each requirement to concrete file-level changes without altering the existing palette, fonts, or ceremony timing.

---

## 1. Architecture: Embeddable Flag Pipeline

### Decision: D1 column, not CSV column

The embeddable flag is runtime metadata derived from HTTP headers — not a property of the curated corpus itself. Storing it in D1 (not the CSV) keeps the CSV schema frozen at 12 columns and decouples the mechanical check from editorial curation.

### Pipeline flow

```
scripts/check-embeddable.ts
    │
    ├── reads all URLs from data/featured-sites.csv (or from D1 via wrangler)
    ├── HTTP GET each URL (concurrency-limited, e.g. 5 at a time; follow
    │     redirects; desktop-browser User-Agent; body discarded, not downloaded)
    ├── inspects response headers:
    │     X-Frame-Options: DENY or SAMEORIGIN → embeddable = false
    │     CSP frame-ancestors: not * and not including our origin → embeddable = false
    │     network error / timeout → embeddable = false (pessimistic)
    │
    └── writes results to .embeddable-cache/<url-hash>.json
            { "url": "…", "embeddable": true/false, "checked_at": "ISO" }

Why GET, not HEAD: measured on 30 corpus sites, neal.fun returns 403 to a
HEAD request and the block page's own X-Frame-Options was misleading; the same
URL under GET returns the real page headers. Why pessimistic on failure: a
false negative costs only a harmless new-tab fallback, whereas a false positive
shows a blank telly. The body is read-then-discarded (never persisted) so we
pay only header cost while still triggering the real (non-HEAD) response.
```

### Seed integration

The seed script (`scripts/seed.ts` / `scripts/seed-logic.ts`) gains a step:

1. After CSV parsing, load the `.embeddable-cache/` lookup.
2. For each row, resolve embeddable from cache (default `true` if missing).
3. The generated INSERT includes the `embeddable` column value.

### D1 schema change

```sql
ALTER TABLE sites ADD COLUMN embeddable INTEGER NOT NULL DEFAULT 1;
```

Added to `schema.sql` as a comment-gated migration (same pattern as the existing `vibecoded` and `built_with` additions). The seed script's `CREATE TABLE IF NOT EXISTS` block gains the column.

### API change

`/api/surf` response gains `embeddable: boolean` (mapped from integer 1/0 in `transformSiteResponse`).

---

## 2. Client: Iframe in the Telly

### Component changes

**Telly.tsx** gains:

- A new prop `embeddedUrl: string | null` — set after the ceremony completes for embeddable sites.
- An `<iframe>` element rendered inside `.telly__screen` when `embeddedUrl` is truthy and `zapState === "tuned"`.
- The iframe is absolutely positioned to fill the screen area (`inset: 0`), layered above the tuned overlay via z-index.
- Attributes: `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"`, `referrerpolicy="no-referrer"`, no `allow`.

**Timing:**
- During `zapping`, the iframe is not rendered (snow plays).
- On transition to `tuned`, the tuned overlay flashes briefly (existing ceremony), then the iframe fades in over 200ms (CSS opacity transition).
- Under `prefers-reduced-motion`: iframe appears immediately at opacity 1.

### Telly width growth

```css
.telly-container { flex: 1; min-width: 0; transition: flex-basis 0.3s ease; }
.telly-container--embedded { flex-basis: 70%; }
```

The `--embedded` modifier is applied when an iframe is loaded. On mobile (≤768px) the telly is always full-width (stacked layout), so the modifier has no effect.

### Pop-out button

A `<button className="telly__popout">` sits in the `.telly` padding area (top-right corner of the TV body, outside the screen radius). Contains an inline SVG "external link" icon. Visible only when `embeddedUrl` is set.

```css
.telly__popout {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 44px; height: 44px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.telly__popout svg { width: 16px; height: 16px; fill: var(--caption-grey); }
.telly__popout:hover svg { fill: var(--coral); }
```

### Non-embeddable / load-failure fallback

When `embeddable === false` (or an embed fails to load within 5s — see below):
- `useSurf` opens nothing; `embeddedUrl` stays null.
- Telly transitions to tuned state showing a pressable fallback control instead of an iframe.
- The fallback is a real `<button className="telly__screen--fallback">`: off-white bg, centered text "this channel won't tune in — press to open it across the room" in Doto 12px. Its `onClick` calls `window.open(url, '_blank')` — a user gesture, so it is never popup-blocked.
- Pop-out button hidden during the fallback (the fallback control is itself the opener).

### Load-failure timer (embed that never renders)

When an embed starts (`embeddedUrl` set + tuned), Telly arms a 5-second timer. The iframe's `onload` clears it. If the timer expires first, Telly swaps to the same pressable fallback control for that site's URL.

`onload` is NOT treated as proof the site rendered — Chrome fires `onload` even for XFO-blocked frames. Preventing those is the precomputed `embeddable` flag's job; the timer is a backstop for sites whose headers changed since the last check. The pop-out button stays visible for the whole embedded session (it only disappears once we swap to the fallback control).

### SurfSite type update

```typescript
export interface SurfSite {
  // … existing fields …
  embeddable: boolean;
}
```

### useSurf.ts changes

Nothing opens on surf press — the optimistic blank tab is removed entirely, along with all tab-close logic. The hook's branching after the fetch resolves:
- If `site.embeddable === true`: call `onEmbedUrl(site.url)` so the telly renders an iframe.
- If `site.embeddable === false`: call `onEmbedUrl(null)`. Do NOT auto-open anything — the telly's pressable fallback control is the opener.

This drops the earlier "open a blank tab optimistically then close it" trick. Because we no longer open anything on press, the synchronous-gesture concern moves to the fallback control: the visitor's click on that button is itself the gesture, so its `window.open` is never popup-blocked.

---

## 3. Filter Consolidation — TUNE Flyout

### Remote layout change

The remote's internal layout at rest:
1. IR LED (absolute)
2. LCD
3. SURF key
4. Mood keys (3×2 grid)
5. INPUT key
6. TUNE key (new, full-width chiclet)

### TUNE key

Same styling as INPUT key: full-width, bg `#F2F0E9`, shadow `0 3px 0 #B8B4A8`, 10.5px Familjen Grotesk 600. Label: "TUNE ▾" (chevron down). When flyout open: "TUNE ▴" (chevron up), active-coral styling.

### Flyout panel

A `<div className="tune-flyout">` that expands below the TUNE key, inside the remote body. Uses `max-height` + overflow transition (same pattern as card-slot).

```css
.tune-flyout {
  width: 100%;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.tune-flyout--open { max-height: 400px; }
```

Contents (conditional on INPUT mode):

**OPEN WEB mode:**
- Character chips (4 values)
- Stack chips (from `/api/filters`)
- Host chips (from `/api/filters`)
- Static/Dynamic chips (2 values)

**VIBECODED mode:**
- Corner tier chips (from `/api/filters`)

Each group has a label row (same `.filters__label` styling).

**CLEAR ALL** button: bottom of flyout, text-only link style ("Clear all ×"), coral on hover. Resets `selectedCharacter`, `buildFilters`, and `selectedTiers` to defaults.

### LCD summary of active filters

The LCD text logic gains a new branch for `tuned` state with filters active:

```
Priority order:
1. no_match → "NOTHING IN THAT CORNER RIGHT NOW"
2. zapping → "TUNING > CH {n}"
3. tuned + mood + filters → "CH {n} · {MOOD_ABBREV} · {FILTER_LABEL}"
4. tuned + mood, no filters → "CH {n} · {MOOD_LABEL_SHORT}"
5. tuned, no mood → "CH {n} - {MODE}"
6. idle + mood → mood full label
7. idle, no mood → mode label
```

Abbreviations for LCD (space-constrained):
- Mood: first word uppercase (USEFUL, TEACH, WASTE, BEAUTY, THINK)
- Filter: first active secondary filter's value uppercased (e.g. "NEOCITIES", "NEXTJS")
- Multiple secondaries: show first + `+{n}`

### Removed elements

- `<section className="filters">` and its children (CharacterFilter, BuildFilter, CornerTierFilter components rendered below the scene) — fully removed from App.tsx.
- The components themselves remain (reused inside the flyout) but their standalone rendering site is deleted.

---

## 4. Provenance Card — Position + Content

### Layout change (desktop)

Current: card prints below the telly inside `.telly-container`.
New: card renders in a third column to the RIGHT of the telly, inside the `.scene` flex row.

```
.scene (flex row, align-items: flex-end)
├── .remote (240px, flex-shrink: 0)
├── .telly-container (flex: 1, min-width: 0)
└── .card-column (width: 220px, flex-shrink: 0, align-self: stretch)
       └── CardSlot + ProvenanceCard
```

On mobile (≤768px): the card-column moves below the telly-container (flex-wrap or explicit stacking).

### Card content additions

```
┌─────────────────────────────────────────────┐
│  "Site Title Here"                    STAMP  │
│  CATCH № 142 OF {TOTAL}                     │
│                                             │
│  React SPA · Netlify · Static               │
│                                             │
│  "Why this site is here" — curator note     │
│                                             │
│  Everyone's a builder.                      │
│  Learn from the sites you like.             │
└─────────────────────────────────────────────┘
```

- Title: Familjen Grotesk 600, 14px, ink. First line of the card.
- Catch line: existing heading style (0.65rem uppercase caption-grey).
- Why-note: italic, body-grey, Familjen Grotesk 400, 12px. Appears below the provenance line.
- Stamp: "OPENS IN TELLY" when embedded, "OPENS IN NEW TAB" when non-embeddable.

### CORPUS_TOTAL from API

New endpoint: `GET /api/corpus-size` → `{ "total": 349 }` (a simple `SELECT COUNT(*) FROM sites WHERE nsfw = 0`).

The ProvenanceCard fetches this once on mount (or receives it as a prop from App, which fetches alongside `/api/filters`). Avoids hardcoding.

---

## 5. Bug Fix: Press-Note Layout

### Current (broken)

```tsx
<div className="scene">
  <Remote … />
  <div className="telly-container">…</div>
  <p className="press-note">…</p>   ← third flex child, steals width
</div>
```

### Fixed

```tsx
<div className="scene">
  <Remote … />
  <div className="telly-container">…</div>
  <div className="card-column">…</div>
</div>
<p className="press-note">…</p>   ← outside .scene, below telly
```

The press-note becomes a block element between `.scene` and the status message. Centred text, margin-top 8px.

---

## 6. Bug Fix: First-Press Card Delay

### Current (broken)

```typescript
const staticDuration = isFirstSurf ? 800 : 400;
const cardDelay = isFirstSurf ? 600 : 500;
// Inner timer: cardDelay - staticDuration = -200ms (clamped to 0)
```

### Fixed

Change `cardDelay` for first-surf to `1200`:

```typescript
const staticDuration = isFirstSurf ? 800 : 400;
const cardDelay = isFirstSurf ? 1200 : 500;
// Inner timer: 1200 - 800 = 400ms (visible pause), 500 - 400 = 100ms (snappy reprint)
```

This produces a 400ms pause between the tuned overlay appearing and the card starting to print — matching the "held up then slides" feel described in the ceremony spec.

---

## 7. Bug Fix: LCD Channel After Mood Selection

### Current (broken)

```typescript
} else if (selectedMood && MOOD_LABELS[selectedMood]) {
  lcdText = MOOD_LABELS[selectedMood];   // channel number lost
}
```

### Fixed

The LCD logic becomes:

```typescript
if (statusMessage === "no_match") {
  lcdText = "NOTHING IN THAT CORNER RIGHT NOW";
} else if (zapState === "zapping") {
  lcdText = `TUNING > CH ${channelCounter}`;
} else if (zapState === "tuned" && selectedMood && MOOD_LABELS[selectedMood]) {
  // Tuned with mood: show channel + abbreviated mood
  lcdText = `CH ${channelCounter} · ${selectedMood.toUpperCase()}`;
} else if (selectedMood && MOOD_LABELS[selectedMood]) {
  // Idle with mood (pre-first-surf): show full mood label
  lcdText = MOOD_LABELS[selectedMood];
} else {
  const modeLabel = cornerMode ? "VIBECODED" : "OPEN WEB";
  lcdText = channelNumber ? `CH ${channelCounter} - ${modeLabel}` : modeLabel;
}
```

Key change: once tuned, the channel number is always visible even when a mood is selected.

---

## 8. Data Flow Diagram

```
User presses SURF
       │
       ├─ channelCounter updated (rolling)
       ├─ zapState → "zapping"
       ├─ (nothing opens — no blank tab)
       │
       └─ fetch /api/surf?…
              │
              ├─ response: { status: "ok", site: { …, embeddable } }
              │     │
              │     ├─ embeddable === true
              │     │     ├─ setEmbeddedUrl(site.url)
              │     │     └─ ceremony completes → iframe fades in
              │     │            └─ 5s load-failure timer; onload clears it,
              │     │               else swap to pressable fallback
              │     │
              │     └─ embeddable === false
              │           ├─ setEmbeddedUrl(null)  [nothing auto-opens]
              │           └─ ceremony completes → pressable fallback control
              │                  └─ user press → window.open(url, "_blank")
              │
              ├─ response: { status: "no_match" }
              │     └─ LCD shows no-match
              │
              └─ response: { status: "exhausted" }
                    └─ NO SIGNAL state
```

---

## 9. File Impact Summary

| Area | Files affected | Nature of change |
|------|---------------|-----------------|
| Bug fixes | `src/client/App.tsx` | Move press-note, fix cardDelay, fix LCD logic |
| Filter consolidation | `src/client/App.tsx`, new `src/client/components/TuneFlyout.tsx`, `src/client/components/Remote.tsx`, `src/client/surfdeck.css` | New TUNE key + flyout; remove filters section |
| Card upgrade | `src/client/components/ProvenanceCard.tsx`, `src/client/surfdeck.css`, `src/client/App.tsx` | Add title/why-note, move to card-column, corpus-size fetch |
| Corpus-size API | `src/worker/routes/corpus-size.ts`, `src/worker/index.ts` | New tiny endpoint |
| Embeddable pipeline | new `scripts/check-embeddable.ts`, `scripts/seed.ts`, `scripts/seed-logic.ts` | Pipeline script + seed integration |
| D1 schema | `schema.sql` | Add `embeddable` column |
| API response | `src/worker/routes/surf.ts`, `src/worker/engine/surf.ts` | Include embeddable in response |
| Iframe embed | `src/client/components/Telly.tsx`, `src/client/hooks/useSurf.ts`, `src/client/App.tsx`, `src/client/surfdeck.css` | Iframe rendering, conditional tab open, layout growth |
| Tests | new test files alongside changed modules | Cover iframe logic, flyout, card content, bug fixes |

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Blank iframe for sites that changed headers since check | User sees empty telly screen | 5s load-failure timer (cleared by iframe `onload`) swaps to the pressable fallback control; pop-out button also available while embedded |
| TUNE flyout makes remote taller than viewport on small screens | Scroll needed | Flyout uses `max-height: min(400px, 50vh)` with `overflow-y: auto` |
| iframe sandbox too permissive (allow-same-origin + allow-scripts) | Framed site can access its own cookies/storage | Acceptable: we're not protecting our origin. The omission of allow-top-navigation prevents frame-busting. |
| Corpus-size endpoint adds a DB query per page load | Negligible: COUNT on a ~350-row table is instant on D1 | Cache response with `Cache-Control: public, max-age=3600` |
| ~~Optimistic blank tab flash~~ (removed) | n/a | No tab opens on press anymore. The only `window.open` is the fallback control's, which runs inside the user's click gesture — never popup-blocked, no flash. |

---

## 11. Out of Scope

- Live runtime frame-detection that treats `onload` as proof of a successful render — explicitly excluded (Chrome fires `onload` for blocked frames). The precomputed flag remains the source of truth; the 5s load-failure timer is only a coarse backstop for stale headers, not header sniffing.
- Changes to the existing ceremony timing values (CSS custom properties unchanged).
- Auth, accounts, or server-side user state.
- CDN font loading — all fonts remain self-hosted.
