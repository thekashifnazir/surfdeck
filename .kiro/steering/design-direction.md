# Surfdeck — Design Direction: "Remote + Card Printer" (Corrective Pass)

## Concept

Surfdeck is a TV remote for the hand-made web. The page is the controller in your hand; the destination site is the telly across the room — it opens in a new tab. Every surf is a "zap": red light blips, static, tune-in. The channel stays up between presses, and each catch prints a typed provenance card from a slot under the telly. Warm, tactile, British; never dark-glow "AI site" styling.

## Ignore-the-Mockup-Chrome Note

The reference artboard contains design-tool scaffolding that is NOT product UI: the "MIX 7 / for comparison" label, the "Mix 4's remote…" subtitle, the colour-swatch row, and the RECIPE/TYPE/SIGNATURE/REPEAT-PRESS/RISK footer block. The fixed 680×1080 artboard is a desktop composition guide — keep our responsive breakpoints.

---

## Palette (exact values)

| Role | Value |
|------|-------|
| Page background | `#F2F0E9` (warm off-white) |
| Card white | `#FFFFFF` |
| Ink | `#26262A` |
| Body grey | `#6E6A5E` |
| Caption grey | `#8A867A` |
| Key shadow | `#B8B4A8` |
| Device charcoal | `#2B2B2E` (remote body) |
| TV body | `#26262A` |
| Screen | `#191916` |
| LCD background | `#1A241A` |
| Deep shadows | `#17171A` / `#141416` |
| LED off | `#4A4A50` |
| Primary coral | `#E8542F` (SURF key, accents, links) |
| Pressed shadow | `#A33417` |
| LCD green | `#9FE870` (readout text only) |

### Banned tones

Gold/brass/parchment, dark-rich luxury themes, glow gradients, purple/teal AI-gradient look, handwriting/marker fonts.

---

## Typography (self-hosted in `public/fonts/`)

| Face | Role | Weights | Fallback |
|------|------|---------|----------|
| **Familjen Grotesk** | Display and body | 400 / 600 / 700 + italic | Trebuchet MS, sans-serif |
| **Doto** | All readouts: LCD text, channel numbers | 900 | Courier New, monospace |
| **Special Elite** | Provenance card ONLY | 400 | Courier New, monospace |

Max 3 faces, used exactly as scoped above. Never load from a CDN — self-host only.

---

## Shadow Language — FLAT, HARD, OFFSET-ONLY (Critical Correction)

The biggest divergence in the current build: it uses SOFT BLURRED shadows (`box-shadow: 0 8px 24px rgba(…)`). The reference design uses **flat, hard, offset-only shadows with NO blur** — the "stacked-paper / physical button" look.

### Exact Shadow Values

| Element | box-shadow |
|---------|-----------|
| Remote | `0 8px 0 #17171A` |
| TV | `0 6px 0 #141416` |
| SURF key (resting) | `0 7px 0 #A33417` |
| SURF key (hover) | `0 9px 0 #A33417` (+ `translateY(-2px)`) |
| SURF key (active/pressed) | `0 1px 0 #A33417` (+ `translateY(5px)`) |
| Mood keys / INPUT key (resting) | `0 3px 0 #B8B4A8` |
| Mood keys (active/coral) | `0 3px 0 #A33417` |
| Mood keys / INPUT (pressed) | `0 1px 0 …` (+ `translateY(2px)`) |
| Provenance card | `0 4px 8px rgba(38,38,42,.12)` — the ONE soft shadow |

The provenance card is the only element with blur — everything else is hard-offset.

---

## Surface Specifications

### 1. Remote

- **Shape:** 240px wide, bg `#2B2B2E`, border-radius 22px, padding 16px 18px 20px
- **Layout:** column, gap 12px, items centered
- **Shadow:** `0 8px 0 #17171A` (flat, no blur)

#### IR LED
- 9px circle, centered at top of remote
- Default colour: `#4A4A50` (LED-off)
- On zap: coral blip with glow — full ceremony: `.3s steps(2) × 3` pulses; compressed: `.25s steps(2) × 2` pulses

#### LCD Readout
- bg `#1A241A`, border-radius 8px, padding 8px 10px
- Font: Doto 900, ~10px size, single line, nowrap, green `#9FE870`, ~17px line-height
- Flicker on zap: `.5s steps(3)` animation

#### SURF Key — A CIRCLE (critical change from current full-width pill)
- 116px diameter, `border-radius: 50%`
- 3px solid `#17171A` border
- Coral `#E8542F` background, off-white text
- Font: Familjen Grotesk 700, 23px, centered
- Shadow: `0 7px 0 #A33417` (flat, no blur)
- Hover: `translateY(-2px)`, shadow `0 9px 0 #A33417`
- Active/pressed: `translateY(5px)`, shadow `0 1px 0 #A33417`

#### Mood Keys — LIGHT chiclets in 3-column grid (critical change from current dark 2-col)
- Grid: `repeat(3, 1fr)`, gap 8px
- 6 keys, LIGHT background: bg `#F2F0E9`, ink text `#26262A`
- Font: Familjen Grotesk 600, ~10.5px
- Border-radius: 9px
- Shadow: `0 3px 0 #B8B4A8` (flat, no blur)
- Active state (.on): coral bg `#E8542F`, off-white text, shadow `0 3px 0 #A33417`
- Pressed: `translateY(2px)`, shadow `0 1px 0 …`
- Keycaps: USEFUL / TEACH / WASTE / BEAUTY / THINK / LUCKY
- aria-label on each = full frozen sentence

#### INPUT Key
- Full-width key below the mood grid
- Same chiclet style but full-width
- Text: "INPUT: OPEN WEB" ⇄ "INPUT: VIBECODED"
- Shadow: `0 3px 0 #B8B4A8`

### 2. Telly

- **Layout:** column, centered, flex 1
- **TV body:** width 100%, bg `#26262A`, border-radius 14px, padding 12px, shadow `0 6px 0 #141416`
- **Screen:** bg `#191916`, border-radius 6px, ~158px tall (responsive), overflow hidden

#### Snow/Static — Pixel-dot pattern (critical change from current SVG turbulence)
- `radial-gradient(rgba(242,240,233,.7) 0.6px, transparent 0.6px)`
- `background-size: 3px 3px`
- `opacity: .45`
- Animation: `fuzz .4s steps(3) infinite` (background-position jitter)

#### Tuned Overlay (critical change: OFF-WHITE, not dark)
- `position: absolute; inset: 0`
- Background: `#F2F0E9` (off-white — NOT the current dark screen)
- Fades/snaps in with `steps(2)`
- Content: "CH {n}" in Doto 20px ink `#26262A` + subtitle "somebody's hand-made site → opens in a new tab" 11px grey
- Tune-in: `.3s steps(2)` full / `.15s steps(2)` compressed

### 3. Card Slot + Provenance Card (PRINT DOWN, not slide up)

#### Slot
- Positioned below the TV stand
- `overflow: hidden`
- Height animation: `max-height: 0` → `~190px` (grows open)
- Padding: `0 14px`

#### Card
- bg `#FFFFFF`, border `2px solid #26262A`, border-radius `0 0 12px 12px`
- **Border-top: NONE** (reads as printing out of the slot above)
- Padding: `16px 20px 14px`
- Font: Special Elite
- Shadow: `0 4px 8px rgba(38,38,42,.12)` (the one soft shadow)

#### Print Animation (critical change: prints DOWN from above, not slides UP)
- `transform: translateY(-105%)` → `translateY(0)`
- First press: slow `firstprint ~1.9s cubic-bezier` (held up at -105% for 0–55% of animation, then slides down)
- Repeat press: `reprint ~1.2s` — card ducks UP to -105% midway, then returns with new data
- Card PERSISTS between presses; never auto-retracts

#### Card Content
- Heading: `HOW THIS SITE IS BUILT — CATCH № {siteId} OF {TOTAL}` where TOTAL = real corpus size from API (NOT hardcoded 288)
- Open-web body: confident fields joined by " · " (e.g. `React SPA · Netlify · Static`)
- Corner-mode body: `Built with {X} · Tier {N}`
- All-unknown fallback: "Hand-made on the open web." (never `unknown · unknown · unknown`)
- Footer: "Everyone's a builder. Learn from the sites you like."
- Stamp: "OPENS IN NEW TAB" — bordered coral, `rotate(-4deg)`

### 4. Press-Note (new element)

An italic grey line under the telly that evolves:
- 0 presses: "press SURF — zap, then the card prints"
- After 1 press: "channel and card stay up — press again whenever"
- 2+ presses: "quick blip; the card reprints with each catch"

---

## State Model — Single Clear Machine

States: `idle` → `zapping` → `tuned/hold`

| Transition | Trigger | What happens |
|-----------|---------|-------------|
| idle → zapping | SURF pressed | SURF depresses, LED blips, LCD flickers → "TUNING > CH {n}", screen shows snow. Tab opens INSTANTLY on press. |
| zapping → tuned | Ceremony ends | Screen tunes to off-white overlay with "CH {n}" + subtitle. Channel PERSISTS. Card prints (firstprint) and stays. |
| tuned → zapping | SURF pressed again (compressed) | Quick blip, card ducks (reprint animation), then returns with new catch. |

### Channel Number — Rolling TV Counter (decoupled from data)

- Start: 217
- Each surf: `next = ch + 1 + (ch % 5)`
- Wrap: when > 999 → reset to 7
- The on-screen "CH {n}" uses this rolling counter
- The provenance card's "CATCH № {n}" uses the REAL site ID from the API

### LCD Text Rules

| Condition | LCD displays |
|-----------|-------------|
| Zapping | `TUNING > CH {n}` — channel number set BEFORE entering zapping state (never null, never "TUNING...") |
| Mood selected (not zapping) | That mood's full frozen label |
| Idle, no mood | `CH {n} - OPEN WEB` or `CH {n} - VIBECODED` |
| No match | `NOTHING IN THAT CORNER RIGHT NOW` |

### Ceremony Timing

| Phase | Full (first press) | Compressed (subsequent) |
|-------|-------------------|------------------------|
| Total | ~2100ms | ~1300ms |
| LED blips | 3 × .3s | 2 × .25s |
| Static duration | ~800ms | ~400ms |
| Tune-in snap | .3s steps(2) | .15s steps(2) |
| Card print | ~1.9s (held then slides) | ~1.2s (duck then return) |

---

## Layout & Responsiveness

- **Desktop:** Scene uses `align-items: flex-end` (not flex-start). Remote (left, 240px border-box) beside Telly (right, flex 1).
- **Phone (≤768px / ≤430px):** stacks cleanly, no horizontal scroll. All hit targets ≥44px.
- Filter chips currently 36px — MUST be raised to ≥44px.
- No fake OS chrome anywhere.

---

## Status States

| State | Telly | Page line |
|-------|-------|-----------|
| Exhausted | Snow with `NO SIGNAL` | "You've wandered the whole neighbourhood." + working Reset (restores first-press ceremony) |
| No match | LCD reads `NOTHING IN THAT CORNER RIGHT NOW` | "Loosen a filter and try again." |
| Failed load | — | "That one got away." + surf again |

Tone stays light — a miss is part of the wander, never a red error box.

---

## Hero

Headline: **"Every catch prints a card worth keeping."** (replaces current "One press. One real site. New tab, across the room.")

---

## /ouroboros

Same design language. Dot-matrix ouroboros glyph: ring of square pixels in Doto aesthetic, snake-game style, head advancing one pixel step at a time in a slow loop, coral on cream. Card prints `CATCH № 288 OF 288 — the loop closes.` Under `prefers-reduced-motion`: static ring.

---

## Implementation Constraints

- Reskin + interaction layer ONLY. Zero behaviour/API/routing/data/DDL changes.
- All 115 existing tests MUST still pass.
- CSS-only animation (keyframes, transitions, `steps()`) — no animation libraries.
- Fonts stay self-hosted in `public/fonts/`. Never CDN.
- `prefers-reduced-motion: reduce` — show all end states statically (tuned overlay visible, card at translateY(0), slot open, no snow/blip/flicker).
