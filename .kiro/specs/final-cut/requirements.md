# Requirements: Cycle 7 — "Final Cut" (clarity, colophon, and sign-off)

## Introduction

The final polish pass before sign-off. It makes the TUNING menu legible to
first-time visitors, turns the provenance card into a set of learnable links,
adds a "make one yourself" invitation to the corner cards, rebuilds `/ouroboros`
as the "Dead Air" colophon and self-portrait, adds a personal footer to every
page, sweeps the surface copy so the product's voice is consistent, records a
data-hygiene investigation, and renders embedded sites at a virtual desktop
viewport so they show their real layout in miniature.

The Remote + Card Printer metaphor, palette, fonts, and ceremony timing are
untouched. This is a reskin + interaction + copy + data-hygiene pass — no engine,
routing, or API-contract changes beyond what each requirement states.

> **THE COMPS ARE THE AUTHORITY.** Approved comps were supplied for the TUNING
> menu v2, the provenance card v2 (open-web + corner), the `/ouroboros` "Dead
> Air" page, the ladder, the corner-card MAKE ONE YOURSELF block, and the footer.
> This document is written to those images. Where the earlier prose and an image
> disagreed, the **image won** and the resolution is recorded in
> **§ Resolved Against Comps**. Copy quoted below is transcribed from the comps.

---

## Glossary

- **OSD / TUNING menu:** The on-screen display overlaid inside the telly screen,
  toggled by the remote's MENU key. Already exists (`TellyMenu.tsx`); this cycle
  reskins and augments it.
- **Group label:** The heading above each filter group in the OSD (CHARACTER,
  STACK, HOSTED ON, TYPE, TIER).
- **Group gloss:** A short plain-English line under a group label.
- **Chip gloss:** The plain-English explanation for one chip, shown in the info
  strip when that chip is hovered/focused.
- **Info strip:** One reserved line at the OSD bottom showing the hovered/focused
  chip's gloss (or idle text).
- **BUILD DIALS:** The collapsible section hiding STACK + HOSTED ON + TYPE behind
  one toggle.
- **Recipe line:** A plain-English sentence under the open-web card's tech line,
  composed from per-value recipe fragments.
- **MAKE ONE YOURSELF block:** A dashed-coral invitation printed on corner cards.
- **Dead Air:** The rebuilt `/ouroboros` page — the app's colophon + self-portrait.
- **The ladder:** A four-rung "how it was built" ladder on `/ouroboros`.
- **Virtual viewport:** A larger CSS width the embedded iframe is laid out at,
  then scaled down to fit the telly screen.
- **Build-time constant:** A number computed from the repo at build time and
  baked into the bundle (not fetched at runtime).

---

## Resolved Against Comps

Every open question from the first draft is now resolved by the images. Recorded
here for traceability:

1. **Comps attached — authority confirmed.** All `[COMP]`-tagged items from the
   first draft are resolved by the six images and folded into the requirements
   below.
2. **Area 7 — investigated, no change needed.** The claim that "two rows carry
   `modern_indie` in the `stack` column" was a naïve comma-split artefact: lines
   58 `"100,000 Stars"` and 233 `"Quick, Draw!"` have literal commas inside their
   quoted `title`; under RFC-4180 their `stack` is **blank** and **no** row
   carries `modern_indie` in `stack`. The existing stack-enum rule in
   `scripts/lib/validate-csv.ts` (check #8) already provides the guard. See
   Requirement 7.
3. **Provenance card heading is mode-dependent** (comp): open-web →
   "ONE OF {total} HAND-PICKED SITES"; corner → "VIBECODED CORNER".
4. **Corner tier text keeps the number AND the label** (comp): "Tier {N} —
   {tier label}", not the label alone.
5. **Recipe line uses per-value fragments**, not the group glosses (comp text
   "the recipe: written by hand, no tools — hosted free from a code repo").
6. **Card footer copy changed** (comp): "Everyone's a builder. Learn from this
   one — tap the underlined parts." — and only appears in open-web mode.
7. **Ladder rung titles/descriptions come from the comp**, overriding
   `TIER_LABELS` for tiers 3–4 (see Requirement 4).
8. **Dead Air ring is LCD-green on the dark screen** (comp), not coral-on-cream.
9. **BUILD DIALS label gains "(for the curious)"** (comp).
10. **Self-portrait spec count includes this spec** → 7 (comp).

### Residual confirmations — now RESOLVED (review 2)

- **URLs supplied.** Footer hrefs (review 9), stack/host official sites (from the
  brief), and per-tool sites (review 3) are all fixed in `design.md`. Nothing
  outstanding.
- **Build-time numbers.** All four stats are finalized in the LAST task from fresh
  counts at ship time (review 1): specs = 7 (incl. `final-cut`), hooks = 2,
  tests = fresh vitest total, process-log entries = the highest entry number in
  `docs/kiro-process.md` (currently 81 — the counting unit is the entry number,
  not headings). See `design.md` §4.4.
- **"— OPEN (collapsed by default)"** on the BUILD DIALS row is confirmed a stage
  direction, NOT label copy (review 10). See Requirement 1.6.

---

## Requirement 1: TUNING Menu v2 — legible to first-timers

**User Story:** As a first-time visitor, I want the TUNING menu to explain what
each filter means so I can narrow the surf with confidence — or ignore it.

### Acceptance Criteria

1. THE OSD backdrop SHALL be a solid `#101210` with no bleed-through of screen
   content behind it (currently `rgba(16,18,15,0.93)`).
2. GROUP LABELS SHALL render at opacity `0.85` (raised from `0.6`).
3. EACH group label SHALL have a plain-English group gloss beneath it, verbatim:
   - CHARACTER → "what kind of place it is"
   - STACK → "what it was built with"
   - HOSTED ON → "where it lives online"
   - TYPE → "does it change while you watch"
   - TIER → "how much of it AI built"
4. THE OSD SHALL reserve exactly one line at its bottom as an **info strip**:
   - WHEN a chip is hovered or keyboard-focused, the strip SHALL read
     "**{Chip label}** — {chip gloss}" (chip label bold, e.g.
     "**Hugo** — a very fast static-site builder").
   - WHEN idle, the strip SHALL read "hover any option to see what it means".
   - THE strip SHALL be a single reserved line whose height is constant between
     idle and populated states (no layout shift).
5. A gloss-map module SHALL be the single source of group glosses and chip
   glosses; `design.md` lists its entries verbatim.
6. STACK, HOSTED ON, and TYPE SHALL sit inside one collapsible section toggled by
   a dashed row labelled "BUILD DIALS — filter by what it's built with (for the
   curious)", collapsed by default, with a ▾/▸ chevron and an expand-state
   indicator.
   - CHARACTER (open-web mode) SHALL sit ABOVE the BUILD DIALS toggle, always
     visible.
   - TIER (corner mode) SHALL sit outside BUILD DIALS.
7. A subtitle SHALL appear under the OSD header reading "narrow the surf — or just
   press SURF and take your chances" (centred, italic).
8. THE header SHALL read "— TUNING —" and a "Clear all ×" control SHALL sit at the
   OSD top-right.
9. ALL existing filter behaviour (character single-select toggle-off, build
   filters multi-select, tier chips in corner mode, Clear all, LCD summary) SHALL
   be unchanged. Active chip = solid LCD-green fill with dark text; inactive =
   green outline + green text.
10. THE info strip and BUILD DIALS toggle SHALL be keyboard operable; pressable
    controls SHALL meet the 44px minimum touch target.

---

## Requirement 2: Provenance Card v2 — legible, linked, learnable

**User Story:** As a visitor, I want the provenance card to read clearly and let
me click through to learn the tools a site was built with.

### Acceptance Criteria

1. THE card heading and footer line SHALL meet AA contrast on the white card:
   colour `--body-grey` (`#6E6A5E`) or darker.
2. THE card heading SHALL be mode-dependent:
   - open-web: "CATCH № {id} · ONE OF {total} HAND-PICKED SITES" (`{total}` from
     the live `/api/corpus-size` value already in `corpusTotal`).
   - corner: "CATCH № {id} · VIBECODED CORNER".
3. IN open-web mode, each stack and host name in the tech line SHALL be a
   dotted-coral-underline link to that technology's official site, opening in a
   new tab; the type value (Static/Dynamic) SHALL remain plain text. URL map in
   `design.md`.
4. LINKS SHALL open with `target="_blank"` and `rel="noopener noreferrer"`.
5. A stack/host value with no URL-map entry SHALL render as plain text (no broken
   link).
6. IN open-web mode, a recipe line "the recipe: {…}" SHALL appear under the tech
   line, composed from per-value recipe fragments (stack + host), e.g.
   "the recipe: written by hand, no tools — hosted free from a code repo".
7. IN corner mode, the tech line SHALL read "Built with {Tool} · Tier {N} —
   {tier label}" (both the number and the label, via `getTierLabel`), with
   {Tool} as a dotted-coral link.
8. THE open-web card SHALL show a dashed horizontal divider between the why-note
   and the footer, and the footer SHALL read "Everyone's a builder. Learn from
   this one — tap the underlined parts." with "Learn from this one" dotted-underlined.
9. IN corner mode the generic footer line SHALL be omitted; the MAKE ONE YOURSELF
   block (Requirement 3) is the card's closer.
10. THE all-blank fallback ("Hand-made on the open web.") and the
    never-show-"unknown" rule SHALL be preserved.
11. THE stamp SHALL read "OPENS IN TELLY" when embedded (per the embed cycle),
    and the card's print/reprint animation SHALL be unchanged.
12. THE card content SHALL flow as a single vertical column matching the comps
    (title → heading → tech line → recipe/tier → why-note → [divider + footer |
    make-one block]); the earlier two-column landscape grid is superseded.

---

## Requirement 3: Corner-Card MAKE ONE YOURSELF block

**User Story:** As a visitor looking at a vibecoded site, I want a nudge showing
which tool made it and roughly how long it takes, so I could try it myself.

### Acceptance Criteria

1. IN corner mode ONLY, and only when `built_with` is displayable, the card SHALL
   include a dashed-coral box with a very light coral fill.
2. THE box SHALL carry the label "MAKE ONE YOURSELF" (coral, bold, uppercase).
3. THE box SHALL contain the line: "This site was described into existence.
   Try {Tool} →" where "Try {Tool} →" is a bold link to the tool's official site
   ({Tool} = `getBuiltWithLabel`), new tab, `rel="noopener noreferrer"`.
4. THE box SHALL contain a time-cue line drawn from a per-tool map, styled as
   italic grey dot-separated fragments (comp, Lovable: "type what you want ·
   free to start · a site by tonight").
5. THE per-tool map SHALL be keyed on the corpus's REAL `built_with` values
   (`bolt`, `claude_code`, `cloudflare_workers`, `cursor`, `fly`, `godaddy_airo`,
   `kiro`, `lovable`): one official URL, and one honest time-cue string per tool.
   No marketing language. `design.md` drafts these for human review.
6. IF a `built_with` value has no map entry, the MAKE ONE YOURSELF box SHALL be
   omitted (no generic link).

---

## Requirement 4: `/ouroboros` rebuilt as "Dead Air"

**User Story:** As a curious visitor, I want the `/ouroboros` page to be the app's
colophon — a self-portrait showing how Surfdeck itself was built.

### Acceptance Criteria

1. THE page SHALL keep the design language (palette, fonts, hard-offset shadows,
   telly framing) and remain a standalone Worker-served HTML page.
2. THE page SHALL show the heading "The loop closes." and the intro "You're inside
   the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro —
   exhibit #1 in its own vibecoded corner."
3. THE page SHALL show a telly with a horizontal colour-bar strip (palette
   colours) across the top of the screen.
4. THE telly SHALL show a segmented ouroboros ring rendered in LCD-green
   (`#9FE870`) on the dark screen (`#191916`), slowly rotating (SVG), and static
   under `prefers-reduced-motion`.
5. THE telly SHALL display "— DEAD AIR —" (Doto, green) and, beneath it,
   "you've tuned into the set itself. press SURF to get back out there." (italic,
   green).
6. THE page SHALL show a SELF-PORTRAIT stat card:
   - A coral-bordered "SELF-PORTRAIT" badge (top-right, rotated).
   - Title "Surfdeck".
   - "CATCH № 349 · THE ONE THAT CAUGHT ITSELF".
   - A stats row: "{SPEC_COUNT} Kiro specs · {HOOK_COUNT} agent hooks ·
     {TEST_COUNT} tests · {LOG_COUNT}+ process-log entries" (comp values:
     7 · 2 · 268 · 80+), each a build-time constant derived from the repo.
   - A stack line "Hono · Cloudflare Workers · D1 · React — every line authored by
     AI in Kiro, every step human-gated."
   - Links "Read the repo · read the build log" (dotted-coral; hrefs in
     `design.md` §4.1, reusing the review-9 repo and process-log URLs).
7. THE page SHALL show THE LADDER exactly as comped:
   - Header "— THE LADDER —" (Doto) and subtitle "every site in the corner sits
     on a rung. pick yours and make one." (italic).
   - Four white rungs, each with a coral "TIER {N}" marker (Doto), a bold title,
     a grey description, and a dotted-coral "start here →" link to a
     representative tool's official site (from the tool map, `design.md` §4.3).
     - Tier 1 — "No-code AI builder" — "describe a site in a sentence, get a site"
     - Tier 2 — "AI app-builder" — "sketch screens and logic, AI wires it up"
     - Tier 3 — "AI-assisted coding" — "you steer, an AI pair-codes with you"
     - Tier 4 — "Developer cloud + agents" — "spec it, and agents build it — this
       site's own recipe"
   - Tier 4 SHALL have a coral border and a coral "SURFDECK'S RUNG" badge.
8. THE page SHALL include the footer (Requirement 5).
9. Build-time constants SHALL be computed from the repo (not scattered literals)
   and injected at build; `design.md` defines the derivation.

> Note: the ladder's Tier 3/4 titles ("AI-assisted coding", "Developer cloud +
> agents") intentionally differ from `TIER_LABELS` ("AI-assisted + hosted",
> "Developer cloud"); the comp text is authoritative for the ladder.

---

## Requirement 5: Footer on every page

**User Story:** As a visitor, I want a consistent footer that credits the author
and links out.

### Acceptance Criteria

1. EVERY page (the SPA and `/ouroboros`) SHALL render the same footer.
2. THE footer SHALL have a coral top rule.
3. THE footer's left block SHALL show "Kashif Nazir" (bold) over "Senior Technical
   Architect" (grey).
4. THE footer's right block SHALL show five dotted-coral, uppercase links,
   space-separated (no `·` separators), in order, with the approved hrefs
   (review 9; full table in `design.md` §5.1):
   - KASHIFNAZIR.COM → `https://kashifnazir.com`
   - GITHUB → `https://github.com/thekashifnazir`
   - LINKEDIN → `https://www.linkedin.com/in/kashifnazir/`
   - HOW THIS WAS MADE → `/ouroboros`
   - REPO & PROCESS LOG → `https://github.com/thekashifnazir/surfdeck/blob/main/docs/kiro-process.md`
     (deep link — the label promises the log, so it lands on the log).
5. THE footer's bottom row SHALL show "© 2026 Kashif Nazir" (left) and
   "SURFDECK — BUILT END-TO-END BY AI IN KIRO" (right, set in Doto).
6. AT ≤430px the footer SHALL stack without horizontal scroll and keep 44px hit
   targets on links.

---

## Requirement 6: Copy sweep

**User Story:** As a visitor, I want the product's voice to be consistent and
human across hero, hints, LCD, and page metadata.

### Acceptance Criteria

1. THE hero tagline SHALL become "Somebody made this. See how." (replacing
   "Every catch prints a card worth keeping.").
2. THE press-note rotation strings SHALL each carry one metaphor (e.g. "your
   card's printed — press again anytime"); exact strings in `design.md`.
3. THE LCD filter summary SHALL humanise `snake_case` via the existing label maps
   (e.g. "MODERN INDIE", not "MODERN_INDIE").
4. THE telly idle line SHALL become "press SURF — somebody's hand-made site tunes
   in right here".
5. `index.html` SHALL set:
   - `<title>` = "Surfdeck — somebody made this. see how."
   - a meta description
   - Open Graph `og:title` and `og:description` tags.
6. NO copy change SHALL alter frozen mood-button labels or other frozen strings
   defined in steering.

---

## Requirement 7: Data hygiene — investigated, no change needed

**User Story:** As a maintainer, I want the corpus clean and a guard that keeps
`stack` values valid.

### Acceptance Criteria

1. THE reported "two rows with `modern_indie` in `stack`" issue SHALL be recorded
   as **investigated — no change needed**: under RFC-4180 parsing no row carries
   `modern_indie` (or any invalid value) in `stack`; the apparent hits (lines 58,
   233) are quoted-title comma artefacts whose `stack` is genuinely blank.
2. NO edit SHALL be made to `data/featured-sites.csv`.
3. THE stack-enum guard ("valid stack or blank") already enforced in
   `scripts/lib/validate-csv.ts` (check #8) SHALL be treated as the guard of
   record. THE deliverable SHALL be new tests asserting it rejects an out-of-enum
   `stack` (e.g. `modern_indie`), accepts blank, and accepts a valid stack.
4. `npx tsx scripts/validate-seed.ts` SHALL continue to exit 0 on the corpus.

---

## Requirement 8: Embedded-site virtual viewport

**User Story:** As a visitor, I want an embedded site to show its real desktop
layout shrunk to fit the telly, not a cramped ~640px squeeze.

### Acceptance Criteria

1. THE embedded iframe SHALL be laid out at a virtual desktop width and scaled
   down with `transform: scale(...)` and `transform-origin: 0 0` so its scaled
   width exactly fits the telly screen width.
2. THE iframe height SHALL be `screenHeight ÷ scale` so the scaled visible area
   exactly fills the screen (no letterbox, no clipping of the fill area).
3. THE virtual width SHALL be 1280 on desktop and a smaller value (e.g. 980) at
   mobile screen sizes where 1280 would render text unreadably small; the exact
   breakpoint is defined in `design.md`.
4. THE scale maths SHALL be a pure function taking the screen size and returning
   `{ virtualWidth, scale, iframeWidth, iframeHeight }`, unit-tested independently
   of React.
5. CHANGING size/scale SHALL NOT remount the iframe (no reload); the transform is
   applied to the existing element.
6. NATIVE wheel/trackpad/touch scrolling and clicks inside the embedded site SHALL
   continue to work through the transform.
7. THE parent SHALL NOT script or read the cross-origin frame's contents — this
   requirement only sizes/transforms Surfdeck's own iframe element.
8. NO new buttons or controls SHALL be added.
9. THE iframe sandbox, `referrerpolicy`, load-failure timer, fallback, and pop-out
   behaviour from the telly-embed cycle SHALL be unchanged.

---

## Requirement 9: Constraints

### Acceptance Criteria

1. NO new npm dependencies SHALL be added. React/TS/CSS only.
2. `tsc --noEmit` SHALL produce zero errors.
3. ALL existing tests SHALL stay green; new behaviour (gloss map, URL map, tool
   map, recipe fragments, validator rule, virtual-viewport function) SHALL have
   new tests.
4. CEREMONY timing, palette, and fonts SHALL be untouched.
5. FONTS SHALL remain self-hosted in `public/fonts/`; never loaded from a CDN.
6. MOBILE layout at 390px SHALL have no horizontal scroll.
7. `prefers-reduced-motion: reduce` SHALL show end states statically for all new
   animated elements (ouroboros ring static, no colour-bar motion, OSD without
   transition).
8. NO gold, dark-glow gradients, purple/teal AI-gradient look, or handwriting
   fonts SHALL be introduced.
9. TASKS SHALL be sequenced so copy/CSS-only changes land first and the
   `/ouroboros` rebuild lands last (see `tasks.md`).
