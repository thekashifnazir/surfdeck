import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Telly, { type TellyProps } from "./components/Telly";
import { computeEmbedViewport } from "./embed-viewport";

/**
 * Telly iframe/embed behaviour tests — Cycle 6, Phase D (task 19).
 *
 * These run in the default (node) test environment — no DOM renderer is
 * installed (and no new deps are permitted per Requirement 10.1). Two
 * complementary techniques are used, matching the patterns already in the
 * codebase:
 *
 *  1. renderToStaticMarkup (as in ProvenanceCard.test.ts) for asserting the
 *     rendered HTML: iframe attributes, fallback text, and button visibility.
 *  2. Source inspection (as in TellyMenu.test.ts) for the pop-out button's
 *     onClick handler — renderToStaticMarkup strips event handlers, and there
 *     is no DOM renderer to fire a synthetic click, so the window.open contract
 *     is verified against the component source.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 2.2, 2.5, 4.2
 */

/** The Telly component source — for handler-wiring assertions. */
const TELLY_SOURCE = readFileSync(
  resolve(__dirname, "components", "Telly.tsx"),
  "utf-8"
);

// ─── Base props ───────────────────────────────────────────────────────────

/** Build a full set of TellyProps, overridable per test. */
function makeProps(overrides: Partial<TellyProps> = {}): TellyProps {
  return {
    zapState: "tuned",
    isFirstSurf: true,
    channelNumber: 217,
    status: "ok",
    embeddedUrl: null,
    siteUrl: null,
    menuOpen: false,
    cornerMode: false,
    selectedCharacter: null,
    onCharacterChange: () => {},
    buildFilters: { stacks: [], hosts: [], static_or_dynamic: [] },
    onSelectionChange: () => {},
    availableFilters: {
      stacks: [],
      hosts: [],
      static_or_dynamic: [],
      corner_tiers: [],
    },
    selectedTiers: [],
    onTierChange: () => {},
    onClearAll: () => {},
    ...overrides,
  };
}

/** Render the Telly to an HTML string for attribute/text assertions. */
function renderTelly(overrides: Partial<TellyProps> = {}): string {
  return renderToStaticMarkup(createElement(Telly, makeProps(overrides)));
}

/**
 * The fallback copy contains an apostrophe, which React escapes to &#x27; in
 * static markup. Assert on the two apostrophe-free halves instead. The fallback
 * is now a big titled button: the site name renders in one span and the
 * "won't tune in …" line in another.
 */
const FALLBACK_HEAD = "won";
const FALLBACK_TAIL = "t tune in — press to open it across the room";

// ─── Requirement 1.3–1.6: iframe attributes when embedded + tuned ───────────

describe("Telly iframe rendering (embedded + tuned)", () => {
  const EMBED_URL = "https://embed.example.com";

  it("renders an iframe when embeddedUrl is set and zapState is tuned", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain("<iframe");
    expect(html).toContain(EMBED_URL);
  });

  it("sets the sandbox attribute with the exact required token set", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain(
      'sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"'
    );
  });

  it("does NOT include any allow-top-navigation variant in the sandbox", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).not.toContain("allow-top-navigation");
  });

  it('sets referrerpolicy to "no-referrer"', () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    // React lowercases referrerPolicy to referrerpolicy in the DOM output.
    expect(html).toMatch(/referrerpolicy="no-referrer"/i);
  });

  it("has no allow attribute (no Permissions-Policy delegation)", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    // Guard against an `allow="..."` attribute; `sandbox`/`allow-*` tokens are
    // fine, but a standalone `allow=` must not be present.
    expect(html).not.toMatch(/\sallow="/);
  });

  it("does NOT render an iframe while zapping (ceremony still playing)", () => {
    const html = renderTelly({ zapState: "zapping", embeddedUrl: EMBED_URL });
    expect(html).not.toContain("<iframe");
  });

  it("does NOT render an iframe when idle", () => {
    const html = renderTelly({ zapState: "idle", embeddedUrl: EMBED_URL });
    expect(html).not.toContain("<iframe");
  });
});

// ─── D.1 change 1/2: loading static + no CH bleed-through ────────────────────
//
// On the server render the iframe has not fired onLoad, so the component is in
// its "embed loading" state: the animated-static layer is present and the
// channel readout must be suppressed so nothing bleeds through the frame.

describe("Telly embed loading state (static + no bleed-through)", () => {
  const EMBED_URL = "https://embed.example.com";

  it("renders the loading-static layer while the embed is loading", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain("telly__embed-static");
  });

  it("does NOT show the CH readout behind a loading/showing embed", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: EMBED_URL,
      channelNumber: 217,
    });
    expect(html).not.toContain("telly__channel");
    expect(html).not.toContain("CH 217");
  });

  it("still shows the CH readout in a plain tuned channel (no embed)", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      channelNumber: 217,
      status: null,
    });
    expect(html).toContain("telly__channel");
    expect(html).toContain("CH 217");
  });

  it("does NOT render the loading-static layer when there is no embed", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      status: null,
    });
    expect(html).not.toContain("telly__embed-static");
  });

  it("gives the embed screen a dark backdrop (no tuned off-white bleed-through)", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain("telly__screen--embed");
    expect(html).not.toContain("telly__screen--tuned");
  });

  it("keeps the loading-static layer decorative (aria-hidden)", () => {
    // Source guard: the static layer must not be exposed to assistive tech.
    expect(TELLY_SOURCE).toMatch(
      /className="telly__embed-static"\s+aria-hidden="true"/
    );
  });
});

// ─── D.1 change 3: pop-out reads as a labelled button ────────────────────────

describe("Telly pop-out button (labelled coral control)", () => {
  const EMBED_URL = "https://embed.example.com";

  it("renders a visible POP OUT label alongside the icon", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain("telly__popout-label");
    expect(html).toContain("POP OUT");
  });

  it("keeps an accessible label on the pop-out button", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toMatch(/aria-label="Open this site in a new tab"/);
  });
});

// ─── Requirement 4.2: non-embeddable fallback text ──────────────────────────

describe("Telly fallback state (non-embeddable, tuned)", () => {
  const SITE_URL = "https://open.web";

  it("renders the pressable fallback when embeddedUrl is null and tuned after a surf", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      siteUrl: SITE_URL,
      siteTitle: "Smashing Magazine",
      status: "ok",
    });
    expect(html).toContain(FALLBACK_HEAD);
    expect(html).toContain(FALLBACK_TAIL);
    expect(html).not.toContain("<iframe");
  });

  it("shows the caught site's title on the fallback button", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      siteUrl: SITE_URL,
      siteTitle: "Smashing Magazine",
      status: "ok",
    });
    expect(html).toMatch(
      /<span[^>]*class="telly__fallback-name"[^>]*>Smashing Magazine<\/span>/
    );
  });

  it("renders the fallback as a real <button>, not a static span", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      siteUrl: SITE_URL,
      status: "ok",
    });
    // The fallback element carries the class on a <button>.
    expect(html).toMatch(/<button[^>]*class="telly__screen--fallback"/);
  });

  it("does NOT show the fallback when idle (no surf attempted)", () => {
    const html = renderTelly({
      zapState: "idle",
      embeddedUrl: null,
      status: null,
    });
    expect(html).not.toContain(FALLBACK_TAIL);
  });

  it("does NOT show the fallback on a no_match result", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      status: "no_match",
    });
    expect(html).not.toContain(FALLBACK_TAIL);
  });
});

// ─── Requirement 4.2: pressing the fallback opens the site in a new tab ──────
//
// renderToStaticMarkup strips event handlers, so the fallback's onClick
// contract is asserted against the component source (the pattern the pop-out
// tests below and TellyMenu.test.ts use for handler wiring).

describe("Telly fallback press wiring", () => {
  it("wires the fallback button onClick to window.open(fallbackUrl, '_blank')", () => {
    expect(TELLY_SOURCE).toContain('window.open(fallbackUrl, "_blank")');
  });

  it("guards the fallback open so a null URL never triggers a stray tab", () => {
    expect(TELLY_SOURCE).toMatch(/if\s*\(fallbackUrl\)\s*window\.open/);
  });

  it("derives the fallback URL from the embed URL then the surfed site URL", () => {
    // Load-failure reuses the embed URL; non-embeddable uses the site URL.
    expect(TELLY_SOURCE).toMatch(
      /const\s+fallbackUrl\s*=\s*embeddedUrl\s*\?\?\s*siteUrl\s*\?\?\s*null/
    );
  });
});

// ─── Requirement 1.9: 5-second load-failure timer swaps to the fallback ──────
//
// The timer relies on setTimeout + iframe onload, which cannot be observed via
// renderToStaticMarkup (no DOM, no event loop for the iframe load). The timer
// contract is asserted against the component source.

describe("Telly load-failure timer (embed that never renders)", () => {
  it("arms a 5-second load-failure timer", () => {
    expect(TELLY_SOURCE).toContain("LOAD_FAILURE_TIMEOUT_MS = 5000");
    expect(TELLY_SOURCE).toMatch(
      /setTimeout\(\s*\(\)\s*=>\s*setLoadFailed\(true\)\s*,\s*LOAD_FAILURE_TIMEOUT_MS\s*\)/
    );
  });

  it("clears the timer when the iframe reports load (onload sets loaded)", () => {
    // The timer effect bails out once iframeLoaded flips true (cleanup clears
    // the pending timeout), and the iframe's onLoad sets that flag.
    expect(TELLY_SOURCE).toMatch(/if\s*\(!showIframe\s*\|\|\s*iframeLoaded\)\s*return/);
    expect(TELLY_SOURCE).toContain("onLoad={() => setIframeLoaded(true)}");
  });

  it("does NOT treat onload as proof of render — the timer still governs failure", () => {
    // loadFailed drives the fallback swap independently of iframeLoaded.
    expect(TELLY_SOURCE).toMatch(/const\s+showIframe\s*=\s*tuned\s*&&\s*Boolean\(embeddedUrl\)\s*&&\s*!loadFailed/);
    expect(TELLY_SOURCE).toMatch(/tuned\s*&&\s*Boolean\(embeddedUrl\)\s*&&\s*loadFailed/);
  });

  it("hides the pop-out button once the fallback takes over on load failure", () => {
    // The pop-out is gated on showIframe, which is false once loadFailed.
    const popoutIdx = TELLY_SOURCE.indexOf("{showIframe && (");
    expect(popoutIdx).toBeGreaterThan(-1);
  });
});

// ─── Requirement 2.1, 2.5: pop-out button visibility ────────────────────────

describe("Telly pop-out button visibility", () => {
  const EMBED_URL = "https://embed.example.com";

  it("renders the pop-out button when a site is embedded", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain("telly__popout");
  });

  it("hides the pop-out button in the idle state", () => {
    const html = renderTelly({ zapState: "idle", embeddedUrl: null });
    expect(html).not.toContain("telly__popout");
  });

  it("hides the pop-out button in the non-embeddable fallback state", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: null,
      status: "ok",
    });
    expect(html).not.toContain("telly__popout");
  });
});

// ─── D.1 follow-up: pop-out lives on the bezel below the screen ──────────────
//
// The pop-out moved off the screen onto the dark bezel (below the screen,
// right-aligned) so it never overlaps the embedded site's content.

describe("Telly pop-out placement (bezel below the screen)", () => {
  const EMBED_URL = "https://embed.example.com";

  it("wraps the pop-out in a bezel element", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    expect(html).toContain("telly__bezel");
    // The bezel wraps the pop-out button.
    expect(html).toMatch(
      /class="telly__bezel"[^>]*>\s*<button[^>]*class="telly__popout"/
    );
  });

  it("renders the bezel/pop-out AFTER the screen (below it, not overlapping)", () => {
    const html = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL });
    const screenIdx = html.indexOf('class="telly__screen');
    const bezelIdx = html.indexOf('class="telly__bezel"');
    expect(screenIdx).toBeGreaterThan(-1);
    expect(bezelIdx).toBeGreaterThan(screenIdx);
  });

  it("no longer positions the pop-out absolutely (bezel is normal flow)", () => {
    // The CSS pins the bezel in normal flow; guard the source markup structure
    // so a regression to an absolutely-positioned on-screen button is caught.
    expect(TELLY_SOURCE).toMatch(/<div className="telly__bezel">/);
  });

  it("hides the bezel (and pop-out) when not embedded", () => {
    const html = renderTelly({ zapState: "idle", embeddedUrl: null });
    expect(html).not.toContain("telly__bezel");
  });
});

// ─── Requirement 2.2: clicking the pop-out calls window.open(url, '_blank') ──
//
// renderToStaticMarkup strips event handlers and no DOM renderer is available,
// so the onClick contract is asserted against the component source (the same
// approach TellyMenu.test.ts uses for handler wiring). The behaviour of the
// handler closure itself is exercised directly below.

describe("Telly pop-out button click wiring", () => {
  it("wires the pop-out button's onClick to window.open(url, '_blank')", () => {
    // The handler opens the embedded URL in a new tab.
    expect(TELLY_SOURCE).toContain('window.open(embeddedUrl, "_blank")');
  });

  it("attaches the onClick to the .telly__popout button", () => {
    const popoutIdx = TELLY_SOURCE.indexOf('className="telly__popout"');
    expect(popoutIdx).toBeGreaterThan(-1);
    // The window.open call lives within the same button element block.
    const buttonBlock = TELLY_SOURCE.slice(popoutIdx, popoutIdx + 400);
    expect(buttonBlock).toContain("onClick");
    expect(buttonBlock).toContain('window.open(embeddedUrl, "_blank")');
  });

  it("opens a blank target ('_blank'), matching the new-tab contract", () => {
    // Guard the exact second argument so a regression to '_self' is caught.
    expect(TELLY_SOURCE).toMatch(/window\.open\(\s*embeddedUrl\s*,\s*"_blank"\s*\)/);
  });

  it("only calls window.open when an embedded URL is present", () => {
    // The handler is guarded so a null URL never triggers a stray tab.
    expect(TELLY_SOURCE).toMatch(/if\s*\(embeddedUrl\)\s*window\.open/);
  });
});

// ─── D.1: nothing steals scrolling from the embedded iframe ──────────────────
//
// Browsers give the parent page no way to scroll a cross-origin iframe, so we
// don't try. Instead we guard that nothing we render sits above the iframe
// while the menu is closed — the closed OSD is non-interactive (pointer-events
// only when open), so pointer/wheel/touch over the screen reach the embedded
// site. (The pointer-events rule lives in CSS; here we guard the structure.)

describe("Telly embedded iframe scrolling is not stolen", () => {
  const EMBED_URL = "https://embed.example.com";

  it("renders the iframe with no bezel rocker or scroll overlay over it", () => {
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: EMBED_URL,
      menuOpen: false,
    });
    expect(html).toContain("<iframe");
    // No leftover rocker machinery sitting above the frame.
    expect(html).not.toContain("telly__rocker");
  });

  it("keeps the closed OSD in the tree but non-interactive (no --open)", () => {
    // The OSD is always present but only gains pointer-events via .osd--open.
    const html = renderTelly({
      zapState: "tuned",
      embeddedUrl: EMBED_URL,
      menuOpen: false,
    });
    expect(html).toContain('class="osd"');
    expect(html).not.toContain("osd--open");
  });
});

// ─── Task 25 / Requirements 8.4, 8.5, 9.3: embedded virtual viewport ────────
//
// The Telly measures `.telly__screen` via a ResizeObserver, stores the size in
// state, and feeds it to the pure `computeEmbedViewport(...)` to build the
// iframe's inline width/height/transform. Only those style props derive from
// the measured size — src/sandbox/referrerPolicy/title/onLoad do not — so a
// size change updates the *same* iframe element in place rather than remounting
// it (which would reload the embedded site).
//
// The test env is node with no DOM renderer (react-dom/server only) and no new
// deps are permitted (Requirement 9), so effects (ResizeObserver → state) never
// fire under renderToStaticMarkup. As elsewhere in this file, the effect- and
// state-driven contract is asserted against the component source, and the
// derived numeric values are pinned with the pure function itself.

describe("Telly embed viewport — style derived from computeEmbedViewport", () => {
  it("measures .telly__screen with a ResizeObserver that only writes to state", () => {
    // The observer stores the measured size; it never touches the iframe, so
    // resizing cannot remount/reload the frame — it only re-derives style.
    expect(TELLY_SOURCE).toContain("new ResizeObserver");
    expect(TELLY_SOURCE).toMatch(/observer\.observe\(el\)/);
    expect(TELLY_SOURCE).toMatch(/const\s*\{\s*width,\s*height\s*\}\s*=\s*entry\.contentRect/);
    expect(TELLY_SOURCE).toMatch(/setScreenSize\(\{\s*width,\s*height\s*\}\)/);
  });

  it("feeds the measured screen size into computeEmbedViewport", () => {
    expect(TELLY_SOURCE).toMatch(
      /computeEmbedViewport\(\s*screenSize\.width,\s*screenSize\.height\s*\)/
    );
  });

  it("builds iframeStyle = { width, height, transform: scale(...), transformOrigin } from the viewport", () => {
    // The exact mapping the component uses. Pinning it here keeps the runtime
    // value assertions below faithful to what the component actually renders.
    expect(TELLY_SOURCE).toMatch(/width:\s*`\$\{embedViewport\.iframeWidth\}px`/);
    expect(TELLY_SOURCE).toMatch(/height:\s*`\$\{embedViewport\.iframeHeight\}px`/);
    expect(TELLY_SOURCE).toMatch(/transform:\s*`scale\(\$\{embedViewport\.scale\}\)`/);
    expect(TELLY_SOURCE).toMatch(/transformOrigin:\s*"0 0"/);
  });

  it("passes the derived iframeStyle to the iframe's style prop", () => {
    expect(TELLY_SOURCE).toMatch(/style=\{iframeStyle\}/);
  });

  it("derives desktop values (screen 1280×158 → 1280px / 158px / scale(1))", () => {
    // Reproduce the component's exact style construction from the pure fn.
    const vp = computeEmbedViewport(1280, 158);
    const style = {
      width: `${vp.iframeWidth}px`,
      height: `${vp.iframeHeight}px`,
      transform: `scale(${vp.scale})`,
      transformOrigin: "0 0",
    };
    expect(style.width).toBe("1280px");
    expect(style.height).toBe("158px");
    expect(style.transform).toBe("scale(1)");
    expect(style.transformOrigin).toBe("0 0");
  });

  it("derives narrow/mobile values (screen 390×200 → 980px wide, scaled to fit)", () => {
    // Below the 480px breakpoint the frame lays out at the 980px virtual width.
    const vp = computeEmbedViewport(390, 200);
    const style = {
      width: `${vp.iframeWidth}px`,
      height: `${vp.iframeHeight}px`,
      transform: `scale(${vp.scale})`,
    };
    expect(style.width).toBe("980px");
    expect(vp.scale).toBeCloseTo(390 / 980, 10);
    expect(style.transform).toBe(`scale(${390 / 980})`);
    // Scaled dimensions exactly fill the measured screen.
    expect(vp.iframeWidth * vp.scale).toBeCloseTo(390, 6);
    expect(vp.iframeHeight * vp.scale).toBeCloseTo(200, 6);
  });

  it("leaves iframeStyle undefined until a size is measured (guards a 0×0 render)", () => {
    // With no measurement (effects unfired), the iframe renders without inline
    // sizing rather than collapsing to scale(0) — style is only built once a
    // positive screen size is in state.
    expect(TELLY_SOURCE).toMatch(
      /screenSize && screenSize\.width > 0 && screenSize\.height > 0/
    );
    expect(TELLY_SOURCE).toMatch(/:\s*undefined;/);
    const html = renderTelly({ zapState: "tuned", embeddedUrl: "https://embed.example.com" });
    expect(html).toContain("<iframe");
  });
});

describe("Telly embed viewport — iframe is not remounted on resize", () => {
  const EMBED_URL = "https://embed.example.com";

  it("does not key the iframe on the screen size (no key ⇒ no remount)", () => {
    // Locate the iframe element in source and confirm it carries no `key`
    // prop — React would otherwise treat a size-change as a new element.
    const iframeIdx = TELLY_SOURCE.indexOf('title="Embedded channel"');
    expect(iframeIdx).toBeGreaterThan(-1);
    const iframeBlock = TELLY_SOURCE.slice(iframeIdx - 40, iframeIdx + 500);
    expect(iframeBlock).not.toMatch(/\bkey=/);
  });

  it("derives ONLY the style prop from the measured size (identity-stable attrs)", () => {
    // src/sandbox/referrerPolicy/title/onLoad must not reference the measured
    // size or the viewport — otherwise a resize would change identity-relevant
    // attributes and could force a reload.
    const iframeIdx = TELLY_SOURCE.indexOf('title="Embedded channel"');
    const iframeBlock = TELLY_SOURCE.slice(iframeIdx, iframeIdx + 500);
    for (const attr of ["src=", "sandbox=", "referrerPolicy=", "title=", "onLoad="]) {
      const line = iframeBlock
        .split("\n")
        .find((l) => l.includes(attr)) ?? "";
      expect(line).not.toContain("screenSize");
      expect(line).not.toContain("embedViewport");
      expect(line).not.toContain("iframeStyle");
    }
  });

  it("documents that only style props change on resize (no remount comment)", () => {
    // The component explicitly states the invariant; guard it so a refactor
    // that reintroduces a remount is caught.
    expect(TELLY_SOURCE).toMatch(/never remounted|no remount/i);
  });

  it("keeps sandbox/referrerpolicy identical regardless of embed props (size-independent)", () => {
    // renderToStaticMarkup can't fire the resize effect, but it proves these
    // attributes are static literals: they are byte-for-byte identical across
    // independent renders (a stand-in for "unchanged by resizing").
    const a = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL, isFirstSurf: true });
    const b = renderTelly({ zapState: "tuned", embeddedUrl: EMBED_URL, isFirstSurf: false });
    const sandbox =
      'sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"';
    expect(a).toContain(sandbox);
    expect(b).toContain(sandbox);
    expect(a).toMatch(/referrerpolicy="no-referrer"/i);
    expect(b).toMatch(/referrerpolicy="no-referrer"/i);
  });
});
