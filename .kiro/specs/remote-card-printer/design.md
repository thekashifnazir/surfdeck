# Design: Remote + Card Printer — Corrective Visual Pass

## Overview

This is an INCREMENTAL CORRECTION to the existing implementation. The component architecture is correct. The changes target specific visual values, animation mechanics, and one new element (press-note) that diverged from the canonical reference design.

Architecture diagram, hook split, component tree, state ownership — all unchanged. This document specifies WHAT CHANGES per file.

---

## File-by-File Changes

### `src/client/surfdeck.css`

This is where most corrections live.

#### Section 2: CSS Custom Properties

**KEEP:** All palette variables (correct), font stacks, timing variables.

**ADD:**
```css
--led-off: #4A4A50;
--tv-body: #26262A;
```

**CHANGE:**
- `--font-body` fallback: `'Familjen Grotesk', 'Trebuchet MS', sans-serif` (replace Arial/Helvetica Neue)
- `--font-lcd` fallback: `'Doto', 'Courier New', monospace` (drop Lucida Console)
- `--font-card` fallback: `'Special Elite', 'Courier New', monospace` (drop Lucida Console)

#### Section 5: Remote

**CHANGE `.remote`:**
- `border-radius: 22px` (replace `24px 24px 32px 32px`)
- `padding: 16px 18px 20px` (replace `1.5rem 1.25rem 2rem`)
- `gap: 12px` (replace `1rem`)
- `box-shadow: 0 8px 0 #17171A` (replace `0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`)

**CHANGE `.ir-led`:**
- `width: 9px; height: 9px` (replace 8px)
- `background: var(--led-off)` i.e. `#4A4A50` (replace `var(--deep-shadow-1)`)

**CHANGE `.lcd`:**
- `border-radius: 8px` (replace 4px)
- `padding: 8px 10px` (replace `0.5rem 0.75rem`)
- Remove the `border: 1px solid rgba(159,232,112,0.1)` — no border on LCD
- Remove `min-height`, `justify-content`, `text-align` centering — left-align, single line

**CHANGE `.lcd__text`:**
- `font-size: 10px` (replace 0.7rem)
- `line-height: 17px` (replace 1.3)
- `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`

**CHANGE `.lcd--flicker` animation:**
- Duration `.5s steps(3)` (replace `.3s steps(3)`)

**CHANGE `.surf-key` — CRITICAL (pill → circle):**
- Remove `width: 100%`
- `width: 116px; height: 116px; border-radius: 50%` (circle)
- `border: 3px solid #17171A`
- `font-size: 23px` (replace 1.1rem)
- `padding: 0` (replace `1rem`)
- `box-shadow: 0 7px 0 #A33417` (replace `0 4px 0 var(--coral-pressed), 0 6px 12px rgba(0,0,0,0.3)`)
- Add `display: flex; align-items: center; justify-content: center`
- Remove `min-height: 52px`
- Remove `letter-spacing: 0.05em`

**CHANGE `.surf-key:hover`:**
- `transform: translateY(-2px)`
- `box-shadow: 0 9px 0 #A33417`
- Remove `background: #d94a28` — keep coral on hover, just lift

**CHANGE `.surf-key:active, .surf-key--pressed`:**
- `transform: translateY(5px)` (replace 3px)
- `box-shadow: 0 1px 0 #A33417` (replace `0 1px 0 var(--coral-pressed), 0 2px 4px rgba(0,0,0,0.2)`)

**CHANGE `.mood-keys`:**
- `grid-template-columns: repeat(3, 1fr)` (replace `1fr 1fr`)
- `gap: 8px` (replace `0.4rem`)

**CHANGE `.mood-key`:**
- `background: #F2F0E9` (replace `var(--deep-shadow-1)` / `#141416`)
- `color: var(--ink)` i.e. `#26262A` (replace `#ccc`)
- `font-size: 10.5px` (replace 0.65rem)
- `border-radius: 9px` (replace 6px)
- `box-shadow: 0 3px 0 #B8B4A8` (replace `0 2px 0 var(--deep-shadow-2)`)
- Remove `letter-spacing: 0.04em`

**CHANGE `.mood-key:hover`:**
- `background: #E8E6DF` (slightly darker cream — NOT `#222225`)
- `color: var(--ink)` (NOT `#fff`)

**CHANGE `.mood-key--active`:**
- `box-shadow: 0 3px 0 #A33417` (replace `0 2px 0 var(--coral-pressed)`)

**ADD `.mood-key:active`:**
```css
.mood-key:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #B8B4A8;
}
.mood-key--active:active {
  box-shadow: 0 1px 0 #A33417;
}
```

**CHANGE `.input-key`:**
- `background: #F2F0E9` (light chiclet, same as mood keys — replace `var(--deep-shadow-2)`)
- `color: var(--ink)` (replace `#999`)
- `border: none` (replace `1px solid #333`)
- `border-radius: 9px` (replace 6px)
- `box-shadow: 0 3px 0 #B8B4A8`
- `font-size: 10.5px` (replace 0.6rem)

**CHANGE `.input-key:hover`:**
- `background: #E8E6DF` (replace `color: #fff; border-color: #555`)

**CHANGE `.input-key--active`:**
- `background: var(--coral); color: #fff; box-shadow: 0 3px 0 #A33417`
- Remove `color: var(--lcd-green); border-color: rgba(159,232,112,0.3)`

#### Section 6: Telly

**CHANGE `.telly`:**
- `background: var(--tv-body)` i.e. `#26262A` (replace `#222`)
- `border-radius: 14px` (replace 12px)
- `box-shadow: 0 6px 0 #141416` (replace `0 8px 24px rgba(0,0,0,0.2), inset 0 0 0 2px #333`)

**CHANGE `.telly__screen`:**
- `border-radius: 6px` (replace 4px)
- `min-height: 158px` (keep aspect-ratio as progressive enhancement)

**CHANGE tuned state — ADD `.telly__screen--tuned` overlay:**
```css
.telly__screen--tuned {
  background: #F2F0E9;  /* OFF-WHITE — not dark */
}
```

**CHANGE `.telly__channel`:**
- `font-size: 20px` (replace `clamp(2rem, 5vw, 3.5rem)`)
- `color: var(--ink)` i.e. `#26262A` (replace `#fff`)

**CHANGE `.telly__subtitle`:**
- `font-size: 11px` (replace 0.8rem)
- `color: var(--body-grey)` (replace `var(--caption-grey)`)

**ADD `.telly__screen--tuned` tune-in animation:**
```css
.telly__screen--tuned {
  animation: tune-in .3s steps(2);
}
.telly__screen--tuned-fast {
  animation: tune-in .15s steps(2);
}
@keyframes tune-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

**CHANGE `.telly__no-signal`:**
- Remove `text-shadow: 0 0 8px rgba(255,255,255,0.3)` (no glow — flat aesthetic)

**REMOVE `.telly__screen--idle::after`** scanline pseudo-element (reference design has no idle scanlines).

**ADD `.telly__stand`** — a short dark foot between the TV body and the card slot:
```css
.telly__stand {
  width: 55%;
  height: 10px;
  background: #141416;
  border-radius: 0 0 8px 8px;
  margin: 0 auto;
}
```
Rendered inside the `telly-container` div, between `.telly` and `<CardSlot>`. In Telly.tsx (or inline in App.tsx's telly-container) add `<div className="telly__stand" aria-hidden="true" />` after the `.telly` closing div.

#### Section 7: Card Slot — CRITICAL rewrite (slide-up → print-down)

**REPLACE entire card-slot section:**

```css
.card-slot {
  overflow: hidden;
  max-height: 0;
  padding: 0 14px;
  transition: max-height .3s ease-out;
}

.card-slot--visible {
  max-height: 190px;
}

.card-slot__inner {
  transform: translateY(-105%);
}

.card-slot--visible .card-slot__inner {
  animation: firstprint 1.9s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

.card-slot--reprint .card-slot__inner {
  animation: reprint 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

@keyframes firstprint {
  0%, 55% { transform: translateY(-105%); }
  100% { transform: translateY(0); }
}

@keyframes reprint {
  0% { transform: translateY(0); }
  30% { transform: translateY(-105%); }
  60% { transform: translateY(-105%); }
  100% { transform: translateY(0); }
}
```

**REMOVE** current `.card-slot--ducking` class (replaced by `reprint` animation).

#### Section 8: Provenance Card

**CHANGE `.prov-card`:**
- `border: 2px solid #26262A` (replace `1px solid #e0ddd5`)
- `border-top: none` (reads as printing from slot above)
- `border-radius: 0 0 12px 12px` (replace `8px`)
- `padding: 16px 20px 14px` (replace `1.25rem 1.5rem`)
- `box-shadow: 0 4px 8px rgba(38,38,42,.12)` (replace `0 2px 8px rgba(0,0,0,0.06)`)

**CHANGE `.prov-card__stamp`:**
- `transform: rotate(-4deg)` (replace `rotate(3deg)`)
- Add `border: 1.5px solid var(--coral); padding: 2px 6px; border-radius: 3px`
- Remove loose `opacity: 0.8`

#### Section 9: Filters

**CHANGE `.chip`:**
- `min-height: 44px` (replace 36px) — accessibility requirement

#### Section 11: Keyframe Animations

**REPLACE static noise with pixel-dot fuzz:**

```css
@keyframes fuzz {
  0% { background-position: 0 0; }
  33% { background-position: -1px 1px; }
  66% { background-position: 1px -1px; }
  100% { background-position: 0 0; }
}

.telly__screen--static,
.telly__screen--static-fast,
.telly__screen--exhausted {
  background-image: radial-gradient(rgba(242,240,233,.7) 0.6px, transparent 0.6px);
  background-size: 3px 3px;
  background-color: var(--screen);
  opacity: .45;
  animation: fuzz .4s steps(3) infinite;
}
```

Remove the current SVG feTurbulence data-URI and repeating-linear-gradient patterns.

**CHANGE LED animations:**
- Full: `.3s steps(2)` × 3 pulses → keyframe named `led-blip-full`, total duration ~0.9s
- Compressed: `.25s steps(2)` × 2 pulses → keyframe named `led-blip-fast`, total ~0.5s
- LED glow: `box-shadow: 0 0 6px 2px var(--coral)` during blip (keep existing approach)

**CHANGE LCD flicker:**
- Duration `.5s steps(3)` (replace 0.3s)

#### Section 12: Reduced Motion

**KEEP** existing approach (disable all keyframes/transitions).

**ADD:** Card shows at `translateY(0)` immediately; slot at `max-height: 190px` immediately.

**ADD:** Tuned overlay visible immediately (no tune-in animation).

#### Section 13: Responsive

**CHANGE `.scene`:**
- `align-items: flex-end` (replace `flex-start`)

**At ≤768px:**
- Mood keys already switch to 3-col (this is now the default — keep 3-col at all sizes)
- Remote stacks full-width (keep)

**At ≤430px:**
- Telly channel font stays 20px (remove the current 2rem override)

---

### `src/client/App.tsx`

#### State Changes

**ADD** new state:
```typescript
const [channelCounter, setChannelCounter] = useState(217); // rolling TV counter
const [pressCount, setPressCount] = useState(0); // for press-note text
```

**CHANGE** `channelNumber` usage:
- Currently `setChannelNumber(lastSurfResult.id)` — CHANGE to rolling counter logic
- Compute next channel: `const next = ch + 1 + (ch % 5); setChannelCounter(next > 999 ? 7 : next)`
- The rolling counter drives the on-screen "CH {n}" in Telly and LCD
- The site ID drives the card heading (passed to ProvenanceCard as-is — unchanged)

**CHANGE** LCD text logic:
- Zapping: `TUNING > CH ${channelCounter}` — use the ROLLING counter. Set channelCounter BEFORE setting zapState to 'zapping' so it's never null. Remove the current fallback "TUNING..."
- Idle with no mood: `CH ${channelCounter} - ${cornerMode ? 'VIBECODED' : 'OPEN WEB'}` (was just "INPUT: OPEN WEB")
- Before first surf (channelCounter === 217, pressCount === 0): just show the mode label as today

**CHANGE** handleSurf:
- Increment `pressCount` (for press-note)
- Compute next channel counter BEFORE setting zapping state
- Pass `isReprint` flag to CardSlot (true when pressCount > 0 and card was visible)

**ADD** press-note rendering below the telly-container:
```tsx
<p className="press-note">
  {pressCount === 0 && "press SURF — zap, then the card prints"}
  {pressCount === 1 && "channel and card stay up — press again whenever"}
  {pressCount >= 2 && "quick blip; the card reprints with each catch"}
</p>
```

**CHANGE** hero headline:
```tsx
<p className="hero__headline">
  Every catch prints a card worth keeping.
</p>
```

---

### `src/client/components/Remote.tsx`

**NO structural changes.** All corrections are CSS-driven (the circle SURF key, 3-col light chiclets, new shadows are all class-based — the markup is already correct).

---

### `src/client/components/Telly.tsx`

**CHANGE** screen state class application for tuned state:
- Add `telly__screen--tuned-fast` class variant for compressed ceremony
- Pass `isFirstSurf` to determine which tuned class to apply

**ADD** tuned overlay as explicit HTML (currently the tuned content renders directly in the screen — the new design needs a positioned overlay with off-white background):
```tsx
{zapState === "tuned" && channelNumber !== null && (
  <div className="telly__tuned-overlay">
    <span className="telly__channel">CH {channelNumber}</span>
    <span className="telly__subtitle">
      somebody's hand-made site → opens in a new tab
    </span>
  </div>
)}
```

Add `.telly__tuned-overlay` CSS: `position: absolute; inset: 0; background: #F2F0E9; display: flex; flex-direction: column; align-items: center; justify-content: center`.

---

### `src/client/components/CardSlot.tsx`

**CHANGE** the state classes:
- Replace `card-slot--visible` + `card-slot--ducking` with `card-slot--visible` + `card-slot--reprint`
- The `reprint` state replaces `ducking` — same trigger (card already showing when next surf fires), different animation direction

**CHANGE** props interface:
- Replace `ducking: boolean` with `reprint: boolean` (or keep same prop name, just rename the CSS class it maps to)
- The slot should also get `visible` toggled slightly differently: it stays visible once opened (never closes back to max-height 0 until reset)

---

### `src/client/components/ProvenanceCard.tsx`

**CHANGE** heading total:
- Replace hardcoded `288` with a constant: `const CORPUS_TOTAL = 349;`
- Add a comment: `// Update when data/featured-sites.csv changes. Source of truth: SELECT COUNT(*) FROM sites WHERE nsfw = 0`
- Render: `CATCH №\u00A0{site.id} OF ${CORPUS_TOTAL}`

**CHANGE** stamp rotation:
- The `rotate(-4deg)` is CSS-only (handled in surfdeck.css), no TSX change needed

---

### `src/client/hooks/useSurf.ts`

**NO CHANGES.** The hook's behaviour (fetch, tab-open, seen-list, status callbacks) is correct and stays.

---

### `src/worker/routes/ouroboros.ts`

**CHANGE** the card heading from `288 OF 288` to use the same constant (or hardcode `349 OF 349` since this is a static HTML page served by the worker). Add comment noting the value must track the corpus.

**KEEP** the dot-matrix ouroboros glyph (already implemented correctly).

**APPLY** the same shadow-language and palette corrections to the inline CSS in the ouroboros HTML:
- TV shadow → flat `0 6px 0 #141416`
- Card border → `2px solid #26262A`, no border-top, `border-radius: 0 0 12px 12px`
- Tuned background → `#F2F0E9` (off-white)

---

## State Machine (clarified — no structural change to App.tsx)

```
idle → [SURF press] → zapping → [timer] → tuned/hold
tuned/hold → [SURF press] → zapping (compressed) → [timer] → tuned/hold
exhausted → [Reset] → idle (first-press restored)
```

The implementation already follows this machine. The corrections are:
1. Set channel counter BEFORE entering zapping (so LCD is never null)
2. Use rolling counter (not site ID) for display
3. Card animation direction flips from slide-up to print-down
4. Tuned screen is off-white (not dark)

---

## What Does NOT Change

- File names and component exports
- Props interfaces (except CardSlot.ducking → CardSlot.reprint rename, same type)
- useSurf hook — zero changes
- All API routes — zero changes
- All test files — zero changes
- wrangler.jsonc, index.html, vite config
- Font files in public/fonts/
- Filter component logic (CharacterFilter, BuildFilter, CornerTierFilter)
- StatusMessage.tsx logic (only the hero headline copy changes, and that's in App.tsx)
