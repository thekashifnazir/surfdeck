# Requirements: Remote + Card Printer — Corrective Visual Pass

## Introduction

This spec covers a **corrective visual pass** on the existing Remote + Card Printer implementation. The component architecture (Remote.tsx, Telly.tsx, CardSlot.tsx, ProvenanceCard.tsx, useSurf.ts) is correct and stays. The corrections target specific visual values, shapes, and animation behaviours that diverged from the canonical reference design.

This is a reskin correction ONLY. Zero behaviour/API/routing/data changes. All 115 existing tests MUST still pass.

## Glossary

- **Hard shadow:** A `box-shadow` with 0px blur — flat offset only, like stacked paper.
- **Soft shadow:** A `box-shadow` with blur radius > 0 — currently used incorrectly on the remote and TV.
- **Rolling channel counter:** A decoupled TV-style counter (start 217, increments by `ch + 1 + (ch % 5)`, wraps >999 → 7) shown on-screen as "CH {n}".
- **Pixel-dot snow:** Static effect using `radial-gradient` dots (not SVG feTurbulence noise).
- **Print-down:** Card animation that starts at `translateY(-105%)` and drops to `translateY(0)` — as if printing out of a slot above.

---

## Requirement 1: Shadow Language — Flat Hard Offsets

**User Story:** As a visitor, I want the remote and telly to look like chunky physical objects sitting on a surface, with hard-edged drop shadows that feel like stacked paper.

### Acceptance Criteria

1. THE Remote SHALL have `box-shadow: 0 8px 0 #17171A` — zero blur.
2. THE TV body SHALL have `box-shadow: 0 6px 0 #141416` — zero blur.
3. THE SURF key resting state SHALL have `box-shadow: 0 7px 0 #A33417` — zero blur.
4. THE mood keys and INPUT key SHALL have `box-shadow: 0 3px 0 #B8B4A8` — zero blur.
5. THE active/coral mood keys SHALL have `box-shadow: 0 3px 0 #A33417`.
6. THE provenance card SHALL be the ONLY element with a soft shadow: `0 4px 8px rgba(38,38,42,.12)`.
7. NO element other than the provenance card SHALL have a blur radius > 0 in its box-shadow.
8. ALL existing `inset` box-shadow highlights SHALL be removed (the remote currently has `inset 0 1px 0 rgba(255,255,255,0.05)`).

---

## Requirement 2: SURF Key Shape — Circle

**User Story:** As a visitor, I want the SURF button to be a big satisfying circle — like a channel-change button on a real remote — not a full-width pill.

### Acceptance Criteria

1. THE SURF key SHALL be a circle: exactly 116px diameter, `border-radius: 50%`.
2. THE SURF key SHALL have a `3px solid #17171A` border.
3. THE SURF key background SHALL be coral `#E8542F` with off-white (`#FFFFFF` or `#F2F0E9`) text.
4. THE SURF key font SHALL be Familjen Grotesk 700 at 23px, centered.
5. THE SURF key SHALL NOT span `width: 100%` of the remote (current incorrect behaviour).
6. ON hover: `translateY(-2px)` with shadow `0 9px 0 #A33417`.
7. ON active/pressed: `translateY(5px)` with shadow `0 1px 0 #A33417`.

---

## Requirement 3: Mood Keys — Light Chiclets in 3-Column Grid

**User Story:** As a visitor, I want the mood keys to feel like light-coloured preset buttons on a remote — not dark sunken pads.

### Acceptance Criteria

1. THE mood keys grid SHALL use `grid-template-columns: repeat(3, 1fr)` with gap 8px.
2. EACH mood key default state SHALL have: bg `#F2F0E9`, text colour `#26262A` (ink), border-radius 9px.
3. EACH mood key SHALL use Familjen Grotesk 600 at ~10.5px.
4. EACH mood key default shadow SHALL be `0 3px 0 #B8B4A8` (flat, no blur).
5. THE active/selected mood key SHALL have: bg `#E8542F`, text off-white, shadow `0 3px 0 #A33417`.
6. ON press (`:active`): `translateY(2px)` with shadow `0 1px 0 …`.
7. THE keycaps SHALL be: USEFUL / TEACH / WASTE / BEAUTY / THINK / LUCKY (unchanged).
8. EACH key's `aria-label` SHALL be its full frozen sentence (unchanged from current implementation).

---

## Requirement 4: Remote Dimensions and Layout

**User Story:** As a visitor, I want the remote to feel like a compact physical device with consistent proportions.

### Acceptance Criteria

1. THE remote SHALL be 240px wide with bg `#2B2B2E`.
2. THE remote SHALL have `border-radius: 22px` (not the current 24px/32px mix).
3. THE remote padding SHALL be `16px 18px 20px`.
4. THE remote internal layout SHALL be column with gap 12px.
5. THE remote shadow SHALL be `0 8px 0 #17171A` (replaces current `0 8px 24px rgba(0,0,0,0.3)`).

---

## Requirement 5: IR LED

**User Story:** As a visitor, I want the IR LED to be a subtle dot that blips red during each zap.

### Acceptance Criteria

1. THE LED SHALL be a 9px circle, centered at the top of the remote.
2. THE LED default colour SHALL be `#4A4A50` (LED-off) — NOT the current `#141416`.
3. ON full-ceremony zap: the LED SHALL blip coral with glow, 3 pulses over `.3s steps(2)` each.
4. ON compressed zap: the LED SHALL blip coral, 2 pulses over `.25s steps(2)` each.

---

## Requirement 6: LCD Readout

**User Story:** As a visitor, I want the LCD readout to show what mode/channel I'm on in a retro dot-matrix style.

### Acceptance Criteria

1. THE LCD SHALL have bg `#1A241A`, border-radius 8px, padding `8px 10px`.
2. THE LCD text SHALL be Doto 900, ~10px font-size, green `#9FE870`, ~17px line-height.
3. THE LCD SHALL be single-line with `white-space: nowrap` and overflow hidden.
4. THE LCD SHALL flicker on zap start: `.5s steps(3)` animation (replaces current `.3s steps(3)`).
5. THE LCD text content during zapping SHALL be `TUNING > CH {n}` where `{n}` is the ROLLING channel number — NEVER "TUNING..." (fix the current dead-code issue by setting the channel BEFORE entering zapping state).

---

## Requirement 7: Telly — TV Body and Screen

**User Story:** As a visitor, I want the telly to feel like a small physical CRT monitor sitting on a surface.

### Acceptance Criteria

1. THE TV body SHALL have: width 100%, bg `#26262A`, border-radius 14px, padding 12px.
2. THE TV body shadow SHALL be `0 6px 0 #141416` (flat, no blur — replaces current `0 8px 24px rgba` + inset).
3. THE screen SHALL have: bg `#191916`, border-radius 6px, ~158px min-height (keep responsive via aspect-ratio), overflow hidden.
4. THE TV body SHALL NOT have `inset 0 0 0 2px #333` (current incorrect border).
5. A TV stand element SHALL sit directly below the TV body and above the card slot: width ~55%, height 10px, background `#141416`, border-radius `0 0 8px 8px`, horizontally centered.

---

## Requirement 8: Snow/Static Effect — Pixel-Dot Pattern

**User Story:** As a visitor, I want the TV static to look like a dot-matrix fuzz — not smooth fractal noise.

### Acceptance Criteria

1. THE static SHALL use `radial-gradient(rgba(242,240,233,.7) 0.6px, transparent 0.6px)` as the pattern.
2. THE background-size SHALL be `3px 3px`.
3. THE opacity SHALL be `.45`.
4. THE animation SHALL be `fuzz .4s steps(3) infinite` (background-position jitter).
5. THE current SVG `feTurbulence` data-URI noise pattern SHALL be removed entirely.
6. THE `repeating-linear-gradient` scanline overlays SHALL be removed.

---

## Requirement 9: Tuned Overlay — Off-White (Not Dark)

**User Story:** As a visitor, I want the tuned channel state to show text on a warm off-white field — like a channel card — not white text on a dark screen.

### Acceptance Criteria

1. THE tuned overlay SHALL be `position: absolute; inset: 0` over the screen.
2. THE tuned overlay background SHALL be `#F2F0E9` (off-white) — NOT the current dark `#191916`.
3. THE channel number SHALL be rendered in Doto 20px, ink colour `#26262A`.
4. THE subtitle "somebody's hand-made site → opens in a new tab" SHALL be 11px, grey.
5. THE tune-in animation SHALL be `.3s steps(2)` (full) / `.15s steps(2)` (compressed).

---

## Requirement 10: Card Slot — Print Down Animation

**User Story:** As a visitor, I want the provenance card to print downward out of a slot — like a receipt printer — not slide up from below.

### Acceptance Criteria

1. THE card slot SHALL be positioned below the TV stand with `overflow: hidden`.
2. THE slot height SHALL animate from `max-height: 0` to `~190px` (grows open).
3. THE card SHALL start at `transform: translateY(-105%)` (hidden above) and animate to `translateY(0)`.
4. THE first-press animation SHALL be `firstprint ~1.9s cubic-bezier` — held at -105% for 0–55% of the keyframe, then slides down.
5. THE repeat-press animation SHALL be `reprint ~1.2s` — card ducks UP to -105% midway, then returns with new data.
6. THE card SHALL PERSIST between presses (never auto-retract).
7. THE current `translateY(110%)` → `translateY(0)` (slide-up) animation SHALL be replaced.

---

## Requirement 11: Provenance Card Styling

**User Story:** As a visitor, I want the card to look like a typed receipt with a clear border — not a subtle rounded white card.

### Acceptance Criteria

1. THE card SHALL have: bg `#FFFFFF`, border `2px solid #26262A`, border-radius `0 0 12px 12px`.
2. THE card SHALL have **no border-top** (reads as printing from the slot above).
3. THE card padding SHALL be `16px 20px 14px`.
4. THE card shadow SHALL be `0 4px 8px rgba(38,38,42,.12)`.
5. THE stamp "OPENS IN NEW TAB" SHALL be bordered coral with `rotate(-4deg)` (currently `rotate(3deg)`).
6. THE card heading SHALL use a hardcoded constant `CORPUS_TOTAL = 349` (not the stale 288). The constant SHALL be declared once in ProvenanceCard.tsx with a comment: `// Update when data/featured-sites.csv changes`. No API change required.

---

## Requirement 12: Rolling Channel Counter (Decoupled from Data)

**User Story:** As a visitor, I want the on-screen channel number to feel like a real TV channel counter — not just the database ID.

### Acceptance Criteria

1. THE channel counter SHALL start at 217 for each session.
2. EACH surf SHALL compute next channel: `next = ch + 1 + (ch % 5)`.
3. WHEN channel > 999, it SHALL wrap to 7.
4. THE on-screen "CH {n}" (telly and LCD) SHALL use this rolling counter.
5. THE provenance card "CATCH № {n}" SHALL use the REAL site ID from the API (unchanged).
6. THE channel number SHALL be computed and stored BEFORE entering the zapping state so the LCD never displays null or "TUNING...".

---

## Requirement 13: Press-Note (New Element)

**User Story:** As a new visitor, I want a gentle hint about how the interaction works, evolving as I press.

### Acceptance Criteria

1. A press-note line SHALL appear below the telly (under the card slot area).
2. AT 0 presses: text SHALL be "press SURF — zap, then the card prints".
3. AFTER 1 press: text SHALL change to "channel and card stay up — press again whenever".
4. AFTER 2+ presses: text SHALL change to "quick blip; the card reprints with each catch".
5. THE text SHALL be italic, caption-grey `#8A867A`, Familjen Grotesk.

---

## Requirement 14: Hero Headline

**User Story:** As a visitor, I want the hero headline to match the reference design copy.

### Acceptance Criteria

1. THE hero headline SHALL read: "Every catch prints a card worth keeping." (replaces current "One press. One real site. New tab, across the room.").

---

## Requirement 15: Scene Layout — `align-items: flex-end`

**User Story:** As a visitor, I want the remote and telly to sit on the same baseline — grounded on a virtual surface — not floating from the top.

### Acceptance Criteria

1. THE `.scene` flex container SHALL use `align-items: flex-end` (replaces current `flex-start`).

---

## Requirement 16: Filter Chip Touch Targets

**User Story:** As a mobile user, I want filter chips to be easy to tap without accidentally hitting the wrong one.

### Acceptance Criteria

1. ALL `.chip` elements SHALL have `min-height: 44px` (replaces current 36px).
2. ALL interactive elements on the page SHALL maintain ≥44px touch targets.

---

## Requirement 17: Reduced Motion

**User Story:** As a visitor who prefers reduced motion, I want to see every end state without animation.

### Acceptance Criteria

1. UNDER `prefers-reduced-motion: reduce`: tuned overlay SHALL be immediately visible (no snow, no fade).
2. Card SHALL be at `translateY(0)` immediately (slot open, no print animation).
3. No LED blip, no LCD flicker, no static fuzz animation.
4. SURF key pressed state SHALL use a colour change (not translateY).
5. Snow animation SHALL be fully paused/removed (not running invisibly behind tuned content).

---

## Requirement 18: LCD Text Rules (Corrected Logic)

**User Story:** As a visitor, I want the LCD to always show relevant, never-blank or placeholder text.

### Acceptance Criteria

1. DURING zapping: LCD SHALL show `TUNING > CH {n}` (rolling counter — never null).
2. WHEN a mood is selected (not zapping): LCD SHALL show that mood's full frozen label.
3. WHEN idle with no mood: LCD SHALL show `CH {n} - OPEN WEB` or `CH {n} - VIBECODED` (with the current channel number — or nothing before first surf).
4. WHEN no_match: LCD SHALL show `NOTHING IN THAT CORNER RIGHT NOW`.

---

## Requirement 19: No Behaviour Changes (Guard Rails)

### Acceptance Criteria

1. ALL existing API endpoints SHALL continue to function identically.
2. ALL 115 existing tests SHALL pass without modification.
3. The `window.open` call SHALL remain the FIRST line of the surf handler (tab opens instantly — never gated on animation).
4. localStorage seen-list, filter logic, and corner-mode wiring SHALL remain unchanged.
5. Component file names (Remote.tsx, Telly.tsx, CardSlot.tsx, ProvenanceCard.tsx, useSurf.ts) SHALL remain unchanged.
6. No new npm dependencies SHALL be added.
