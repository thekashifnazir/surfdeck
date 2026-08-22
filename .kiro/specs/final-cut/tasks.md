# Tasks: Cycle 7 — "Final Cut"

> **STATUS: APPROVALS INCORPORATED — AWAITING FINAL SKIM, DO NOT IMPLEMENT YET.**
> Reviews 1–10 are folded into `requirements.md` and `design.md`: all copy (chip
> glosses, recipe fragments, tool map + tier-keyed lead lines, press-notes, meta
> description) is approved verbatim; all hrefs are fixed; the viewport breakpoint
> is 480px; and the build-time stats are counted fresh in the last task
> (process-log = highest entry number, rendered `{n}+` — "82+" at ship after the
> Cycle 7 entry №82 is written). No task has been started.

## Overview

Tasks are sequenced so copy/CSS-only changes land first, pure tested modules
next, then UI surfaces, and the `/ouroboros` rebuild last. Each task is small and
individually verifiable: `npm run test` + `tsc --noEmit` + a visual check after
each. No new dependencies; ceremony timing, palette, and fonts stay untouched;
mobile 390px keeps no horizontal scroll.

---

## Phase A — Copy sweep (copy/CSS only, lowest risk)

- [x] 1. Hero tagline + press-note strings
  - **Files:** `src/client/App.tsx`
  - **Changes:** `.hero__headline` → "Somebody made this. See how."; replace the
    three press-note strings with the approved rotation (design §6.2).
  - **Done when:** hero and press-notes read as approved; existing tests pass.
  - _Requirements: 6.1, 6.2_

- [x] 2. Telly idle line
  - **Files:** `src/client/components/Telly.tsx`
  - **Changes:** `.telly__subtitle` idle copy → "press SURF — somebody's hand-made
    site tunes in right here".
  - **Done when:** idle telly shows the new line; embed/fallback states unchanged.
  - _Requirements: 6.4_

- [x] 3. `index.html` title + meta + OG
  - **Files:** `index.html`
  - **Changes:** `<title>` → "Surfdeck — somebody made this. see how."; add meta
    description and `og:title`/`og:description` (design §6.3, copy approved).
  - **Done when:** tags present; page still boots.
  - _Requirements: 6.5_

- [x] 4. LCD filter summary humanising + tests
  - **Files:** `src/client/lcd-text.ts`, `src/client/lcd-text.test.ts`
  - **Changes:** resolve display labels (character/stack/host/type) before
    uppercasing so `modern_indie` → "MODERN INDIE"; keep "TIER {n}" and the "+N"
    overflow. Add tests for humanised single + multi cases.
  - **Done when:** LCD shows humanised labels; new + existing tests pass.
  - _Requirements: 6.3, 9.3_

---

## Phase B — Pure lookup modules + data-hygiene tests (no UI yet)

- [x] 5. Gloss map module (+ recipe fragments) + tests
  - **Files:** new `src/client/gloss-map.ts`, `src/client/gloss-map.test.ts`
  - **Changes:** export `GROUP_GLOSS`, `CHIP_GLOSS`, `RECIPE_FRAGMENTS` (design
    §1.4, §2.4) with approved copy. Tests: every corpus stack/host/character/type
    value + all four tiers has a `CHIP_GLOSS`; group glosses verbatim.
  - **Done when:** module compiles; coverage test passes.
  - _Requirements: 1.3, 1.4, 1.5, 2.6_

- [x] 6. Provenance URL map + tests
  - **Files:** new `src/client/provenance-urls.ts`, `.test.ts`
  - **Changes:** `PROVENANCE_URLS` + `getProvenanceUrl` (design §2.3, approved
    URLs). Tests: all 11 corpus stacks + 6 hosts resolve; unknown → null.
  - **Done when:** tests pass.
  - _Requirements: 2.3, 2.5_

- [x] 7. Tool map + tests
  - **Files:** new `src/client/tool-map.ts`, `.test.ts`
  - **Changes:** `TOOL_MAP` + `getToolInfo` for the 8 real `built_with` values
    (design §3.1, approved cues/URLs). Tests: all 8 resolve; unknown → null.
  - **Done when:** tests pass.
  - _Requirements: 3.5, 3.6_

- [x] 8. Embed-viewport pure function + tests
  - **Files:** new `src/client/embed-viewport.ts`, `.test.ts`
  - **Changes:** `computeEmbedViewport(screenW, screenH)` (design §8.1). Tests:
    scaled width === screenW; scaled height === screenH; virtualWidth 1280 at
    desktop, 980 below the approved breakpoint.
  - **Done when:** tests pass; no DOM used.
  - _Requirements: 8.3, 8.4_

- [x] 9. Validator stack-enum tests (records Req 7)
  - **Files:** `scripts/rules.test.ts` (or new `scripts/lib/validate-csv.test.ts`)
  - **Changes:** assert the existing check #8 rejects `stack = modern_indie`,
    accepts blank, accepts `nextjs`. Add a comment recording "investigated — no
    data change needed" per design §7. No CSV edit.
  - **Done when:** tests pass; `npx tsx scripts/validate-seed.ts` still exits 0.
  - _Requirements: 7.1–7.4, 9.3_

---

## Phase C — TUNING menu v2 (`TellyMenu.tsx` + CSS)

- [x] 10. OSD backdrop, labels, header subtitle
  - **Files:** `src/client/components/TellyMenu.tsx`, `src/client/surfdeck.css`
  - **Changes:** `.osd` bg → solid `#101210`; `.filters__label` opacity → 0.85;
    add centred italic subtitle under `— TUNING —`.
  - **Done when:** OSD is opaque; subtitle shows; chips/behaviour unchanged.
  - _Requirements: 1.1, 1.2, 1.7, 1.8_

- [x] 11. Group glosses under each label
  - **Files:** `TellyMenu.tsx`, `surfdeck.css`
  - **Changes:** render `GROUP_GLOSS[...]` as a small muted green line under each
    group label (CHARACTER/STACK/HOSTED ON/TYPE/TIER).
  - **Done when:** each group shows its verbatim gloss.
  - _Requirements: 1.3_

- [x] 12. Info strip (idle + hover/focus)
  - **Files:** `TellyMenu.tsx`, `surfdeck.css`
  - **Changes:** reserved bottom line, fixed min-height; idle text; on chip
    hover/focus show "**{label}** — {CHIP_GLOSS[value]}"; clear on leave/blur.
  - **Done when:** hovering a chip updates the strip; no layout shift; keyboard
    focus works.
  - _Requirements: 1.4, 1.10_

- [x] 13. BUILD DIALS collapse
  - **Files:** `TellyMenu.tsx`, `surfdeck.css`
  - **Changes:** wrap STACK+HOSTED ON+TYPE in a collapsible section behind a
    dashed toggle "BUILD DIALS — filter by what it's built with (for the curious)",
    collapsed by default, ▾/▸ chevron + state indicator; CHARACTER stays above;
    TIER separate. Respect reduced motion.
  - **Done when:** dials collapsed by default, toggle expands/collapses; corner
    mode (TIER) unaffected.
  - _Requirements: 1.6_

- [x] 14. TellyMenu tests
  - **Files:** `src/client/components/TellyMenu.test.ts`
  - **Changes:** group glosses render; info strip idle + hover text; BUILD DIALS
    collapsed by default and toggles; existing filter-logic assertions intact.
  - **Done when:** new + existing tests pass; `tsc --noEmit` clean.
  - _Requirements: 1.x, 9.2, 9.3_

---

## Phase D — Provenance card v2 (`ProvenanceCard.tsx` + CSS)

- [x] 15. Single-column layout + contrast
  - **Files:** `ProvenanceCard.tsx`, `surfdeck.css`
  - **Changes:** collapse the two-column grid to the comp's single-column flow
    (design §2.0); heading/footer colour → `--body-grey` or darker (verify AA).
  - **Done when:** card matches comp order; contrast passes; mobile + landscape
    have no horizontal scroll.
  - _Requirements: 2.1, 2.12_

- [x] 16. Mode-dependent heading
  - **Files:** `ProvenanceCard.tsx`
  - **Changes:** open-web "CATCH № {id} · ONE OF {corpusTotal} HAND-PICKED SITES";
    corner "CATCH № {id} · VIBECODED CORNER".
  - **Done when:** heading switches by mode.
  - _Requirements: 2.2_

- [x] 17. Linked tech line (open-web) via URL map
  - **Files:** `ProvenanceCard.tsx`, `surfdeck.css`
  - **Changes:** stack + host labels → `.prov-link` dotted-coral anchors
    (`target="_blank" rel="noopener noreferrer"`) when `getProvenanceUrl` returns
    a URL; type stays plain; unknown → plain text.
  - **Done when:** stack/host link out; type is plain; no broken links.
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 18. Recipe line (open-web) via fragments
  - **Files:** `ProvenanceCard.tsx`, `surfdeck.css`
  - **Changes:** under the tech line, render "the recipe: {stackFragment} —
    {hostFragment}" from `RECIPE_FRAGMENTS` (present fragments only; omit if none).
  - **Done when:** e.g. static_html + github_pages → "the recipe: written by hand,
    no tools — hosted free from a code repo".
  - _Requirements: 2.6_

- [x] 19. Corner tier line + divider/footer rules
  - **Files:** `ProvenanceCard.tsx`, `surfdeck.css`
  - **Changes:** corner tech line "Built with {Tool link} · Tier {N} —
    {tier label lowercased}" via `getTierLabel`; open-web adds dashed divider +
    footer "Everyone's a builder. Learn from this one — tap the underlined parts."
    ("Learn from this one" dotted-underlined); corner mode omits the footer.
  - **Done when:** corner shows number+label; open-web shows divider+new footer;
    corner hides the generic footer.
  - _Requirements: 2.7, 2.8, 2.9_

- [x] 20. MAKE ONE YOURSELF block (corner + open-web) via tool/URL maps
  - **Files:** `ProvenanceCard.tsx`, `surfdeck.css`, `tool-map.ts` (task 7),
    `provenance-urls.ts` (task 6)
  - **Changes (corner):** in corner mode with a mapped `built_with`, render the
    dashed-coral box: label, "This site was described into existence. Try {Tool} →"
    (bold link to tool URL), and the italic dot-separated time cue. Omit if
    unmapped. (Unchanged from prior scope.)
  - **Changes (open-web — text-authoritative addition, design §3.3):** in open-web
    mode render the SAME `.make-one` box (reuse markup/styling exactly) with the
    label and:
    - stack present → "This site was hand-built with {Stack}. Start yours →"
      ({Stack} = `getProvenanceLabel`, "Start yours →" a bold `.prov-link` to
      `getProvenanceUrl(stack)`, new tab, `rel="noopener noreferrer"`);
    - stack blank → "This site was made by a person, not a platform. Start yours →"
      ("Start yours →" links `https://neocities.org`);
    - fixed italic-grey time-cue "a text editor and a free host is all it takes".
    The open-web box ALWAYS renders (blank-stack path covers stackless sites).
  - **Done when:** corner cards show the tier-keyed block per comp (unmapped tools
    omit it); open-web cards always show the stack-keyed block with the blank-stack
    fallback; both use the identical dashed-coral pattern.
  - _Requirements: 3.1–3.12_

- [x] 21. ProvenanceCard tests
  - **Files:** `src/client/components/ProvenanceCard.test.ts`
  - **Changes:** heading by mode; stack/host anchors present + type plain; recipe
    line; corner "Tier N — label"; open-web footer copy + corner omission; all-blank
    fallback + no-"unknown" preserved. MAKE ONE YOURSELF block:
    - corner: tier-keyed block present when `built_with` mapped, omitted when unmapped;
    - open-web: block renders in BOTH the stack-present path (line names {Stack},
      "Start yours →" links the stack's URL) AND the blank-stack fallback (line reads
      "made by a person, not a platform.", link → `https://neocities.org`);
    - fixed open-web time-cue "a text editor and a free host is all it takes" present.
  - **Done when:** new + existing tests pass; `tsc --noEmit` clean; 390px unchanged.
  - _Requirements: 2.x, 3.x, 9.2, 9.3, 9.6_

---

## Phase E — Footer on every page

- [ ] 22. Footer React component + wire into App
  - **Files:** new `src/client/components/Footer.tsx`, `src/client/App.tsx`,
    `src/client/surfdeck.css`
  - **Changes:** build the footer (design §5.1): coral top rule; id block; five
    space-separated dotted-coral uppercase links (no `·`); base row with © line +
    Doto tagline. "HOW THIS WAS MADE" → `/ouroboros`; other hrefs approved.
    Responsive stacking ≤430px, 44px hit targets.
  - **Done when:** footer renders on the SPA, matches comp, no 390px scroll.
  - _Requirements: 5.1–5.6_

- [ ] 23. Footer tests
  - **Files:** new `src/client/components/Footer.test.ts`
  - **Changes:** links present in order with correct hrefs; © + Doto tagline
    render; "HOW THIS WAS MADE" points to `/ouroboros`.
  - **Done when:** tests pass.
  - _Requirements: 5.4, 5.5, 9.3_

---

## Phase F — Embedded-site virtual viewport (`Telly.tsx`)

- [ ] 24. Apply virtual viewport to the embedded iframe
  - **Files:** `src/client/components/Telly.tsx`, `src/client/surfdeck.css`
  - **Changes:** `ResizeObserver` on `.telly__screen` (read-only) → state; inline
    `width/height/transform:scale/transform-origin:0 0` on the existing iframe from
    `computeEmbedViewport` (task 8). Do NOT change `src`/`sandbox`/`referrerPolicy`/
    `onLoad`/load-failure/fallback/pop-out; do not remount the iframe. Keep
    `.telly__screen { overflow: hidden }`.
  - **Done when:** embedded sites show desktop layout scaled to fit; scrolling +
    clicks work through the transform; no reload on resize; reduced-motion + mobile
    unchanged.
  - _Requirements: 8.1, 8.2, 8.5, 8.6, 8.7, 8.8, 8.9_

- [ ] 25. Telly viewport tests
  - **Files:** `src/client/Telly.embed.test.ts`
  - **Changes:** iframe receives width/height/transform derived from the pure
    function for a given screen size; iframe is not remounted when the size changes
    (same element, style-only update); sandbox/referrerpolicy unchanged.
  - **Done when:** new + existing embed tests pass.
  - _Requirements: 8.4, 8.5, 9.3_

---

## Phase G — `/ouroboros` "Dead Air" rebuild (LAST)

- [ ] 26. Build-time colophon constants
  - **Files:** new generated `src/worker/colophon-stats.ts` (+ a small
    build/generate step), `src/worker/routes/ouroboros.ts`
  - **Prerequisite:** write the Cycle 7 process-log entry (№82) in
    `docs/kiro-process.md` BEFORE running this task, so the fresh count reflects it.
  - **Changes:** compute fresh: `SPEC_COUNT` (dirs in `.kiro/specs/`, incl.
    `final-cut` → 7), `HOOK_COUNT` (2), `TEST_COUNT` (fresh vitest total after this
    cycle), `LOG_COUNT` (**highest entry number** in `docs/kiro-process.md`, №82 at
    ship — not a heading count) per design §4.4; export as constants consumed by
    the route. THE Dead Air stat card SHALL render `LOG_COUNT` in the comp's `{n}+`
    format — i.e. "82+ process-log entries", not a bare number.
  - **Done when:** constants resolve at build; route imports them (no scattered
    literals).
  - _Requirements: 4.9_

- [ ] 27. Dead Air shell: header, telly, colour-bar, ouroboros ring
  - **Files:** `src/worker/routes/ouroboros.ts`
  - **Changes:** rebuild body/styles (keep `@font-face` + tokens): "The loop
    closes." + intro; telly with colour-bar strip; SVG segmented ouroboros ring in
    LCD-green on `#191916`, slow spin, static under `prefers-reduced-motion`;
    "— DEAD AIR —" + "you've tuned into the set itself. press SURF to get back out
    there."
  - **Done when:** page renders the Dead Air telly per comp; reduced-motion static.
  - _Requirements: 4.1–4.5, 9.7_

- [ ] 28. Self-portrait stat card
  - **Files:** `src/worker/routes/ouroboros.ts`
  - **Changes:** white card + coral "SELF-PORTRAIT" badge; "Surfdeck"; "CATCH №
    349 · THE ONE THAT CAUGHT ITSELF"; stats row from task 26 constants (render
    `LOG_COUNT` as `{n}+`, e.g. "82+ process-log entries"); stack line; "Read the
    repo · read the build log" links (approved hrefs).
  - **Done when:** stat card matches comp; numbers come from constants;
    process-log entry shows the `{n}+` form.
  - _Requirements: 4.6_

- [ ] 29. The ladder
  - **Files:** `src/worker/routes/ouroboros.ts`
  - **Changes:** "— THE LADDER —" + subtitle; a BY HAND rung 0 ABOVE Tier 1
    (text-authoritative addition, design §4.3): marker "BY HAND" in the same slot
    the comped rungs use for "TIER {N}", title "No tools at all", description
    "a text editor, one HTML file, a free host — the original way", "start here →"
    → `https://neocities.org`, no badge — reusing the comped rung markup exactly.
    THEN four comped rungs with comp titles/descriptions (design §4.3),
    "start here →" links to representative tools (approved hrefs); Tier 4 coral
    border + "SURFDECK'S RUNG" badge.
  - **Done when:** ladder shows five rungs (BY HAND above Tier 1–4); the four TIER
    rungs match the comp exactly; the BY HAND rung reuses the same rung pattern.
  - _Requirements: 4.7_

- [ ] 30. Footer on `/ouroboros` + route tests
  - **Files:** `src/worker/routes/ouroboros.ts`, `src/worker/routes/ouroboros.test.ts`
  - **Changes:** inline the footer markup/styles (mirror of `Footer.tsx`, design
    §5.2); extend tests for Dead Air copy, ladder rungs, stat-card numbers, and
    footer links. Keep existing colophon/link assertions green.
  - **Done when:** `/ouroboros` shows the footer; route tests pass; `tsc --noEmit`
    clean.
  - _Requirements: 4.8, 5.1, 9.3_

---

## Verification Checklist (run after the final task)

- [ ] `tsc --noEmit` — zero errors
- [ ] `npm run test` — all existing tests green + new coverage (gloss/URL/tool
      maps, recipe fragments, viewport fn, validator rule, footer, card, OSD)
- [ ] TUNING OSD: opaque backdrop, group glosses, info strip, BUILD DIALS collapsed
      by default; active/inactive chip styles per comp
- [ ] Card: mode-dependent heading, stack/host links, recipe line, corner "Tier N —
      label", open-web divider+footer; MAKE ONE YOURSELF block in BOTH modes
      (corner tier-keyed; open-web stack-keyed + blank-stack neocities fallback)
- [ ] Footer on both the SPA and `/ouroboros`; links + Doto tagline correct
- [ ] `/ouroboros`: Dead Air telly (green ring, colour bars), self-portrait numbers
      from build constants, ladder = BY HAND rung above the four comped rungs
- [ ] Embedded sites render desktop layout scaled to fit; scroll/click work; no
      reload on resize
- [ ] Ceremony timing, palette, fonts unchanged; fonts still self-hosted
- [ ] Mobile 390px: no horizontal scroll on any surface
- [ ] `prefers-reduced-motion`: ring static, no colour-bar motion, OSD/card end
      states shown statically
