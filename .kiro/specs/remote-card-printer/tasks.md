# Tasks: Remote + Card Printer — Corrective Visual Pass

## Overview

Each task is a single, independently-verifiable change. Run tasks in order. After each task: visual check in browser, then `npm run test` — all 115 must pass.

---

## Tasks

- [x] 1. Shadow language: replace all soft shadows with flat hard offsets
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.remote` box-shadow → `0 8px 0 #17171A` (remove blur + inset)
    - `.telly` box-shadow → `0 6px 0 #141416` (remove blur + inset border)
    - `.surf-key` box-shadow → `0 7px 0 #A33417` (remove blur)
    - `.surf-key:hover` → `translateY(-2px)` + `0 9px 0 #A33417`
    - `.surf-key:active/.surf-key--pressed` → `translateY(5px)` + `0 1px 0 #A33417`
    - `.mood-key` box-shadow → `0 3px 0 #B8B4A8`
    - `.mood-key--active` box-shadow → `0 3px 0 #A33417`
    - `.input-key` box-shadow → `0 3px 0 #B8B4A8`
    - `.prov-card` box-shadow → `0 4px 8px rgba(38,38,42,.12)` (the one soft shadow)
  - **Done when:** DevTools shows zero `blur-radius` on any box-shadow except `.prov-card`. Remote, TV, and buttons appear "stacked" with hard edges.
  - _Requirements: 1.1–1.8_

- [x] 2. SURF key: pill → circle
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.surf-key`: remove `width: 100%`, add `width: 116px; height: 116px; border-radius: 50%; border: 3px solid #17171A; font-size: 23px; padding: 0; display: flex; align-items: center; justify-content: center`
    - Remove `min-height: 52px`, `letter-spacing`
  - **Done when:** SURF button is a visible circle in the center of the remote, text centered, looks like a channel-change button.
  - _Requirements: 2.1–2.7_

- [x] 3. Mood keys: dark 2-col → light 3-col chiclets
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.mood-keys`: `grid-template-columns: repeat(3, 1fr); gap: 8px`
    - `.mood-key`: `background: #F2F0E9; color: #26262A; border-radius: 9px; font-size: 10.5px; box-shadow: 0 3px 0 #B8B4A8`
    - `.mood-key:hover`: `background: #E8E6DF; color: #26262A`
    - `.mood-key--active`: keep coral bg/white text, shadow `0 3px 0 #A33417`
    - ADD `.mood-key:active` press state: `translateY(2px); box-shadow: 0 1px 0 …`
  - **Done when:** 6 mood keys appear as 3×2 grid of light cream chiclets with hard shadow. Active key is coral. Keys depress on click.
  - _Requirements: 3.1–3.8_

- [x] 4. INPUT key: match chiclet style
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.input-key`: `background: #F2F0E9; color: #26262A; border: none; border-radius: 9px; font-size: 10.5px; box-shadow: 0 3px 0 #B8B4A8`
    - `.input-key--active`: `background: var(--coral); color: #fff; box-shadow: 0 3px 0 #A33417`
    - `.input-key:hover`: `background: #E8E6DF`
    - ADD press state with translateY(2px)
  - **Done when:** INPUT key matches the mood key aesthetic — light cream default, coral when active, hard shadow.
  - _Requirements: 4 (part of Requirement 4 remote dimensions)_

- [x] 5. Remote dimensions and layout fine-tuning
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.remote`: `border-radius: 22px; padding: 16px 18px 20px; gap: 12px`
    - `.ir-led`: `width: 9px; height: 9px; background: #4A4A50` (LED-off colour)
    - `.lcd`: `border-radius: 8px; padding: 8px 10px;` remove border, remove min-height/centering
    - `.lcd__text`: `font-size: 10px; line-height: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
    - LCD flicker duration: `.5s steps(3)`
  - **Done when:** Remote proportions match reference — tighter padding, visible LED-off dot, compact LCD readout.
  - _Requirements: 4.1–4.5, 5.1–5.4, 6.1–6.4_

- [x] 6. Telly: TV body and screen corrections
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.telly`: `background: #26262A; border-radius: 14px; box-shadow: 0 6px 0 #141416` (remove inset border)
    - `.telly__screen`: `border-radius: 6px; min-height: 158px`
    - Remove `.telly__screen--idle::after` scanline pseudo-element
    - `.telly__no-signal`: remove text-shadow glow
  - **Done when:** TV is a flat dark slab with hard shadow sitting on the page. No scanlines in idle. No glow on NO SIGNAL text.
  - _Requirements: 7.1–7.4_

- [x] 7. Add the TV stand element
  - **Files:** `src/client/surfdeck.css`, `src/client/App.tsx` (or `src/client/components/Telly.tsx`)
  - **Changes:**
    - Add `.telly__stand` CSS: `width: 55%; height: 10px; background: #141416; border-radius: 0 0 8px 8px; margin: 0 auto;`
    - Add `<div className="telly__stand" aria-hidden="true" />` inside the telly-container, between the `.telly` div and `<CardSlot>`
  - **Done when:** A short dark foot sits directly under the telly, above the card slot. It is horizontally centered and narrower than the TV.
  - _Requirements: 7.5_

- [x] 8. Snow/static: SVG turbulence → pixel-dot radial gradient
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - Replace the `.telly__screen--static/--static-fast/--exhausted` background declarations:
      - Remove SVG feTurbulence data-URI and repeating-linear-gradient scanlines
      - New: `background-image: radial-gradient(rgba(242,240,233,.7) 0.6px, transparent 0.6px); background-size: 3px 3px; opacity: .45`
    - Replace `@keyframes static-noise` with `@keyframes fuzz` (background-position jitter: 0,0 → -1px,1px → 1px,-1px → 0,0)
    - Animation: `fuzz .4s steps(3) infinite`
  - **Done when:** Static looks like tiny dot-matrix fuzz (not smooth noise). Dots are visible at 3px spacing.
  - _Requirements: 8.1–8.6_

- [x] 9. Tuned state: dark screen → off-white overlay
  - **Files:** `src/client/surfdeck.css`, `src/client/components/Telly.tsx`
  - **CSS changes:**
    - `.telly__screen--tuned`: `background: #F2F0E9` (off-white)
    - `.telly__channel`: `font-size: 20px; color: #26262A` (ink on off-white)
    - `.telly__subtitle`: `font-size: 11px; color: var(--body-grey)`
    - ADD tune-in animation: `@keyframes tune-in { 0% { opacity: 0 } 100% { opacity: 1 } }` applied `.3s steps(2)`
    - ADD `.telly__screen--tuned-fast` variant with `.15s steps(2)`
  - **TSX changes (Telly.tsx):**
    - When zapState=tuned, apply `telly__screen--tuned` or `telly__screen--tuned-fast` based on `isFirstSurf`
  - **Done when:** After a surf, the screen goes off-white with dark ink "CH {n}" text — NOT white text on dark. The transition snaps in with a CRT feel.
  - _Requirements: 9.1–9.5_

- [x] 10. Card slot: slide-up → print-down animation
  - **Files:** `src/client/surfdeck.css`, `src/client/components/CardSlot.tsx`
  - **CSS changes:**
    - Replace card-slot animation: inner starts at `translateY(-105%)`, animates to `translateY(0)` via `@keyframes firstprint` (1.9s, held 0–55% then drops) and `@keyframes reprint` (1.2s, ducks to -105% then returns)
    - Slot uses `max-height: 0 → 190px` to reveal, `overflow: hidden`, `padding: 0 14px`
  - **TSX changes (CardSlot.tsx):**
    - Replace `ducking` prop with `reprint` prop (boolean)
    - Map: no card → no class; first print → `card-slot--visible`; reprint → `card-slot--reprint`
  - **App.tsx** state wiring:
    - Replace `cardDucking` with `isReprint` boolean
    - On subsequent surfs (card already visible): set `isReprint = true` then after animation completes set back to visible
  - **Done when:** Card prints DOWN from the slot (appears from above, not below). Repeat press makes card duck up then return. Card stays visible between presses.
  - _Requirements: 10.1–10.7_

- [x] 11. Provenance card border and styling
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.prov-card`: `border: 2px solid #26262A; border-top: none; border-radius: 0 0 12px 12px; padding: 16px 20px 14px`
    - `.prov-card__stamp`: `transform: rotate(-4deg); border: 1.5px solid var(--coral); padding: 2px 6px; border-radius: 3px` — remove loose `opacity: 0.8`
  - **Done when:** Card has a heavy ink border (no top border — looks like it came out of the slot), receipt-like. Stamp is bordered coral badge rotated -4deg.
  - _Requirements: 11.1–11.5_

- [x] 12. Card heading: hardcoded 288 → correct corpus total
  - **Files:** `src/client/components/ProvenanceCard.tsx`, `src/worker/routes/ouroboros.ts`
  - **Changes:**
    - ProvenanceCard.tsx: add `const CORPUS_TOTAL = 349;` with comment `// Update when CSV changes`
    - Change heading render: `CATCH №\u00A0{site.id} OF {CORPUS_TOTAL}`
    - ouroboros.ts: update inline HTML from "288 OF 288" to "349 OF 349"
  - **Done when:** Card shows "CATCH № 42 OF 349" (correct total). Ouroboros page shows "349 OF 349".
  - _Requirements: 11.6_

- [x] 13. Rolling channel counter (decouple from site ID)
  - **Files:** `src/client/App.tsx`
  - **Changes:**
    - Add state: `const [channelCounter, setChannelCounter] = useState(217)`
    - On each surf (in handleSurf, BEFORE setZapState): compute next = `channelCounter + 1 + (channelCounter % 5)`; if >999 reset to 7; call `setChannelCounter(next)`
    - Pass `channelCounter` (not `lastSurfResult.id`) to Telly as `channelNumber` and to LCD text
    - Keep passing `site.id` to ProvenanceCard (unchanged)
  - **Done when:** On-screen "CH 218", "CH 222", "CH 227"… rolls unpredictably. Card still shows real site ID.
  - _Requirements: 12.1–12.6_

- [x] 14. LCD text rules: fix dead-code "TUNING..." and add channel to idle
  - **Files:** `src/client/App.tsx`
  - **Changes:**
    - LCD during zapping: always `TUNING > CH ${channelCounter}` (channel was set in prior step — never null now)
    - Remove the `channelNumber !== null ? … : "TUNING..."` conditional
    - LCD idle (no mood, not zapping): `CH ${channelCounter} - ${cornerMode ? 'VIBECODED' : 'OPEN WEB'}`
    - Before first surf (pressCount === 0): show just `OPEN WEB` or `VIBECODED` (no channel yet)
  - **Done when:** LCD always shows a channel number during/after first surf. Never shows "TUNING…". Idle state shows "CH 218 - OPEN WEB".
  - _Requirements: 18.1–18.4_

- [x] 15. Press-note element (new)
  - **Files:** `src/client/App.tsx`, `src/client/surfdeck.css`
  - **Changes:**
    - Add `pressCount` state to App.tsx (increment in handleSurf)
    - Render `<p className="press-note">…</p>` below the telly-container in the scene
    - Text: 0 presses → "press SURF — zap, then the card prints"; 1 → "channel and card stay up — press again whenever"; 2+ → "quick blip; the card reprints with each catch"
    - CSS: `.press-note { font-style: italic; color: #8A867A; font-size: 12px; text-align: center; margin-top: 8px; }`
  - **Done when:** Italic grey text appears under the telly that changes message after each surf press.
  - _Requirements: 13.1–13.5_

- [x] 16. Hero headline copy update
  - **Files:** `src/client/App.tsx`
  - **Changes:**
    - `.hero__headline` text: "Every catch prints a card worth keeping."
  - **Done when:** Hero reads the new headline. Old copy gone.
  - _Requirements: 14.1_

- [x] 17. Scene layout: align-items flex-end
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.scene`: `align-items: flex-end` (replace `flex-start`)
  - **Done when:** Remote and telly are bottom-aligned (grounded on same baseline) on desktop.
  - _Requirements: 15.1_

- [x] 18. Filter chip touch targets: 36px → 44px
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - `.chip`: `min-height: 44px`
  - **Done when:** All filter chips pass 44px minimum height (inspect in DevTools).
  - _Requirements: 16.1–16.2_

- [x] 19. CSS variable additions and font fallback correction
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - Add `--led-off: #4A4A50; --tv-body: #26262A;` to `:root`
    - Change `--font-body` fallback: `'Familjen Grotesk', 'Trebuchet MS', sans-serif`
    - Change `--font-lcd` and `--font-card` fallbacks to use `'Courier New', monospace` (drop Lucida Console)
  - **Done when:** CSS variables section has the two new tokens. Font stacks use Trebuchet MS / Courier New as fallbacks.
  - _Requirements: (design-direction typography section)_

- [x] 20. Reduced motion: update for new animations
  - **Files:** `src/client/surfdeck.css`
  - **Changes:**
    - Under `@media (prefers-reduced-motion: reduce)`:
      - Card slot: `max-height: 190px` immediately, inner at `translateY(0)` immediately, `animation: none`
      - Tuned overlay: visible immediately (`opacity: 1, animation: none`)
      - Snow fuzz: `animation: none; opacity: 0` (completely hidden)
      - SURF key pressed: colour change only, no translateY
  - **Done when:** With `prefers-reduced-motion` emulated in DevTools: channel appears instantly, card is visible, no flicker.
  - _Requirements: 17.1–17.5_

- [x] 21. Ouroboros page: apply corrected visual values
  - **Files:** `src/worker/routes/ouroboros.ts`
  - **Changes:**
    - TV inline CSS: shadow → `0 6px 0 #141416` (flat)
    - Card inline CSS: `border: 2px solid #26262A; border-top: none; border-radius: 0 0 12px 12px`
    - Tuned background → `#F2F0E9`
    - Channel text → ink `#26262A` on off-white
    - Stamp → `rotate(-4deg)`, bordered coral
    - Update "288" → "349" in card copy
  - **Done when:** `/ouroboros` page uses flat shadows, off-white tuned screen, ink text, correct total. Matches SPA card aesthetic.
  - _Requirements: (design-direction /ouroboros section)_

- [x] 22. Final verification: run all tests
  - **Command:** `npm run test`
  - **Done when:** All 115 tests pass. Zero failures, zero modifications to test files.
  - _Requirements: 19.1–19.6_

- [x] 23. Visual verification: screenshot at both breakpoints
  - **Check at 1440×900** (desktop): remote left, telly right, aligned flex-end, hard shadows, circle SURF, light chiclets, off-white tuned screen, card printing down.
  - **Check at 390×844** (phone): stacked cleanly, no horizontal scroll, all targets ≥44px.
  - **Done when:** Screenshots saved, visual matches reference design.
