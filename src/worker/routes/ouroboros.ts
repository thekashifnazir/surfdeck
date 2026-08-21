/**
 * /ouroboros route — standalone colophon HTML page.
 * Surfdeck is exhibit #1 in its own vibecoded corner.
 * Served as a standalone page (not the SPA) so it works when
 * opened in a new tab from surf, like any other site URL.
 */

import { Hono } from "hono";

export const ouroborosRoute = new Hono();

ouroborosRoute.get("/ouroboros", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#F2F0E9">
  <title>Surfdeck — The Ouroboros</title>
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
      --screen: #191916;
      --font-body: 'Familjen Grotesk', 'Arial', sans-serif;
      --font-lcd: 'Doto', 'Courier New', monospace;
      --font-card: 'Special Elite', 'Courier New', monospace;
    }

    * { box-sizing: border-box; }

    body {
      font-family: var(--font-body);
      max-width: 600px;
      margin: 4rem auto;
      padding: 0 1.5rem;
      line-height: 1.6;
      background: var(--bg);
      color: var(--ink);
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 2rem 0 0.5rem;
    }

    p { color: var(--body-grey); }

    a { color: var(--coral); }

    /* Ouroboros container */
    .ouroboros {
      width: 200px;
      height: 200px;
      margin: 2rem auto;
      position: relative;
    }

    /* Pixel cells forming the ring */
    .ouroboros__cell {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 2px;
      background: var(--caption-grey);
      opacity: 0.4;
    }

    .ouroboros__cell--head {
      background: var(--coral);
      opacity: 1;
      animation: snake-advance 8s steps(24) infinite;
    }

    /* Generate ring positions via inline styles in the HTML */

    @keyframes snake-advance {
      0% { opacity: 1; }
      4% { opacity: 1; }
      4.1% { opacity: 0.4; background: var(--caption-grey); }
      100% { opacity: 0.4; background: var(--caption-grey); }
    }

    /* The real animation: rotate the highlight around */
    .ouroboros__ring {
      width: 100%;
      height: 100%;
      position: relative;
      animation: ring-rotate 8s linear infinite;
    }

    @keyframes ring-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Provenance card */
    .prov-card {
      background: #fff;
      border: 2px solid #26262A;
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 16px 20px 14px;
      font-family: var(--font-card);
      position: relative;
      box-shadow: 0 4px 8px rgba(38,38,42,.12);
      margin: 2rem 0;
    }

    .prov-card__heading {
      font-family: var(--font-body);
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--caption-grey);
      margin: 0 0 0.75rem;
    }

    .prov-card__body {
      font-size: 1rem;
      color: var(--ink);
      margin: 0 0 0.75rem;
      line-height: 1.5;
    }

    .prov-card__footer {
      font-family: var(--font-body);
      font-size: 0.75rem;
      color: var(--caption-grey);
      margin: 0;
      font-style: italic;
    }

    .prov-card__stamp {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-family: var(--font-body);
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--coral);
      border: 1.5px solid var(--coral);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      transform: rotate(-4deg);
    }

    /* Telly frame around ouroboros */
    .telly-frame {
      background: #26262A;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 6px 0 #141416;
      margin: 2rem auto;
      max-width: 320px;
    }

    .telly-screen {
      background: var(--bg);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      aspect-ratio: 4/3;
    }

    @media (prefers-reduced-motion: reduce) {
      .ouroboros__ring {
        animation: none;
      }
      .ouroboros__cell--head {
        animation: none;
        opacity: 1;
        background: var(--coral);
      }
    }
  </style>
</head>
<body>
  <h1>The loop closes.</h1>
  <p>You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner.</p>

  <!-- Telly showing the ouroboros -->
  <div class="telly-frame">
    <div class="telly-screen">
      <div class="ouroboros" aria-label="Dot-matrix ouroboros — a ring of square pixels with an advancing coral head">
        <div class="ouroboros__ring">
          ${generateOuroborosCells()}
        </div>
      </div>
    </div>
  </div>

  <!-- Provenance card (349 must track CORPUS_TOTAL in ProvenanceCard.tsx) -->
  <div class="prov-card">
    <p class="prov-card__heading">HOW THIS SITE IS BUILT — CATCH № 349 OF 349</p>
    <p class="prov-card__body">CATCH № 349 OF 349 — the loop closes.</p>
    <p class="prov-card__footer">Everyone's a builder. Learn from the sites you like.</p>
    <span class="prov-card__stamp">OPENS IN NEW TAB</span>
  </div>

  <p><a href="https://github.com/thekashifnazir/surfdeck">View the repo &amp; process log</a></p>
</body>
</html>`;
  return c.html(html);
});

/**
 * Generates 24 square pixel cells arranged in a ring (circle).
 * One cell is marked as the "head" with coral highlight.
 */
function generateOuroborosCells(): string {
  const count = 24;
  const radius = 80; // px from center
  const center = 100; // center of the 200×200 container
  const cellSize = 12;
  const cells: string[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = center + radius * Math.cos(angle) - cellSize / 2;
    const y = center + radius * Math.sin(angle) - cellSize / 2;
    const isHead = i === 0;
    const className = `ouroboros__cell${isHead ? " ouroboros__cell--head" : ""}`;
    cells.push(`<div class="${className}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"></div>`);
  }

  return cells.join("\n          ");
}
