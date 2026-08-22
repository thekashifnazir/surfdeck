/**
 * /ouroboros route — standalone "Dead Air" colophon HTML page.
 * Surfdeck is exhibit #1 in its own vibecoded corner.
 * Served as a standalone page (not the SPA) so it works when
 * opened in a new tab from surf, like any other site URL.
 *
 * This file is built up across Final Cut tasks 26–30:
 *   - task 26 wired the build-time colophon constants (below);
 *   - task 27 (this) builds the Dead Air SHELL: header, telly, colour-bar,
 *     segmented ouroboros ring (SVG), and the Dead Air readouts;
 *   - task 28 adds the self-portrait stat card (consumes the constants);
 *   - task 29 adds the ladder;
 *   - task 30 inlines the footer + extends route tests.
 */

import { Hono } from "hono";
import {
  SPEC_COUNT,
  HOOK_COUNT,
  TEST_COUNT,
  LOG_COUNT,
} from "../colophon-stats.js";

export const ouroborosRoute = new Hono();

/**
 * Self-portrait stats row, built from the fresh build-time constants
 * (design §4.4). LOG_COUNT renders in the comp's `{n}+` form (e.g.
 * "82+ process-log entries"), never a bare number. Consumed by the self-portrait
 * stat card below so no stat is ever a scattered numeric literal.
 */
const COLOPHON_STATS_LINE = `${SPEC_COUNT} Kiro specs · ${HOOK_COUNT} agent hooks · ${TEST_COUNT} tests · ${LOG_COUNT}+ process-log entries`;

ouroborosRoute.get("/ouroboros", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#F2F0E9">
  <title>Surfdeck — Dead Air</title>
  <style>
    @font-face {
      font-family: 'Familjen Grotesk';
      font-style: normal;
      font-weight: 400 700;
      font-display: swap;
      src: url('/fonts/familjen-grotesk-latin.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Doto';
      font-style: normal;
      font-weight: 900;
      font-display: swap;
      src: url('/fonts/doto-900.woff') format('woff');
    }
    @font-face {
      font-family: 'Special Elite';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/special-elite-400.woff2') format('woff2');
    }

    :root {
      --bg: #F2F0E9;
      --ink: #26262A;
      --body-grey: #6E6A5E;
      --caption-grey: #8A867A;
      --coral: #E8542F;
      --coral-pressed: #A33417;
      --tv-body: #26262A;
      --screen: #191916;
      --lcd-green: #9FE870;
      --white: #FFFFFF;
      --deep-shadow: #141416;
      --font-body: 'Familjen Grotesk', 'Trebuchet MS', sans-serif;
      --font-lcd: 'Doto', 'Courier New', monospace;
      --font-card: 'Special Elite', 'Courier New', monospace;
    }

    * { box-sizing: border-box; }

    body {
      font-family: var(--font-body);
      max-width: 640px;
      margin: 3.5rem auto;
      padding: 0 1.25rem;
      line-height: 1.6;
      background: var(--bg);
      color: var(--ink);
    }

    /* ---- Page grid ------------------------------------------------------- */
    /* Mobile-first: normal block flow, everything stacks in DOM order
       (header → telly → SURF → self-portrait → ladder). At ≥900px the page
       widens to a two-column layout: the "set" (heading, telly, SURF key,
       self-portrait) on the left, the ladder on the right. */
    .page__left { min-width: 0; }
    .page__right { min-width: 0; }

    @media (min-width: 900px) {
      body { max-width: 1160px; }

      .page-grid {
        display: grid;
        grid-template-columns: 460px minmax(0, 1fr);
        gap: 3.5rem;
        align-items: start;
      }

      /* One alignment axis: everything in the left column shares the heading's
         left edge (the 460px track), nothing centers against a wider box. */
      .page__left .set,
      .page__left .selfportrait {
        margin-left: 0;
        margin-right: 0;
      }

      /* Ladder fills the right column and tops out level with the heading. */
      .page__right .ladder {
        margin-top: 0;
        max-width: none;
      }
    }

    /* ---- Header ---------------------------------------------------------- */
    .dead-air__header {
      margin: 0 0 2rem;
    }

    .dead-air__title {
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0 0 0.6rem;
      color: var(--ink);
    }

    .dead-air__intro {
      color: var(--body-grey);
      margin: 0;
      font-size: 1rem;
    }

    /* ---- The set (telly + anchored SURF key) ----------------------------- */
    .set {
      position: relative;
      max-width: 460px;
      width: 100%;
      margin: 2rem auto 0;
    }

    /* ---- Telly ----------------------------------------------------------- */
    .telly {
      background: var(--tv-body);
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 6px 0 var(--deep-shadow);
      margin: 0;
      width: 100%;
    }

    .telly__screen {
      background: var(--screen);
      border-radius: 6px;
      overflow: hidden;
      padding: 0 0 1.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Colour-bar strip across the top of the screen */
    .telly__bars {
      display: flex;
      width: 100%;
      height: 18px;
    }

    .telly__bar {
      flex: 1 1 0;
    }

    .telly__bar--green  { background: var(--lcd-green); }
    .telly__bar--coral  { background: var(--coral); }
    .telly__bar--white  { background: var(--white); }
    .telly__bar--grey   { background: var(--caption-grey); }

    /* Segmented ouroboros ring (SVG) */
    .dead-air__ring {
      display: block;
      width: 190px;
      height: 190px;
      max-width: 70%;
      margin: 1.75rem auto 1.25rem;
    }

    .dead-air__ring-spin {
      transform-origin: 100px 100px;
      animation: ring-rotate 24s linear infinite;
    }

    @keyframes ring-rotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .dead-air__deadair {
      font-family: var(--font-lcd);
      font-weight: 900;
      color: var(--lcd-green);
      letter-spacing: 0.12em;
      font-size: 1.05rem;
      margin: 0.25rem 0 0.5rem;
      text-align: center;
    }

    .dead-air__subline {
      font-family: var(--font-body);
      font-style: italic;
      color: var(--lcd-green);
      opacity: 0.85;
      font-size: 0.85rem;
      margin: 0;
      padding: 0 1.25rem;
      text-align: center;
      max-width: 34ch;
      line-height: 1.5;
    }

    /* Subtle broadcast shimmer on the colour bars (disabled under reduced motion) */
    .telly__bars {
      animation: bars-flicker 1.2s steps(3) infinite;
    }

    @keyframes bars-flicker {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.82; }
    }

    /* ---- Self-portrait stat card ---------------------------------------- */
    .selfportrait {
      position: relative;
      background: var(--white);
      border: 2px solid var(--ink);
      border-radius: 12px;
      padding: 1.6rem 1.5rem 1.35rem;
      margin: 2.5rem auto 0;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 4px 8px rgba(38, 38, 42, 0.12);
      font-family: var(--font-card);
    }

    .selfportrait__badge {
      position: absolute;
      top: -0.7rem;
      right: 1.1rem;
      transform: rotate(-4deg);
      background: var(--white);
      color: var(--coral);
      border: 2px solid var(--coral);
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
      font-family: var(--font-card);
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .selfportrait__title {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 1.5rem;
      margin: 0.15rem 0 0.4rem;
      color: var(--ink);
    }

    .selfportrait__wordmark {
      color: inherit;
      text-decoration: none;
    }

    /* Real SURF key — mirror of .surf-key (surfdeck.css) at ~72px.
       Offset-only hard shadow, no blur. Navigates back to "/".
       Anchored onto the telly's bottom bezel: the negative top margin pulls
       the key up so it overlaps the set's bottom edge like a power button. */
    .deadair-surf-wrap {
      display: flex;
      justify-content: center;
      position: relative;
      z-index: 2;
      margin: -36px 0 0;
    }

    .deadair-surf {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-decoration: none;
      color: #fff;
      background: var(--coral);
      border: 3px solid #17171A;
      cursor: pointer;
      transform: translateY(0);
      box-shadow: 0 7px 0 var(--coral-pressed);
      transition: transform 0.08s ease, box-shadow 0.08s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .deadair-surf:hover {
      transform: translateY(-2px);
      box-shadow: 0 9px 0 var(--coral-pressed);
    }

    .deadair-surf:active {
      transform: translateY(5px);
      box-shadow: 0 1px 0 var(--coral-pressed);
    }

    .deadair-surf:focus-visible {
      outline: 3px solid var(--ink);
      outline-offset: 3px;
    }

    .selfportrait__catch {
      font-family: var(--font-card);
      color: var(--body-grey);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      margin: 0 0 1rem;
    }

    .selfportrait__stats {
      color: var(--ink);
      font-size: 0.95rem;
      margin: 0 0 0.75rem;
      line-height: 1.5;
    }

    .selfportrait__stack {
      color: var(--body-grey);
      font-size: 0.9rem;
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    .selfportrait__links {
      font-size: 0.9rem;
      margin: 0;
      color: var(--body-grey);
    }

    .selfportrait__link {
      color: var(--coral);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
    }

    /* ---- The ladder ------------------------------------------------------ */
    .ladder {
      margin: 3rem auto 0;
      max-width: 460px;
      width: 100%;
    }

    .ladder__title {
      font-family: var(--font-lcd);
      font-weight: 900;
      color: var(--ink);
      letter-spacing: 0.12em;
      font-size: 1.05rem;
      margin: 0 0 0.5rem;
      text-align: center;
    }

    .ladder__subtitle {
      font-family: var(--font-body);
      font-style: italic;
      color: var(--body-grey);
      font-size: 0.9rem;
      margin: 0 0 1.5rem;
      text-align: center;
      line-height: 1.5;
    }

    /* Slim rungs: each rung is one horizontal bar — marker left, title + one-
       line description middle, "start here →" right (design comp). */
    .rung {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.9rem;
      min-height: 60px;
      background: var(--white);
      border: 2px solid var(--ink);
      border-radius: 10px;
      padding: 0.6rem 1.1rem;
      margin: 0 0 0.75rem;
      box-shadow: 0 4px 0 var(--deep-shadow);
    }

    .rung:last-child { margin-bottom: 0; }

    .rung--surfdeck {
      border-color: var(--coral);
      box-shadow: 0 4px 0 var(--coral);
    }

    .rung__badge {
      position: absolute;
      top: -0.7rem;
      right: 1.1rem;
      transform: rotate(-4deg);
      background: var(--white);
      color: var(--coral);
      border: 2px solid var(--coral);
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
      font-family: var(--font-card);
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .rung__marker {
      flex: 0 0 auto;
      min-width: 3.4rem;
      font-family: var(--font-lcd);
      font-weight: 900;
      color: var(--coral);
      letter-spacing: 0.08em;
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.15;
    }

    .rung__body {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .rung__title {
      font-family: var(--font-body);
      font-weight: 700;
      color: var(--ink);
      font-size: 1rem;
      margin: 0;
      line-height: 1.25;
    }

    .rung__desc {
      color: var(--body-grey);
      font-size: 0.85rem;
      margin: 0;
      line-height: 1.35;
    }

    .rung__link {
      flex: 0 0 auto;
      margin-left: auto;
      white-space: nowrap;
      font-family: var(--font-body);
      font-weight: 600;
      color: var(--coral);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
      font-size: 0.9rem;
    }

    /* On narrow screens the rung relaxes into a stacked block so the marker,
       copy, and link never crowd. */
    @media (max-width: 460px) {
      .rung {
        flex-wrap: wrap;
        gap: 0.35rem 0.9rem;
      }

      .rung__link { margin-left: 0; }
    }

    /* ---- Site footer (inlined mirror of Footer.tsx + surfdeck.css §5.2) --
       Hand-copied from .site-footer in src/client/surfdeck.css so /ouroboros
       matches the SPA footer. Edit both in the same task to avoid drift. */
    .site-footer {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin-top: 2.5rem;
      padding: 1.25rem 0 0;
      border-top: 2px solid var(--coral);
      font-family: var(--font-body);
    }

    .site-footer__top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .site-footer__id {
      display: flex;
      flex-direction: column;
    }

    .site-footer__name {
      font-weight: 700;
      color: var(--ink);
    }

    .site-footer__role {
      font-size: 0.85rem;
      color: var(--body-grey);
    }

    .site-footer__links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 1rem;
    }

    .site-footer__link {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--coral);
      text-decoration: underline dotted;
      text-underline-offset: 2px;
    }

    .site-footer__link:hover {
      color: var(--coral-pressed);
    }

    .site-footer__base {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem 1rem;
      margin-top: 0.75rem;
      padding-bottom: 1.25rem;
      font-size: 0.75rem;
      color: var(--body-grey);
    }

    .site-footer__doto {
      font-family: var(--font-lcd);
      font-weight: 900;
      letter-spacing: 0.04em;
      color: var(--body-grey);
    }

    /* Footer stacks at ≤430px: id block over links, base row stacks. */
    @media (max-width: 430px) {
      .site-footer__top {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .site-footer__base {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dead-air__ring-spin { animation: none; }
      .telly__bars { animation: none; opacity: 1; }
      .deadair-surf { transition: none; }
      .deadair-surf:active {
        transform: none;
        box-shadow: 0 7px 0 var(--coral-pressed);
        background: var(--coral-pressed);
      }
    }
  </style>
</head>
<body>
  <div class="page-grid">
    <div class="page__left">
      <header class="dead-air__header">
        <h1 class="dead-air__title">The loop closes.</h1>
        <p class="dead-air__intro">You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner.</p>
      </header>

      <!-- The set: telly with the SURF key anchored to its bottom bezel -->
      <div class="set">
        <!-- Telly: colour bars + ouroboros ring + Dead Air readouts -->
        <div class="telly">
          <div class="telly__screen">
            <div class="telly__bars" aria-hidden="true">
              <span class="telly__bar telly__bar--green"></span>
              <span class="telly__bar telly__bar--coral"></span>
              <span class="telly__bar telly__bar--white"></span>
              <span class="telly__bar telly__bar--grey"></span>
              <span class="telly__bar telly__bar--green"></span>
              <span class="telly__bar telly__bar--coral"></span>
            </div>

            <svg class="dead-air__ring" viewBox="0 0 200 200" role="img"
                 aria-label="An ouroboros ring turning slowly on a dark screen">
              <g class="dead-air__ring-spin">
                ${generateRingGlyph()}
              </g>
            </svg>

            <p class="dead-air__deadair">— DEAD AIR —</p>
            <p class="dead-air__subline">you've tuned into the set itself. press SURF to get back out there.</p>
          </div>
        </div>

        <!-- Real SURF key: anchored on the bezel, the literal way back out -->
        <div class="deadair-surf-wrap">
          <a href="/" class="deadair-surf" aria-label="Surf — back to Surfdeck">SURF</a>
        </div>
      </div>

      <!-- Self-portrait stat card: numbers come from the build-time constants -->
      <section class="selfportrait" aria-label="Surfdeck self-portrait">
        <span class="selfportrait__badge">SELF-PORTRAIT</span>
        <h2 class="selfportrait__title"><a href="/" class="selfportrait__wordmark">Surfdeck</a></h2>
        <p class="selfportrait__catch">CATCH № 349 · THE ONE THAT CAUGHT ITSELF</p>
        <p class="selfportrait__stats">${COLOPHON_STATS_LINE}</p>
        <p class="selfportrait__stack">Hono · Cloudflare Workers · D1 · React — every line authored by AI in Kiro, every step human-gated.</p>
        <p class="selfportrait__links">
          <a href="https://github.com/thekashifnazir/surfdeck" class="selfportrait__link" target="_blank" rel="noopener noreferrer">Read the repo</a> · <a href="https://github.com/thekashifnazir/surfdeck/blob/main/docs/kiro-process.md" class="selfportrait__link" target="_blank" rel="noopener noreferrer">read the build log</a>
        </p>
      </section>
    </div>

    <div class="page__right">
      <!-- The ladder: five rungs bottom-up (TIER 4 top → BY HAND bottom) -->
      <section class="ladder" aria-label="The ladder — pick a rung and make one">
        <p class="ladder__title">— THE LADDER —</p>
        <p class="ladder__subtitle">every site in the corner sits on a rung. pick yours and make one.</p>
        ${generateLadderRungs()}
      </section>
    </div>
  </div>

  <!-- Site footer: inlined mirror of Footer.tsx (design §5.2) -->
  ${generateFooter()}
</body>
</html>`;
  return c.html(html);
});

/**
 * Builds the ouroboros ring as a single dashed SVG `<circle>` in LCD-green with
 * round linecaps (design comp), plus a small triangular "head" at the top where
 * the snake meets its tail. The parent `<g>` is what rotates (CSS), so the head
 * travels around the ring as it spins. Replaces the earlier diamond-dot glyph.
 */
function generateRingGlyph(): string {
  return `<circle cx="100" cy="100" r="72" fill="none" stroke="#9FE870"
            stroke-width="7" stroke-dasharray="10 6" stroke-linecap="round" />
          <polygon points="100,17 90,34 110,34" fill="#9FE870" />`;
}

/**
 * Builds the five ladder rungs (design §4.3). Rendered BOTTOM-UP like a real
 * ladder: DOM/visual order top-to-bottom is TIER 4 → TIER 3 → TIER 2 → TIER 1 →
 * BY HAND. TIER 4 ("SURFDECK'S RUNG") is the top rung with a coral border +
 * badge; BY HAND is the bottom rung and reuses the comped rung markup exactly
 * (its marker slot shows "BY HAND" where the TIER rungs show "TIER {N}").
 *
 * Rung titles/descriptions are ladder-local copy hardcoded from the comp — NOT
 * read from TIER_LABELS (which stays canonical for cards/OSD, design §4.3).
 * External "start here →" links open in a new tab with rel="noopener noreferrer".
 */
function generateLadderRungs(): string {
  const rungs: Array<{
    marker: string;
    title: string;
    desc: string;
    href: string;
    badge: boolean;
  }> = [
    {
      marker: "TIER 4",
      title: "Developer cloud + agents",
      desc: "spec it, and agents build it — this site's own recipe",
      href: "https://kiro.dev",
      badge: true,
    },
    {
      marker: "TIER 3",
      title: "AI-assisted coding",
      desc: "you steer, an AI pair-codes with you",
      href: "https://cursor.com",
      badge: false,
    },
    {
      marker: "TIER 2",
      title: "AI app-builder",
      desc: "sketch screens and logic, AI wires it up",
      href: "https://lovable.dev",
      badge: false,
    },
    {
      marker: "TIER 1",
      title: "No-code AI builder",
      desc: "describe a site in a sentence, get a site",
      href: "https://www.godaddy.com/airo",
      badge: false,
    },
    {
      marker: "BY HAND",
      title: "No tools at all",
      desc: "a text editor, one HTML file, a free host — the original way",
      href: "https://neocities.org",
      badge: false,
    },
  ];

  return rungs
    .map((rung) => {
      const badge = rung.badge
        ? `\n      <span class="rung__badge">SURFDECK'S RUNG</span>`
        : "";
      const rungClass = rung.badge ? "rung rung--surfdeck" : "rung";
      return `<article class="${rungClass}">${badge}
      <p class="rung__marker">${rung.marker}</p>
      <div class="rung__body">
        <h3 class="rung__title">${rung.title}</h3>
        <p class="rung__desc">${rung.desc}</p>
      </div>
      <a href="${rung.href}" class="rung__link" target="_blank" rel="noopener noreferrer">start here →</a>
    </article>`;
    })
    .join("\n    ");
}

/**
 * Builds the site footer (design §5.1) — an inlined mirror of the SPA's
 * `Footer.tsx`. Markup and classes are kept identical to the React component so
 * the two footers stay visually in lock-step (edit both in the same task to
 * avoid drift). Five space-separated dotted-coral uppercase links (no "·"),
 * a coral top rule, an id block, and a base row with the © line + Doto tagline.
 *
 * "HOW THIS WAS MADE" (/ouroboros) is same-origin; every other link opens in a
 * new tab with rel="noopener noreferrer".
 */
function generateFooter(): string {
  const links: Array<{ label: string; href: string; external: boolean }> = [
    { label: "KASHIFNAZIR.COM", href: "https://kashifnazir.com", external: true },
    { label: "GITHUB", href: "https://github.com/thekashifnazir", external: true },
    {
      label: "LINKEDIN",
      href: "https://www.linkedin.com/in/kashifnazir/",
      external: true,
    },
    { label: "HOW THIS WAS MADE", href: "/ouroboros", external: false },
    { label: "REPO", href: "https://github.com/thekashifnazir/surfdeck", external: true },
  ];

  const linkMarkup = links
    .map((link) => {
      const attrs = link.external
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
      return `<a class="site-footer__link" href="${link.href}"${attrs}>${link.label}</a>`;
    })
    .join("\n        ");

  return `<footer class="site-footer">
    <div class="site-footer__top">
      <div class="site-footer__id">
        <span class="site-footer__name">Kashif Nazir</span>
        <span class="site-footer__role">Senior Technical Architect</span>
      </div>
      <nav class="site-footer__links" aria-label="Author links">
        ${linkMarkup}
      </nav>
    </div>
    <div class="site-footer__base">
      <span>© 2026 Kashif Nazir</span>
      <span class="site-footer__doto">SURFDECK — BUILT END-TO-END BY AI IN KIRO</span>
    </div>
  </footer>`;
}
