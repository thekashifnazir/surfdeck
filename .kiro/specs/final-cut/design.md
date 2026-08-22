# Design: Cycle 7 — "Final Cut"

## Overview

This document maps each Final Cut requirement to concrete, file-level changes and
defines the new lookup modules (gloss map, URL map, per-tool map, recipe
fragments) plus the pure virtual-viewport function. It is written to the six
approved comps; copy is transcribed from those images. No new dependencies.

### Reused existing surfaces (confirmed by reading the code)

| Surface | File | Notes |
|---|---|---|
| OSD / TUNING menu | `src/client/components/TellyMenu.tsx` | Renders groups + chips; add glosses, info strip, BUILD DIALS, subtitle. |
| Provenance card | `src/client/components/ProvenanceCard.tsx` | Imports `getTierLabel`; `corpusTotal` prop; `.prov-card__left/right`. |
| Provenance labels | `src/client/provenance-labels.ts` | `getProvenanceLabel(value)`. |
| Tier logic | `src/shared/vibecoded-tiers.ts` | `TIER_LABELS`, `getTierLabel`, `getBuiltWithTier`. |
| Built-with labels | `src/client/vibecoded-labels.ts` | `getBuiltWithLabel(value)`. |
| LCD text | `src/client/lcd-text.ts` | `getActiveFilterSummary` uppercases raw snake_case today. |
| Telly / iframe | `src/client/components/Telly.tsx` | Renders `.telly__iframe`; idle subtitle lives here. |
| Ouroboros page | `src/worker/routes/ouroboros.ts` | Hand-written HTML string; duplicated tokens. |
| Corpus size | `/api/corpus-size` → `App.tsx` → `corpusTotal` prop | Already wired. |

### New modules

| Module | Path (proposed) | Purpose |
|---|---|---|
| Gloss map | `src/client/gloss-map.ts` | Group glosses + chip glosses. |
| Recipe fragments | `src/client/gloss-map.ts` (same module) | Per-value recipe phrases. |
| URL map | `src/client/provenance-urls.ts` | stack/host value → official-site URL. |
| Tool map | `src/client/tool-map.ts` | `built_with` → { url, timeCue }. |
| Viewport maths | `src/client/embed-viewport.ts` | Pure `computeEmbedViewport(...)`. |
| Colophon stats | `src/worker/colophon-stats.ts` (generated) | Build-time constants. |

> Paths are proposals; confirm at implementation. All copy below is APPROVED
> (reviews 1–10); `[comp]` marks copy transcribed directly from an image.

---

## 1. TUNING Menu v2 (`TellyMenu.tsx` + `surfdeck.css` + `gloss-map.ts`)

### 1.1 Backdrop, labels, header, subtitle

- `.osd` background: `rgba(16,18,15,0.93)` → solid `#101210`.
- `.filters__label` opacity `0.6` → `0.85`.
- Header stays `— TUNING —` (Doto, green, letterspaced, centred).
- Add a centred italic subtitle under the header:
  "narrow the surf — or just press SURF and take your chances". `[comp]`
- `Clear all ×` stays top-right, green. `[comp]`

### 1.2 Group glosses (verbatim — final)

Rendered as a small muted green line under each group label, from `GROUP_GLOSS`:

```
CHARACTER  → "what kind of place it is"
STACK      → "what it was built with"
HOSTED ON  → "where it lives online"
TYPE       → "does it change while you watch"
TIER       → "how much of it AI built"
```

### 1.3 Info strip

- One reserved line pinned to the OSD bottom, fixed `min-height` (no layout shift).
- Idle text: "hover any option to see what it means". `[comp]`
- On chip hover/focus, show "**{Chip label}** — {chip gloss}" (label bold), e.g.
  the comp's "**Hugo** — a very fast static-site builder". State lives in
  `TellyMenu` (`useState<{label:string; gloss:string} | null>`), read from
  `CHIP_GLOSS`; cleared on mouse-leave/blur.

### 1.4 Gloss-map module — `src/client/gloss-map.ts`

Group glosses and chip glosses are all APPROVED verbatim (reviews 2 & 4). Keys
reuse existing vocabularies so every renderable chip has a gloss.

```ts
// FINAL — group glosses (verbatim)
export const GROUP_GLOSS: Record<string, string> = {
  character: "what kind of place it is",
  stack: "what it was built with",
  host: "where it lives online",
  static_or_dynamic: "does it change while you watch",
  tier: "how much of it AI built",
};

// CHIP_GLOSS: APPROVED verbatim (review 2). Tier glosses reuse the ladder
// descriptions (§4.3) — the OSD corner-mode tier chips and the ladder read alike.
export const CHIP_GLOSS: Record<string, string> = {
  // character
  modern_indie: "hand-made, but built this decade",
  old_web: "genuine survivors from the early internet",
  retro_personal: "new sites in old clothes",
  minimal_static: "plain, fast, nothing extra",
  // stack
  astro: "builder that ships mostly plain pages",
  gatsby: "React-based site builder",
  ghost: "publishing platform for writers",
  hugo: "a very fast static-site builder",
  jekyll: "the classic blog builder",
  nextjs: "React framework for full apps",
  nuxt: "Vue framework for full apps",
  react_spa: "one page, JavaScript does everything",
  static_html: "written by hand, no tools",
  sveltekit: "Svelte framework, lean and quick",
  wordpress: "runs a third of the web",
  // host
  aws_s3: "Amazon's plain file storage",
  fly: "runs apps near the visitor",
  github_pages: "free hosting from code repos",
  netlify: "push code, site goes live",
  render: "simple hosting for full apps",
  vercel: "hosting built for web frameworks",
  // type
  static: "pre-made pages, served as-is",
  dynamic: "built fresh on each visit",
  // tier (corner mode) — keyed by tier number as string; reuse ladder descriptions
  "1": "describe a site in a sentence, get a site",
  "2": "sketch screens and logic, AI wires it up",
  "3": "you steer, an AI pair-codes with you",
  "4": "spec it, and agents build it — this site's own recipe",
};
```

Coverage: every stack/host/character/type value present in the corpus, plus the
four tiers. A missing key leaves the strip on idle text (no crash).

### 1.5 BUILD DIALS collapse `[comp]`

- Dashed-border toggle row: "▾ BUILD DIALS — filter by what it's built with (for
  the curious)". Collapsed by default (`useState(false)`), chevron-only
  expand-state indicator; no visible OPEN/CLOSED text (state exposed via
  aria-expanded). Chevron ▸ closed / ▾ open.
  - CONFIRMED (review 10): the comp's trailing "— OPEN (collapsed by default)"
    is a stage direction in the image, NOT part of the label copy. The label is
    exactly "BUILD DIALS — filter by what it's built with (for the curious)".
- Contains STACK + HOSTED ON + TYPE. CHARACTER sits above the toggle; TIER
  (corner mode) is separate.
- Collapse via the existing `max-height`/overflow idiom; respects reduced motion.

### 1.6 Behaviour untouched

`TellyMenu` props keep their shape; gloss/info-strip/collapse state is internal.
Character single/build multi/tier toggles, Clear all, LCD summary all unchanged.

---

## 2. Provenance Card v2 (`ProvenanceCard.tsx` + `provenance-urls.ts` + gloss-map + CSS)

### 2.0 Layout `[comp]`

Both card comps show a single vertical column. Supersede the prior two-column
`.prov-card__left/right` landscape grid with a single-column flow:

```
title            (Familjen Grotesk 700, ink)
heading          (mode-dependent — §2.2, --body-grey or darker)
tech line        (§2.3 open-web links / §2.5 corner)
recipe line      (open-web only — §2.4)
why-note         (italic)
── dashed divider ──   (open-web only)
footer           (open-web only — §2.6)
[MAKE ONE YOURSELF]    (corner only — §3)
stamp            (OPENS IN TELLY, rotated, top-right)
```

### 2.1 Contrast

`.prov-card__heading` and `.prov-card__footer` colour `--caption-grey` →
`--body-grey` (`#6E6A5E`) or darker; verify AA (≥4.5:1) on white.

### 2.2 Heading (mode-dependent) `[comp]`

```
open-web: CATCH № {site.id} · ONE OF {corpusTotal} HAND-PICKED SITES
corner:   CATCH № {site.id} · VIBECODED CORNER
```

### 2.3 Linked tech line + URL map — `src/client/provenance-urls.ts`

Open-web tech line: stack and host labels become dotted-coral anchors when a URL
exists; the type value stays plain (comp: "Static HTML · GitHub Pages · Static"
— first two linked, "Static" plain).

```ts
export const PROVENANCE_URLS: Record<string, string> = {
  // stacks (official sites, from the brief)
  astro: "https://astro.build",
  gatsby: "https://www.gatsbyjs.com",
  ghost: "https://ghost.org",
  hugo: "https://gohugo.io",
  jekyll: "https://jekyllrb.com",
  nextjs: "https://nextjs.org",
  nuxt: "https://nuxt.com",
  react_spa: "https://react.dev",
  svelte_spa: "https://svelte.dev",
  sveltekit: "https://svelte.dev",
  wordpress: "https://wordpress.org",
  static_html: "https://developer.mozilla.org/en-US/docs/Learn/HTML", // "MDN Learn for Static HTML"
  // hosts (official sites, from the brief)
  aws_s3: "https://aws.amazon.com/s3",
  fly: "https://fly.io",
  github_pages: "https://pages.github.com",
  netlify: "https://www.netlify.com",
  render: "https://render.com",
  vercel: "https://vercel.com",
};

export function getProvenanceUrl(value: string): string | null {
  return PROVENANCE_URLS[value] ?? null;
}
```

Coverage: all 11 stack values and all 6 host values present in the corpus.

Anchor render:
```tsx
const url = getProvenanceUrl(value);
url
  ? <a className="prov-link" href={url} target="_blank" rel="noopener noreferrer">{label}</a>
  : <span>{label}</span>
```
`.prov-link`: `color: var(--coral); text-decoration: underline dotted;
text-underline-offset: 2px;`.

### 2.4 Recipe line (open-web) — per-value fragments `[comp]`

Comp: "the recipe: written by hand, no tools — hosted free from a code repo" for
`static_html` + `github_pages`. So the recipe is composed from per-value
fragments, NOT the group glosses. Add `RECIPE_FRAGMENTS` to `gloss-map.ts`:

```ts
// APPROVED verbatim (review 5). stack fragment + host fragment.
export const RECIPE_FRAGMENTS: Record<string, string> = {
  // stack
  static_html: "written by hand, no tools",
  hugo: "generated by Hugo, a fast site builder",
  jekyll: "generated by Jekyll, the classic blog builder",
  astro: "built with Astro, shipping mostly plain pages",
  gatsby: "built with Gatsby, a React site builder",
  nextjs: "built with Next.js, a React app framework",
  nuxt: "built with Nuxt, a Vue app framework",
  react_spa: "a single React page — JavaScript does everything",
  sveltekit: "built with SvelteKit, lean and quick",
  wordpress: "run on WordPress, like a third of the web",
  ghost: "published with Ghost, a writers' platform",
  // host
  github_pages: "hosted free from a code repo",
  netlify: "push code, site goes live",
  vercel: "hosted on Vercel, built for frameworks",
  aws_s3: "served from Amazon's plain file storage",
  render: "hosted on Render",
  fly: "running on Fly.io, near its visitors",
};
```

Compose: `the recipe: {stackFragment} — {hostFragment}`, joining the present
fragments with " — " and omitting either half when its value is blank. If neither
is present, omit the recipe line entirely.

### 2.5 Corner tech line `[comp]`

```tsx
// comp: "Built with Lovable · Tier 1 — no-code AI builder"  (Lovable = link)
const tier = getBuiltWithTier(site.built_with);      // e.g. 1
const label = tier ? getTierLabel(tier) : null;      // "No-code AI builder"
// render: Built with <a>{getBuiltWithLabel(built_with)}</a> · Tier {tier} — {label.toLowerCase()}
```
The comp shows the label lowercased in the card ("no-code AI builder"); apply
`.toLowerCase()` (or a CSS `text-transform`) so it matches. `{Tool}` links via the
tool map's URL (§3.2).

### 2.6 Footer + divider (open-web only) `[comp]`

- Dashed horizontal divider (`border-top: 1px dashed var(--caption-grey)`) between
  why-note and footer.
- Footer: "Everyone's a builder. Learn from this one — tap the underlined parts."
  with "Learn from this one" as a dotted-underline span. `[comp]`
- Corner mode omits this footer entirely (the make-one box closes the card).

---

## 3. MAKE ONE YOURSELF block (`ProvenanceCard.tsx` + `tool-map.ts` + CSS)

Rendered only when `cornerMode && isDisplayable(site.built_with) &&
getToolInfo(built_with)`.

```
┌───────────────────────────────┐  dashed coral border, light coral fill
│ MAKE ONE YOURSELF             │  coral bold uppercase
│ This site was described into  │  ← lead line, keyed off the SITE's tier
│ existence. Try Lovable →      │  bold link → tool official site
│ type what you want · free to  │  italic grey time cue (dot-separated)
│ start · a site by tonight     │
└───────────────────────────────┘
```

### 3.1 Lead line — keyed off the SITE's tier (APPROVED, review 3)

The first sentence is chosen by the site's tier (`getBuiltWithTier(built_with)`),
not fixed. `{Tool}` is `getBuiltWithLabel(built_with)`, linked to the tool's URL.
Note T4 uses "See {Tool} →" (not "Try"):

```ts
export const LEAD_LINE_BY_TIER: Record<number, string> = {
  1: "This site was described into existence. Try {Tool} →",
  2: "This site was prompted together in the browser. Try {Tool} →",
  3: "This site was pair-coded with AI. Try {Tool} →",
  4: "This site was built by AI agents on a developer platform. See {Tool} →",
};
```

### 3.2 Per-tool map — `src/client/tool-map.ts` (APPROVED, review 3)

Keyed on the 8 real corpus `built_with` values: an official URL and a time cue.
Keep every line plain — no marketing superlatives.

```ts
export interface ToolInfo {
  url: string;      // official site
  timeCue: string;  // italic dot-separated fragments
}

export const TOOL_MAP: Record<string, ToolInfo> = {
  lovable:            { url: "https://lovable.dev",             timeCue: "type what you want · free to start · a site by tonight" },
  bolt:               { url: "https://bolt.new",                timeCue: "prompt in the browser · free to start · a site by tonight" },
  godaddy_airo:       { url: "https://www.godaddy.com/airo",    timeCue: "guided setup · a site in an afternoon" },
  cursor:             { url: "https://cursor.com",              timeCue: "an AI editor pair-codes with you · free tier · a weekend project" },
  claude_code:        { url: "https://claude.com/claude-code",  timeCue: "an AI agent codes in your terminal · you review, it builds" },
  kiro:               { url: "https://kiro.dev",                timeCue: "spec it, agents build it — this site's own recipe" },
  cloudflare_workers: { url: "https://workers.cloudflare.com",  timeCue: "for developers · free tier · deploys in minutes" },
  fly:                { url: "https://fly.io",                  timeCue: "for developers · runs apps near your visitors" },
};

export function getToolInfo(value: string): ToolInfo | null {
  return TOOL_MAP[value] ?? null;
}
```

Rendering: pick the lead line via the site's tier, substitute the linked `{Tool}`,
then the time cue below. If `built_with` is unmapped, omit the whole box.

`.make-one`: `border: 1.5px dashed var(--coral); border-radius: 8px;
background: rgba(232,84,47,0.06); padding: …`. Label Familjen Grotesk 700
uppercase coral; body in the card's Special Elite; link `.prov-link` style.

---

## 4. `/ouroboros` "Dead Air" rebuild (`src/worker/routes/ouroboros.ts`)

Replace the page body/styles; keep the self-hosted `@font-face` block and design
tokens. Footer + stat card authored inline (not React) — this is a Worker HTML
string.

### 4.1 Structure `[comp]`

```
<header>
  "The loop closes."
  "You're inside the app you're surfing with. Surfdeck was built end-to-end by
   AI in Kiro — exhibit #1 in its own vibecoded corner."
<telly>                                   (dark body, 6px hard shadow)
  colour-bar strip (green / coral / white / grey / green / coral)
  segmented ouroboros ring — LCD-green on #191916, slow spin (static @reduced)
  "— DEAD AIR —"                          (Doto, green)
  "you've tuned into the set itself. press SURF to get back out there." (italic green)
<self-portrait card>                      (white, coral "SELF-PORTRAIT" badge)
  "Surfdeck"
  "CATCH № 349 · THE ONE THAT CAUGHT ITSELF"
  "{SPEC_COUNT} Kiro specs · {HOOK_COUNT} agent hooks · {TEST_COUNT} tests · {LOG_COUNT}+ process-log entries"
  "Hono · Cloudflare Workers · D1 · React — every line authored by AI in Kiro, every step human-gated."
  "Read the repo · read the build log"    (dotted-coral; hrefs below)
<the ladder>                              (§4.3)
<footer>                                  (§5)
```

Self-portrait link hrefs (reuse the review-9 URLs):
- "Read the repo" → `https://github.com/thekashifnazir/surfdeck`
- "read the build log" → `https://github.com/thekashifnazir/surfdeck/blob/main/docs/kiro-process.md`

### 4.2 Ouroboros ring (SVG)

Replace the 24 absolutely-positioned `<div>` cells with an inline `<svg>`: a ring
of square segments in LCD-green (`#9FE870`) on the dark screen; slow continuous
rotation via CSS `@keyframes` on a `<g>`; under `prefers-reduced-motion: reduce`
rotation removed (static ring). Keeps the dot-matrix / Doto aesthetic.

### 4.3 The ladder `[comp]`

Header "— THE LADDER —" (Doto) + subtitle "every site in the corner sits on a
rung. pick yours and make one." Four white rungs:

| Rung | Title `[comp]` | Description `[comp]` | "start here →" href | Badge |
|---|---|---|---|---|
| TIER 1 | No-code AI builder | describe a site in a sentence, get a site | https://www.godaddy.com/airo | — |
| TIER 2 | AI app-builder | sketch screens and logic, AI wires it up | https://lovable.dev | — |
| TIER 3 | AI-assisted coding | you steer, an AI pair-codes with you | https://kiro.dev | — |
| TIER 4 | Developer cloud + agents | spec it, and agents build it — this site's own recipe | https://workers.cloudflare.com | SURFDECK'S RUNG |

- The visible link label is "start here →" (coral, dotted-underline); the href is
  a representative tool from `TOOL_MAP` (choices in §4.3 approved, review 3).
- Tier 4 rung: coral border + coral "SURFDECK'S RUNG" badge (Surfdeck is
  `cloudflare_workers`, tier 4).
- **`TIER_LABELS` scope (APPROVED, review 2):** the ladder's rung titles are
  **ladder-local copy**. `TIER_LABELS` stays canonical and unchanged everywhere
  else — provenance cards, OSD tier chips, and any other consumer. The ladder
  titles are hardcoded in the route from the comp, not read from `TIER_LABELS`.

### 4.4 Build-time constants (Req 4.9) — APPROVED (review 1)

Compute at build; inject into the Worker bundle (e.g. a generated
`src/worker/colophon-stats.ts`, or Vite `define`). **All four are finalized in
the LAST task (task 26) from fresh counts at ship time**, not from any value
snapshotted here:

| Constant | Derivation (fresh at ship) | Value now |
|---|---|---|
| `SPEC_COUNT` | count of directories in `.kiro/specs/` (incl. `final-cut`) | 7 |
| `HOOK_COUNT` | `*.json` in `.kiro/hooks/` | 2 |
| `TEST_COUNT` | the fresh vitest total after this cycle's tests land | (grows; comp shows 268) |
| `LOG_COUNT` | the **highest entry number** in `docs/kiro-process.md`, rendered `{n}+` | 81 → 82 at ship |

- **`LOG_COUNT` counting unit = the entry number, NOT headings.** Entries are
  numbered; take the **maximum** number. Older entries use a different marker
  style than the newer `**N ·` format, so do not count markers — read the highest
  number present (81 now).
- **Rendered in the comp's `{n}+` format** ("82+ process-log entries"), not a bare
  number. The comp shows "80+"; the trailing `+` keeps the constant honest against
  entries written after ship.
- **Sequencing:** the Cycle 7 process-log entry (№82) is written BEFORE task 26
  runs, so the shipped stat is "82+".
- `TEST_COUNT` is the real fresh vitest total after Phase A–G tests exist; the
  comp's 268 is illustrative.

---

## 5. Footer (React component + inline `/ouroboros` HTML)

### 5.1 React component — `src/client/components/Footer.tsx`

Rendered at the bottom of `App.tsx` `<main>`:

```
<footer class="site-footer">            border-top: 2px solid var(--coral)
  <div class="site-footer__top">
    <div class="site-footer__id">
      <span class="site-footer__name">Kashif Nazir</span>       (bold, ink)
      <span class="site-footer__role">Senior Technical Architect</span>  (grey)
    </div>
    <nav class="site-footer__links">     (dotted-coral, uppercase, space-separated — NO middle dots)
      KASHIFNAZIR.COM  GITHUB  LINKEDIN  HOW THIS WAS MADE  REPO & PROCESS LOG
    </nav>
  </div>
  <div class="site-footer__base">
    <span>© 2026 Kashif Nazir</span>
    <span class="site-footer__doto">SURFDECK — BUILT END-TO-END BY AI IN KIRO</span>  (Doto, grey)
  </div>
</footer>
```

- The comp shows links spaced apart with NO "·" separators.
- **hrefs APPROVED (review 9):**
  | Link label | href |
  |---|---|
  | KASHIFNAZIR.COM | `https://kashifnazir.com` |
  | GITHUB | `https://github.com/thekashifnazir` |
  | LINKEDIN | `https://www.linkedin.com/in/kashifnazir/` |
  | HOW THIS WAS MADE | `/ouroboros` |
  | REPO & PROCESS LOG | `https://github.com/thekashifnazir/surfdeck/blob/main/docs/kiro-process.md` |
- REPO & PROCESS LOG is a **deep link** — the label promises the log, so it lands
  on the process log itself, not the repo root.
- External links open in a new tab with `rel="noopener noreferrer"`;
  "HOW THIS WAS MADE" (`/ouroboros`) is same-origin.

### 5.2 Inline copy for `/ouroboros`

Same markup/styles hand-copied into the Worker HTML string (client/worker boundary
prevents a shared constant without extra build plumbing — out of scope). Edit both
in the same task to avoid drift.

### 5.3 Responsive

At ≤430px the top row stacks (id block over links), links wrap and keep 44px hit
height; base row stacks. No horizontal scroll.

---

## 6. Copy sweep

| Location | File | Change |
|---|---|---|
| Hero tagline | `App.tsx` `.hero__headline` | → "Somebody made this. See how." |
| Press-note (0/1/2+) | `App.tsx` | approved rotation, §6.2 |
| Telly idle line | `Telly.tsx` `.telly__subtitle` | → "press SURF — somebody's hand-made site tunes in right here" |
| LCD summary | `lcd-text.ts` `getActiveFilterSummary` | humanise via label maps |
| `<title>`/meta/OG | `index.html` | title/description/OG tags |

### 6.1 LCD humanising

`getActiveFilterSummary` uppercases raw snake_case today (`modern_indie` →
"MODERN_INDIE"). Resolve display labels first, then uppercase:
- character → a character-label map (or the `CHARACTERS` list in `TellyMenu`,
  lifted to a shared module) → "Modern Indie" → "MODERN INDIE"
- stack/host/type → `getProvenanceLabel(value)` → uppercase
- tier → keep "TIER {n}"
Preserve the "+N" overflow behaviour. Covered by existing + new `lcd-text` tests.

### 6.2 Press-note rotation — APPROVED (review 6)

```
0 presses (pre-first-surf): "press SURF — the site tunes in right here"
1 press:                    "your card's printed — press again anytime"
2+ presses:                 "every press prints a fresh card"
```

### 6.3 index.html

```html
<title>Surfdeck — somebody made this. see how.</title>
<!-- description APPROVED (review 7) -->
<meta name="description" content="A TV remote for the hand-made web. Press SURF, a real independent site tunes in, and a card prints telling you how it was built." />
<meta property="og:title" content="Surfdeck — somebody made this. see how." />
<meta property="og:description" content="A TV remote for the hand-made web. Press SURF, a real independent site tunes in, and a card prints telling you how it was built." />
```

---

## 7. Data hygiene — investigated, no change needed

- **No CSV edit.** Under RFC-4180 parsing (`parseCSV`) no row carries
  `modern_indie` (or any invalid value) in `stack`; the apparent hits (lines 58
  `"100,000 Stars"`, 233 `"Quick, Draw!"`) are quoted-title comma artefacts whose
  `stack` is blank.
- **Guard of record:** `scripts/lib/validate-csv.ts` check #8 already enforces
  "stack ∈ VALID_STACK or blank"; `validate-seed.ts` delegates to it.
- **Deliverable = tests** in `scripts/rules.test.ts` (or a dedicated
  `validate-csv.test.ts`): a row with `stack = modern_indie` → `stack` enum error;
  blank `stack` → passes; `stack = nextjs` → passes.

---

## 8. Embedded-site virtual viewport (`embed-viewport.ts` + `Telly.tsx` + CSS)

### 8.1 Pure function — `src/client/embed-viewport.ts`

```ts
export interface EmbedViewport {
  virtualWidth: number; // CSS px the iframe is laid out at
  scale: number;        // transform scale
  iframeWidth: number;  // = virtualWidth
  iframeHeight: number; // = screenHeight / scale (fills the screen)
}

/**
 * Pure — no DOM. Returns the virtual width, scale, and iframe dimensions so the
 * scaled frame exactly fills the screen width and height.
 * virtualWidth: 1280 by default; 980 when the screen is narrow enough that 1280
 * scales text unreadably small. Breakpoint APPROVED (review 8): screenWidth < 480
 * → 980 (covers the 390px mobile target).
 */
export function computeEmbedViewport(
  screenWidth: number,
  screenHeight: number
): EmbedViewport {
  const virtualWidth = screenWidth < 480 ? 980 : 1280;
  const scale = screenWidth / virtualWidth;   // scaled width === screenWidth
  return {
    virtualWidth,
    scale,
    iframeWidth: virtualWidth,
    iframeHeight: screenHeight / scale,        // scaled height === screenHeight
  };
}
```

### 8.2 Applying it in `Telly.tsx`

- Measure `.telly__screen` with a `ResizeObserver` (read-only; iframe never
  remounted — Req 8.5); keep the size in state.
- Inline style on the existing `<iframe>`:
  `width:{iframeWidth}px; height:{iframeHeight}px; transform:scale({scale});
   transform-origin:0 0;`.
- `src`, `sandbox`, `referrerPolicy`, `onLoad`, load-failure timer, fallback, and
  pop-out are unchanged (Req 8.9). Only style mutates, so React does not remount.
- `.telly__screen` keeps `overflow: hidden`; scrolling/clicks pass through the
  transform natively (Req 8.6); frame contents are never touched (Req 8.7).

### 8.3 Reduced motion / no controls

No animation and no buttons added (Req 8.8). Reduced-motion behaviour unchanged
from the telly-embed cycle.

---

## 9. File Impact Summary

| Area | Files | Nature |
|---|---|---|
| 1 TUNING | `TellyMenu.tsx`, new `gloss-map.ts`, `surfdeck.css` | glosses, info strip, BUILD DIALS, backdrop, subtitle |
| 2 Card | `ProvenanceCard.tsx`, new `provenance-urls.ts`, `gloss-map.ts`, `surfdeck.css` | layout, contrast, heading, links, recipe, tier label, footer |
| 3 Make-one | `ProvenanceCard.tsx`, new `tool-map.ts`, `surfdeck.css` | dashed-coral block |
| 4 Ouroboros | `src/worker/routes/ouroboros.ts`, generated `colophon-stats.ts` | Dead Air rebuild, stat card, ladder |
| 5 Footer | new `Footer.tsx`, `App.tsx`, `ouroboros.ts`, `surfdeck.css` | footer both paths |
| 6 Copy | `App.tsx`, `Telly.tsx`, `lcd-text.ts`, `index.html` | tagline, press-notes, idle line, LCD, meta |
| 7 Data | `scripts/*.test.ts` | tests only (no data edit) |
| 8 Viewport | new `embed-viewport.ts`, `Telly.tsx`, `surfdeck.css` | virtual viewport transform |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Copy drift from the approved strings | Wrong voice ships | All copy is approved verbatim (reviews 1–10); implement exactly as written, no paraphrasing. |
| Stale build-time stats baked in | Wrong colophon numbers | All four counted fresh in the LAST task (§4.4); process-log = max entry number (81 now). |
| Footer duplicated across client/worker | Drift over time | Both edited in one task; documented as intentional. |
| Card single-column change vs prior grid | Layout regressions | Follow comp order (§2.0); re-verify mobile 390px + landscape. |
| Virtual-viewport scroll passthrough regressions | Embedded site unusable | Pure fn unit-tested; manual scroll/click check; no frame scripting. |
| Ladder titles diverge from `TIER_LABELS` | Inconsistency confusion | Ladder titles hardcoded from comp; documented (§4.3). |

---

## 11. Out of Scope

- Engine/API-contract changes, routing changes, DDL/schema changes.
- New dependencies or animation libraries.
- CDN fonts.
- Auth, accounts, submissions.
- Any change to ceremony timing, palette, or font faces.
- Scripting or reading the cross-origin embedded frame.
- Editing `data/featured-sites.csv` (Requirement 7 is investigation + tests only).
