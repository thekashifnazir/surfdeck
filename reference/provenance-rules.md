# provenance-rules.md — detecting stack / host / static-vs-dynamic

**Owner:** Stream 3. **Consumed by:** the schema's `stack` / `host` / `static_or_dynamic`
columns, Stream 1's tagging, and Axis-3 of `tag-vocabulary.md`. **Status:** research
reference — *no detection code lives here or anywhere in this repo*; the detector is built
in Kiro on/after Aug 8. This file is the spec that detector implements.

## What we're detecting and why it's allowed to fail

Every Discovery Engine result carries a **provenance card**: `stack · host · static-or-dynamic
· notable tech`, pitched as "everyone's a builder now — learn from the sites you like."

Provenance is **delight, not load-bearing.** It must degrade gracefully: headers get
stripped, Cloudflare hides the origin, hand-written static sites reveal almost nothing. A
**blank card reads as fine, not broken** — so we never block the "next site" transition on
detection, and we never show `unknown · unknown · unknown`. We show what we know and omit
the rest.

Everything below uses only **client-observable** data: the response headers, HTML, and
cookies any browser already receives, plus **public DNS**. No auth, no active probing, no
exploitation. One lightweight request per site, robots-respecting, cached.

---

## 1. Signal → what it indicates → reliability

Rough order of reliability, most-trustworthy first. "Reliability" = *when the signal is
present, how confident is the conclusion* — separate from how often it's present at all
(the "Fragility" column).

### 1a. HTML fingerprints (highest confidence when present)

These are emitted by the build tool itself and can't be faked by accident.

| Signal (in the HTML) | Indicates | Reliability | Fragility |
|---|---|---|---|
| `<script id="__NEXT_DATA__">` / `/_next/static/` asset paths | **Next.js** | High | Present on almost all Next builds |
| `<meta name="generator" content="Hugo …">` | **Hugo** | High | Strippable but Hugo emits by default |
| `<meta name="generator" content="Jekyll …">` | **Jekyll** | High | Default on; GitHub Pages' default SSG |
| `<meta name="generator" content="WordPress …">` + `wp-content/` / `wp-json` paths | **WordPress** | High | Very sticky; two independent signals |
| `<meta name="generator" content="Astro …">` / `/_astro/` paths | **Astro** | High | Default on |
| `window.__NUXT__` / `/_nuxt/` asset paths | **Nuxt** | High | Present on Nuxt builds |
| `id="___gatsby"` / `window.___gatsby` / `/page-data/` | **Gatsby** | High | Present on Gatsby builds |
| `data-sveltekit-*` attributes / `/_app/immutable/` paths | **SvelteKit** | High | Present on SvelteKit builds |
| `window.__remixContext` | **Remix** | High | Present on Remix builds |
| `<meta name="generator" content="Docusaurus …">` | **Docusaurus** | High | Default on |
| `<meta name="generator" content="Ghost …">` | **Ghost** | High | Default on |
| `id="root"` + `/static/js/` bundle (no framework markers) | leans **`react_spa`** (low tool-confidence) | Medium | Generic; confirms "an SPA," not which tool |
| `data-v-` scoped-style attributes / `window.__VUE__` devtools hook | **`vue_spa`** (no Nuxt markers) | Medium | Only present with scoped styles / devtools hook; absent → can't tell |
| `svelte-` class-name hashes on elements (no SvelteKit markers) | **`svelte_spa`** | Medium | Emitted by Svelte's scoped styles; minimal builds may lack it |
| No generator, no framework markers, plain semantic HTML | **`static_html`** (hand-rolled) | Medium | Absence-of-evidence — infer, don't assert |

> **The Eleventy / minimal-build blind spot.** Eleventy (11ty), Zola, and heavily
> optimized/minified builds often emit **no** generator meta and no distinctive asset
> paths — invisible by design. Absence of a fingerprint is *not* evidence of hand-written
> HTML; it collapses to `static_html` or `unknown`. Don't over-claim.

### 1b. Host-identifying response headers (high confidence, easily absent)

| Header | Indicates | Reliability | Fragility |
|---|---|---|---|
| `X-Vercel-Id`, `X-Vercel-Cache` | host = **Vercel** | High | Absent if fronted by another CDN |
| `X-Nf-Request-Id` | host = **Netlify** | High | — |
| `X-GitHub-Request-Id` + `Server: GitHub.com` | host = **GitHub Pages** | High | — |
| `Fly-Request-Id` / `Server: Fly/…` | host = **Fly.io** | High | — |
| `x-render-*` | host = **Render** | High | — |
| `Server: AmazonS3` + `X-Amz-*` | host = **AWS S3** (static) | High | — |
| `Via: … cloudfront` + `X-Amz-Cf-Id` | **CloudFront** CDN (often Amplify/S3 origin) | Medium | Tells you the CDN, maybe not the host |
| `Via: 1.1 vegur` | host = **Heroku** | Medium | Legacy signal |
| `X-Served-By` / `X-Cache: HIT` (Fastly/Varnish) | **Fastly** CDN in front | Medium | CDN, not origin |

### 1c. Generic web-server & framework headers (medium confidence)

| Header | Indicates | Reliability | Fragility |
|---|---|---|---|
| `Server: nginx` / `Apache` / `Caddy` / `LiteSpeed` | web server only — **not** the stack | Low | Says nothing about framework/SSG |
| `X-Powered-By: Express` | Node/**Express** backend → leans **dynamic** | Medium | Usually disabled in prod |
| `X-Powered-By: PHP/x.x` | **PHP** backend → leans **dynamic** (often WordPress) | Medium | Often disabled |
| `X-Powered-By: Next.js` | **Next.js** | High | Confirms 1a; redundant when present |

### 1d. Cloudflare — a proxy, not a host (read carefully)

| Header | Indicates | Reliability |
|---|---|---|
| `CF-Ray`, `Server: cloudflare`, `CF-Cache-Status` | Cloudflare sits **in front**; the **origin is masked** | High *for "CF is present"*, **useless for the origin** |

`CF-Ray` means Cloudflare is proxying — it does **not** mean the site is "a Cloudflare
site." Two distinct cases the card must not conflate:

- **Cloudflare Pages** (a *host*): deploys live on `*.pages.dev`; confirm via the CNAME
  (§1e), not `CF-Ray` alone → `host = cloudflare_pages`.
- **Cloudflare CDN/proxy** (origin elsewhere): `CF-Ray` present but no `pages.dev` CNAME →
  the origin host is **unknown**. Record `host = unknown` (or `self` if other evidence
  points to a self-hosted origin) and, if desired, surface "behind Cloudflare" as *notable
  tech*, never as the host.

### 1e. DNS / hosting (high confidence for `host`; survives header-stripping)

Public CNAME/apex records — visible even when headers are sparse, *unless* the record is
itself proxied (Cloudflare's orange-cloud A record hides the target).

| DNS pattern | Indicates |
|---|---|
| CNAME → `<user>.github.io` | `host = github_pages` |
| CNAME → `cname.vercel-dns.com` / `*.vercel.app` | `host = vercel` |
| `*.netlify.app` / CNAME → Netlify load balancer | `host = netlify` |
| `*.pages.dev` | `host = cloudflare_pages` |
| `*.neocities.org` | `host = neocities` |
| `*.surge.sh` | `host = surge` |
| `*.web.app` / `*.firebaseapp.com` | `host = firebase` |
| `*.onrender.com` | `host = render` |
| `*.amplifyapp.com` | `host = aws_amplify` |

### 1f. Static vs dynamic (composite inference — medium/low confidence)

No single signal is decisive; weigh the bundle. **When ambiguous, prefer `''` (unknown)
over a guess** — the schema treats blank as fine.

| Leans **static** | Leans **dynamic** |
|---|---|
| No `Set-Cookie` on a plain GET | `Set-Cookie` with a session id |
| `Cache-Control: public, max-age=…`, `immutable` | `Cache-Control: no-store` / `private` |
| Stable `ETag` / `Last-Modified`; identical HTML on repeat | Response varies per request; CSRF tokens inline |
| Served from a static host (Pages/Netlify/S3) via CDN edge | `X-Powered-By: Express` / `PHP`; `Vary: Cookie` |
| `X-Vercel-Cache: HIT` / CDN cache hit | Personalized content, auth redirects |

> **Hybrid frameworks are the trap.** Next.js, Astro, Nuxt, and SvelteKit can be either a
> static export *or* SSR/edge-rendered. `__NEXT_DATA__` alone tells you the *framework*,
> not the *rendering mode*. Decide static-vs-dynamic from cookies + cache headers, not from
> the framework fingerprint. SSG on a CDN → `static`; SSR / edge functions / per-request
> variation → `dynamic`; can't tell → `''`.

---

## 2. Wappalyzer-style rule sets — technique & licensing

**The technique.** Tools like Wappalyzer encode detection as **JSON rule sets**: regex
patterns matched against headers, HTML, cookies, script `src`s, and meta tags, mapped to
technology names, with *implied-relationship* chains (e.g. "Next.js implies React") and
version-capture groups. Everything in §1 is a hand-picked subset of exactly this style of
rule, scoped to the ~18 stacks we care about.

**Licensing — do not copy a rule database blind.** This has real implications for the Aug-8
submission repo (which is public):

- **Wappalyzer** itself went **proprietary / closed-source in 2023**; its maintained
  fingerprint dataset is no longer offered under an open licence. Don't pull "the
  Wappalyzer data" and assume it's free.
- **Community forks** preserve the last open snapshot — notably
  **`enthec/webappalyzer`** — but they inherit Wappalyzer's last open licence, which was
  **GPL-family (copyleft)**. Verify the exact licence on the specific fork/commit before use.
- **WhatWeb** (Ruby) is **GPLv2** — copyleft. **Wapiti** is GPL. **webtech** (Python) is
  MIT. **BuiltWith** is a commercial API, not a licence you can bundle.
- **Copyleft risk:** copying a GPL rule *database* into our detector could obligate us to
  open-source the detector under GPL — probably fine for a hackathon, but a deliberate
  choice, not an accident.

**Recommendation.** Author our **own small rule set** for the ~18 stacks in §3, written from
the **publicly documented signals** (the *fact* that "Next.js emits `__NEXT_DATA__`" is not
copyrightable; a specific curated regex corpus is). This sidesteps the licence question
entirely, keeps the rule set tiny and auditable, and is all the featured tier needs. If we
later want breadth for the bulk tier, evaluate an MIT-licensed option (`webtech`) or a
correctly-attributed GPL fork with eyes open. **Credit any borrowed source in the repo.**

---

## 3. Controlled value lists (the contract Stream 1 + schema use)

Lowercase `snake_case`. **Blank/omitted is always legal** (schema marks `stack`/`host`
optional; `static_or_dynamic` blank = unknown). Prefer blank to a guess. `unknown` is an
*explicit* "we looked and couldn't tell," distinct from blank "not yet detected" — the
schema currently expresses only blank, so **`unknown` collapses to blank on write**; it's
kept here for the detector's internal state. *(Confirmed at integration 2026-08-06: the
CSV stays blank-only; `unknown` is detector-internal.)*

### `stack` — the generator / framework (one value)

```
nextjs        nuxt          astro         sveltekit
gatsby        remix         hugo          jekyll
eleventy      zola          docusaurus    wordpress
ghost         react_spa     vue_spa       svelte_spa
static_html   unknown
```

- `static_html` — no framework detected, hand-rolled / plain HTML (the `minimal_static`
  character's typical stack).
- `react_spa` / `vue_spa` / `svelte_spa` — an SPA confirmed but no meta-framework
  (CRA/Vite). Use the meta-framework value (`nextjs`, `nuxt`, `sveltekit`) when its markers
  are present.
- `unknown` — looked, couldn't classify (writes as blank).

### `host` — where it's served (one value)

```
github_pages     vercel           netlify          cloudflare_pages
neocities        surge            firebase          render
fly              aws_s3           aws_amplify       heroku
self             unknown
```

- **`cloudflare_pages`** = the Cloudflare Pages product (confirmed via `*.pages.dev`
  CNAME). A bare Cloudflare **proxy** in front of an unknown origin is **not** this — use
  `unknown` (or `self` when other evidence indicates self-hosting) and, if wanted, note
  "behind Cloudflare" as notable tech. *(Adopted at integration 2026-08-06: the schema now
  lists `cloudflare_pages`; bare `cloudflare` removed.)*
- `self` — self-hosted / VPS / origin we can identify as not-a-named-platform.
- `unknown` — origin masked or unresolved (writes as blank).

### `static_or_dynamic` — fixed by the schema

```
static | dynamic | ''   (blank = unknown)
```

### Mapping into Axis-3 of the tag vocabulary

Axis-3 build filters ("show me static sites / Next.js sites / GitHub Pages sites") are
**derived**, not hand-tagged. They read directly off these three columns — e.g. the
`static` filter = `static_or_dynamic == 'static'`; the "Next.js" filter =
`stack == 'nextjs'`; "GitHub Pages" = `host == 'github_pages'`. No separate Axis-3
vocabulary to maintain; the filter buttons are populated from the distinct values actually
present in the corpus.

---

## 4. Graceful degradation — what to show when you know only part

The card renders **only the fields it's confident about**, in this preference order (most
recoverable first): `static_or_dynamic` and `host` usually survive when `stack` doesn't, so
lead with whatever you actually have. A card with one true fact beats three guesses.

| What detection recovered | Card shows |
|---|---|
| Everything | `Next.js · Vercel · dynamic` |
| Host + static/dynamic, stack masked | `Static site · Cloudflare` |
| Static/dynamic only | `Static site` |
| Stack only (host masked) | `Hugo site` |
| Nothing | *(card hidden — no text, no error)* |

**Rules.**
- **Never fabricate.** Omit a field rather than guess it.
- **Never render `unknown · unknown · unknown`** or any all-blank triple — hide the card
  instead. Blank must read as *fine*, not *failed*.
- **Never show an error state.** Detection failure is silent; the card just carries less.
- Notable tech (e.g. "behind Cloudflare", "React") is an optional *bonus* line, never a
  substitute for a real host/stack.

---

## 5. Ingest-time vs live detection

Two tiers, two strategies — this is *why* the schema carries pre-computed provenance columns.

### Featured tier (the few-hundred hand-vetted sites) → **precompute at ingest**

- Detect once at curation time; **store the result in the CSV** `stack` / `host` /
  `static_or_dynamic` columns; hand-verify the values.
- The demo never probes live during a stumble — every featured card is **instant and
  sharp**. This is the reason the columns exist in `featured-sites.schema.md`.
- Human review catches the hybrid-framework and Cloudflare-proxy edge cases the heuristics
  miss.

### Bulk tier (everything else) → **live-detect, then cache**

- Detect **lazily** on first surface; **cache** the result keyed by URL/domain with a TTL
  (~30–90 days). **Cache negative results too** (a masked site won't un-mask next week).
- Budget per site: **one HEAD + one GET of the HTML**, short timeout, then **fail open to a
  blank card**. Detection is async — it fills the card in when ready or leaves it blank;
  it **never blocks the "next site" transition**.
- **Be a polite client:** honour `robots.txt`, rate-limit, single lightweight request, no
  retries storming. All signals are passive/observable — no active probing.

**One-line rule:** *featured = precomputed and verified; bulk = live-detected, cached, and
allowed to be blank.*

---

## Open items — resolved at integration (2026-08-06)

1. Schema stays **blank-only**; `unknown` is detector-internal and collapses to blank on
   write.
2. **Split adopted**: schema `host` now lists `cloudflare_pages`; a bare Cloudflare proxy
   is not a host (→ blank/`self` per evidence).
3. §3 lists **confirmed and mirrored** into `featured-sites.schema.md` and
   `tag-vocabulary.md` Axis 3.
4. `bin/changelog.py` extended to map `content/` branches (separate fix branch); this
   branch carries its own `content-*` fragment.
