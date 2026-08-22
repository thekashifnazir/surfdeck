/**
 * Unit tests for /ouroboros route
 *
 * Feature: vibecoded-corner, Task 5.3 (colophon/link assertions)
 * Extended in Final Cut task 30 with Dead Air copy, ladder rungs, stat-card
 * numbers (from the build-time constants), and inlined footer links.
 * Validates: Requirements 12.3, 4.8, 5.1, 9.3
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { ouroborosRoute } from "./ouroboros.js";
import {
  SPEC_COUNT,
  HOOK_COUNT,
  TEST_COUNT,
  LOG_COUNT,
} from "../colophon-stats.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a test app with the ouroboros route mounted at root */
function createApp() {
  const app = new Hono();
  app.route("", ouroborosRoute);
  return app;
}

/** Fetch the rendered /ouroboros HTML once. */
async function fetchBody(): Promise<string> {
  const res = await createApp().request("/ouroboros");
  return res.text();
}

// ---------------------------------------------------------------------------
// Existing colophon/link assertions (kept green)
// ---------------------------------------------------------------------------

describe("/ouroboros route", () => {
  it("returns 200 with Content-Type text/html", async () => {
    const app = createApp();
    const res = await app.request("/ouroboros");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("response body contains required colophon text", async () => {
    const app = createApp();
    const res = await app.request("/ouroboros");
    const body = await res.text();

    expect(body).toContain(
      "You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner."
    );
  });

  it("response body contains a link", async () => {
    const app = createApp();
    const res = await app.request("/ouroboros");
    const body = await res.text();

    expect(body).toContain('<a href="https://github.com/thekashifnazir/surfdeck"');
  });
});

// ---------------------------------------------------------------------------
// Dead Air shell copy
// ---------------------------------------------------------------------------

describe("/ouroboros — Dead Air copy", () => {
  it("shows the 'loop closes' header and Dead Air readouts", async () => {
    const body = await fetchBody();

    expect(body).toContain("The loop closes.");
    expect(body).toContain("— DEAD AIR —");
    expect(body).toContain(
      "you've tuned into the set itself. press SURF to get back out there."
    );
  });
});

// ---------------------------------------------------------------------------
// Navigation affordances — real SURF key + linked wordmark (way back to "/")
// ---------------------------------------------------------------------------

describe("/ouroboros — way back to the set", () => {
  it("renders a real SURF key that points home", async () => {
    const body = await fetchBody();

    expect(body).toContain('<a href="/" class="deadair-surf"');
    expect(body).toContain('aria-label="Surf — back to Surfdeck"');
    // Visible text label
    expect(body).toContain(">SURF</a>");
  });

  it("links the self-portrait wordmark home", async () => {
    const body = await fetchBody();

    expect(body).toContain(
      '<a href="/" class="selfportrait__wordmark">Surfdeck</a>'
    );
  });
});

// ---------------------------------------------------------------------------
// The ladder — five rungs bottom-up (TIER 4 top → BY HAND bottom)
// ---------------------------------------------------------------------------

describe("/ouroboros — the ladder", () => {
  it("renders the ladder header + subtitle", async () => {
    const body = await fetchBody();

    expect(body).toContain("— THE LADDER —");
    expect(body).toContain(
      "every site in the corner sits on a rung. pick yours and make one."
    );
  });

  it("renders all five rung markers", async () => {
    const body = await fetchBody();

    for (const marker of ["TIER 4", "TIER 3", "TIER 2", "TIER 1", "BY HAND"]) {
      expect(body).toContain(`<p class="rung__marker">${marker}</p>`);
    }
  });

  it("orders rungs bottom-up: TIER 4 top → BY HAND bottom", async () => {
    const body = await fetchBody();

    const idx = (marker: string) =>
      body.indexOf(`<p class="rung__marker">${marker}</p>`);

    expect(idx("TIER 4")).toBeLessThan(idx("TIER 3"));
    expect(idx("TIER 3")).toBeLessThan(idx("TIER 2"));
    expect(idx("TIER 2")).toBeLessThan(idx("TIER 1"));
    expect(idx("TIER 1")).toBeLessThan(idx("BY HAND"));
  });

  it("marks TIER 4 as Surfdeck's rung with a coral badge", async () => {
    const body = await fetchBody();

    expect(body).toContain("rung rung--surfdeck");
    expect(body).toContain(`<span class="rung__badge">SURFDECK'S RUNG</span>`);
  });

  it("gives the BY HAND rung the comped copy + neocities link", async () => {
    const body = await fetchBody();

    expect(body).toContain("No tools at all");
    expect(body).toContain(
      "a text editor, one HTML file, a free host — the original way"
    );
    expect(body).toContain('href="https://neocities.org"');
  });
});

// ---------------------------------------------------------------------------
// Self-portrait stat card — numbers from build-time constants
// ---------------------------------------------------------------------------

describe("/ouroboros — self-portrait stat card", () => {
  it("renders the self-portrait badge, title, and catch line", async () => {
    const body = await fetchBody();

    expect(body).toContain("SELF-PORTRAIT");
    expect(body).toContain("CATCH № 349 · THE ONE THAT CAUGHT ITSELF");
  });

  it("renders stats from the build-time constants (LOG_COUNT as {n}+)", async () => {
    const body = await fetchBody();

    expect(body).toContain(
      `${SPEC_COUNT} Kiro specs · ${HOOK_COUNT} agent hooks · ${TEST_COUNT} tests · ${LOG_COUNT}+ process-log entries`
    );
    // LOG_COUNT must be the {n}+ form, never a bare number followed by " process-log".
    expect(body).toContain(`${LOG_COUNT}+ process-log entries`);
    expect(body).not.toContain(`${LOG_COUNT} process-log entries`);
  });
});

// ---------------------------------------------------------------------------
// Inlined footer (mirror of Footer.tsx, design §5.2)
// ---------------------------------------------------------------------------

describe("/ouroboros — footer", () => {
  it("renders the footer with coral top rule + id block", async () => {
    const body = await fetchBody();

    expect(body).toContain('<footer class="site-footer">');
    expect(body).toContain('<span class="site-footer__name">Kashif Nazir</span>');
    expect(body).toContain(
      '<span class="site-footer__role">Senior Technical Architect</span>'
    );
  });

  it("renders all five footer links with correct hrefs", async () => {
    const body = await fetchBody();

    const expected: Array<[string, string]> = [
      ["KASHIFNAZIR.COM", "https://kashifnazir.com"],
      ["GITHUB", "https://github.com/thekashifnazir"],
      ["LINKEDIN", "https://www.linkedin.com/in/kashifnazir/"],
      ["HOW THIS WAS MADE", "/ouroboros"],
      ["REPO", "https://github.com/thekashifnazir/surfdeck"],
    ];

    for (const [label, href] of expected) {
      expect(body).toContain(`href="${href}"`);
      expect(body).toContain(`>${label}</a>`);
    }
  });

  it("renders the footer links in order", async () => {
    const body = await fetchBody();

    const order = [
      "KASHIFNAZIR.COM",
      "GITHUB",
      "LINKEDIN",
      "HOW THIS WAS MADE",
      "REPO",
    ];
    const positions = order.map((label) => body.indexOf(`>${label}</a>`));

    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("opens external links in a new tab but keeps /ouroboros same-origin", async () => {
    const body = await fetchBody();

    // "HOW THIS WAS MADE" is same-origin: no target/rel.
    expect(body).toContain(
      '<a class="site-footer__link" href="/ouroboros">HOW THIS WAS MADE</a>'
    );
    // External links carry the new-tab + noopener attributes.
    expect(body).toContain(
      '<a class="site-footer__link" href="https://kashifnazir.com" target="_blank" rel="noopener noreferrer">KASHIFNAZIR.COM</a>'
    );
  });

  it("renders the © line + Doto build tagline", async () => {
    const body = await fetchBody();

    expect(body).toContain("© 2026 Kashif Nazir");
    expect(body).toContain(
      '<span class="site-footer__doto">SURFDECK — BUILT END-TO-END BY AI IN KIRO</span>'
    );
  });
});
