import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProvenanceCard from "./ProvenanceCard";
import type { SurfSite } from "../App";

/** Helper: render the ProvenanceCard to an HTML string for assertion. */
function renderCard(overrides: Partial<SurfSite> = {}, props: { cornerMode?: boolean; corpusTotal?: number; embedded?: boolean } = {}) {
  const site: SurfSite = {
    id: 42,
    url: "https://example.com",
    title: "Example Site",
    why_note: "A great example of hand-made web craft.",
    mood_tags: ["useful"],
    character: "modern_indie",
    stack: "nextjs",
    host: "vercel",
    static_or_dynamic: "static",
    built_with: null,
    embeddable: true,
    ...overrides,
  };

  const html = renderToStaticMarkup(
    createElement(ProvenanceCard, {
      site,
      cornerMode: props.cornerMode ?? false,
      corpusTotal: props.corpusTotal ?? 349,
      embedded: props.embedded,
    })
  );

  return html;
}

// ─── Stamp text (Requirement 6.7) ───

describe("ProvenanceCard stamp text", () => {
  it('renders "OPENS IN NEW TAB" when embedded is false', () => {
    const html = renderCard({}, { embedded: false });
    expect(html).toContain("OPENS IN NEW TAB");
    expect(html).not.toContain("OPENS IN TELLY");
  });

  it('renders "OPENS IN NEW TAB" when embedded prop is omitted (defaults to false)', () => {
    const html = renderCard({});
    expect(html).toContain("OPENS IN NEW TAB");
    expect(html).not.toContain("OPENS IN TELLY");
  });

  it('renders "OPENS IN TELLY" when embedded is true', () => {
    const html = renderCard({}, { embedded: true });
    expect(html).toContain("OPENS IN TELLY");
    expect(html).not.toContain("OPENS IN NEW TAB");
  });
});

// ─── Card content: title (Requirement 6.3) ───

describe("ProvenanceCard title", () => {
  it("renders the site title", () => {
    const html = renderCard({ title: "My Cool Site" });
    expect(html).toContain("My Cool Site");
  });

  it("renders the title in an element with the prov-card__title class", () => {
    const html = renderCard({ title: "Pixel Garden" });
    expect(html).toContain('class="prov-card__title"');
    expect(html).toContain("Pixel Garden");
  });
});

// ─── Card content: why-note (Requirement 6.4) ───

describe("ProvenanceCard why-note", () => {
  it("renders the why_note when present", () => {
    const html = renderCard({ why_note: "Beautiful typography and layout." });
    expect(html).toContain("Beautiful typography and layout.");
    expect(html).toContain('class="prov-card__why"');
  });

  it("does not render why-note element when why_note is empty", () => {
    const html = renderCard({ why_note: "" });
    expect(html).not.toContain("prov-card__why");
  });
});

// ─── Card content: dynamic corpus total (Requirement 6.6) ───

describe("ProvenanceCard dynamic corpus total", () => {
  it("renders the corpus total from the prop", () => {
    const html = renderCard({ id: 7 }, { corpusTotal: 349 });
    expect(html).toContain("CATCH №\u00a07 · ONE OF 349 HAND-PICKED SITES");
  });

  it("updates when corpus total changes", () => {
    const html = renderCard({ id: 100 }, { corpusTotal: 500 });
    expect(html).toContain("CATCH №\u00a0100 · ONE OF 500 HAND-PICKED SITES");
  });
});

// ─── Card content: catch number uses site ID ───

describe("ProvenanceCard catch number", () => {
  it("uses site.id for the catch number", () => {
    const html = renderCard({ id: 288 }, { corpusTotal: 349 });
    expect(html).toContain("CATCH №\u00a0288 · ONE OF 349 HAND-PICKED SITES");
  });
});

// ─── Heading by mode (Requirement 2.2) ───

describe("ProvenanceCard heading by mode", () => {
  it("open-web heading names the corpus total", () => {
    const html = renderCard({ id: 12 }, { cornerMode: false, corpusTotal: 349 });
    expect(html).toContain("CATCH №\u00a012 · ONE OF 349 HAND-PICKED SITES");
    expect(html).not.toContain("VIBECODED CORNER");
  });

  it("corner heading reads VIBECODED CORNER (no corpus total)", () => {
    const html = renderCard(
      { id: 12, built_with: "bolt" },
      { cornerMode: true, corpusTotal: 349 }
    );
    expect(html).toContain("CATCH №\u00a012 · VIBECODED CORNER");
    expect(html).not.toContain("HAND-PICKED SITES");
  });
});

// ─── Open-web linked tech line: stack/host anchors, type plain (Req 2.3–2.5) ───

describe("ProvenanceCard open-web tech line", () => {
  it("renders stack and host as prov-link anchors with the mapped href, new tab + noopener", () => {
    const html = renderCard(
      { stack: "react_spa", host: "netlify", static_or_dynamic: "static" },
      { cornerMode: false }
    );
    // stack anchor
    expect(html).toContain('href="https://react.dev"');
    expect(html).toContain(">React SPA</a>");
    // host anchor
    expect(html).toContain('href="https://www.netlify.com"');
    expect(html).toContain(">Netlify</a>");
    // link hardening + styling
    expect(html).toContain('class="prov-link"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders the type value (Static/Dynamic) as plain text, never an anchor", () => {
    const html = renderCard(
      { stack: "react_spa", host: "netlify", static_or_dynamic: "static" },
      { cornerMode: false }
    );
    expect(html).toContain("Static");
    // type must not be wrapped in an anchor
    expect(html).not.toContain(">Static</a>");
  });

  it("renders an unmapped stack/host as plain text (no broken link)", () => {
    // `self` has a provenance label but no URL in PROVENANCE_URLS.
    const html = renderCard(
      { stack: "self", host: "self", static_or_dynamic: null },
      { cornerMode: false }
    );
    expect(html).toContain("Self-hosted");
    expect(html).not.toContain(">Self-hosted</a>");
  });
});

// ─── Recipe line (Requirement 2.6) ───

describe("ProvenanceCard recipe line", () => {
  it("composes the recipe line from stack + host fragments joined by an em dash", () => {
    const html = renderCard(
      { stack: "static_html", host: "github_pages", static_or_dynamic: "static" },
      { cornerMode: false }
    );
    expect(html).toContain(
      "the recipe: written by hand, no tools — hosted free from a code repo"
    );
    expect(html).toContain('class="prov-card__recipe"');
  });

  it("omits the recipe line entirely when neither stack nor host has a fragment", () => {
    const html = renderCard(
      { stack: null, host: null, static_or_dynamic: "static" },
      { cornerMode: false }
    );
    expect(html).not.toContain("prov-card__recipe");
    expect(html).not.toContain("the recipe:");
  });
});

// ─── Corner tier line (Requirement 2.7) ───

describe("ProvenanceCard corner tier line", () => {
  it('renders "Built with {Tool} · Tier N — {canonical TIER_LABELS value}"', () => {
    const html = renderCard({ built_with: "bolt" }, { cornerMode: true });
    // tool is a link
    expect(html).toContain(">Bolt</a>");
    expect(html).toContain('href="https://bolt.new"');
    // tier number + canonical label, verbatim casing
    expect(html).toContain("Tier\u00a02 — AI app-builder");
  });

  it("prints the canonical TIER_LABELS value verbatim for all four tiers", () => {
    // One representative built_with per tier (per BUILT_WITH_TIER).
    const cases: Array<[string, string]> = [
      ["godaddy_airo", "Tier\u00a01 — No-code AI builder"],
      ["bolt", "Tier\u00a02 — AI app-builder"],
      ["cursor", "Tier\u00a03 — AI-assisted + hosted"],
      ["cloudflare_workers", "Tier\u00a04 — Developer cloud"],
    ];
    for (const [built_with, expected] of cases) {
      const html = renderCard({ built_with }, { cornerMode: true });
      expect(html).toContain(expected);
    }
  });
});

// ─── Footer copy + corner omission (Requirements 2.8, 2.9) ───

describe("ProvenanceCard footer", () => {
  it("open-web renders the dashed divider + learn footer", () => {
    const html = renderCard({}, { cornerMode: false });
    expect(html).toContain('class="prov-card__divider"');
    expect(html).toContain("Learn from this one");
    expect(html).toContain("tap the underlined parts.");
  });

  it("corner mode omits the generic footer and divider", () => {
    const html = renderCard({ built_with: "bolt" }, { cornerMode: true });
    expect(html).not.toContain("prov-card__footer");
    expect(html).not.toContain("prov-card__divider");
    expect(html).not.toContain("tap the underlined parts.");
  });
});

// ─── All-blank fallback + no "unknown" (Requirements 9.2, 9.6) ───

describe("ProvenanceCard all-blank fallback", () => {
  it('falls back to "Hand-made on the open web." when stack/host/type are all null', () => {
    const html = renderCard(
      { stack: null, host: null, static_or_dynamic: null },
      { cornerMode: false }
    );
    expect(html).toContain("Hand-made on the open web.");
    expect(html).toContain("prov-card__body--fallback");
  });

  it('treats the literal "unknown" as blank and never renders the string "unknown"', () => {
    const html = renderCard(
      { stack: "unknown", host: "unknown", static_or_dynamic: "unknown", built_with: null },
      { cornerMode: false }
    );
    expect(html).toContain("Hand-made on the open web.");
    expect(html).not.toContain("unknown");
  });

  it('corner mode with unknown built_with never renders "unknown"', () => {
    const html = renderCard(
      { built_with: "unknown", stack: null, host: null, static_or_dynamic: null },
      { cornerMode: true }
    );
    expect(html).not.toContain("unknown");
  });
});

// ─── MAKE ONE YOURSELF block — corner mode (Requirements 3.x) ───

describe("ProvenanceCard MAKE ONE YOURSELF — corner mode", () => {
  it("renders the tier-keyed block when built_with is mapped in the tool map", () => {
    const html = renderCard({ built_with: "bolt" }, { cornerMode: true });
    expect(html).toContain("MAKE ONE YOURSELF");
    // tier-2 lead line
    expect(html).toContain("This site was prompted together in the browser. Try");
    // tool link inside the lead
    expect(html).toContain('href="https://bolt.new"');
    expect(html).toContain(">Bolt</a>");
    // time cue
    expect(html).toContain("prompt in the browser · free to start · a site by tonight");
  });

  it("omits the block when built_with is unmapped in the tool map", () => {
    // squarespace_ai has a tier + label but no TOOL_MAP entry.
    const html = renderCard({ built_with: "squarespace_ai" }, { cornerMode: true });
    // tech line still renders the tool name (as plain text, no link)...
    expect(html).toContain("Squarespace AI");
    expect(html).not.toContain(">Squarespace AI</a>");
    // ...but the MAKE ONE YOURSELF block is omitted (no tool info).
    expect(html).not.toContain("MAKE ONE YOURSELF");
  });
});

// ─── MAKE ONE YOURSELF block — open-web mode (Requirements 3.x) ───

describe("ProvenanceCard MAKE ONE YOURSELF — open-web mode", () => {
  it("stack-present path names the stack and links Start yours → to the stack URL", () => {
    const html = renderCard(
      { stack: "nextjs", host: "vercel", static_or_dynamic: "static" },
      { cornerMode: false }
    );
    expect(html).toContain("MAKE ONE YOURSELF");
    expect(html).toContain("This site was hand-built with Next.js.");
    expect(html).toContain("Start yours →");
    // "Start yours →" links the stack's provenance URL
    expect(html).toContain('href="https://nextjs.org"');
  });

  it("blank-stack fallback reads 'made by a person, not a platform.' and links neocities", () => {
    const html = renderCard(
      { stack: null, host: null, static_or_dynamic: null },
      { cornerMode: false }
    );
    expect(html).toContain("MAKE ONE YOURSELF");
    expect(html).toContain("This site was made by a person, not a platform.");
    expect(html).toContain("Start yours →");
    expect(html).toContain('href="https://neocities.org"');
  });

  it('always renders the fixed open-web time cue', () => {
    const withStack = renderCard({ stack: "nextjs" }, { cornerMode: false });
    const withoutStack = renderCard({ stack: null }, { cornerMode: false });
    expect(withStack).toContain("a text editor and a free host is all it takes");
    expect(withoutStack).toContain("a text editor and a free host is all it takes");
  });
});

// ─── MAKE ONE YOURSELF block — "see the whole ladder →" link (both modes) ───

describe("ProvenanceCard MAKE ONE YOURSELF — ladder link", () => {
  it("appends the quiet 'see the whole ladder →' link to /ouroboros (new tab) in corner mode", () => {
    const html = renderCard({ built_with: "bolt" }, { cornerMode: true });
    expect(html).toContain(
      '<a class="prov-link make-one__ladder" href="/ouroboros" target="_blank" rel="noopener noreferrer">see the whole ladder →</a>'
    );
  });

  it("appends the quiet 'see the whole ladder →' link to /ouroboros (new tab) in open-web mode", () => {
    const html = renderCard({ stack: "nextjs" }, { cornerMode: false });
    expect(html).toContain(
      '<a class="prov-link make-one__ladder" href="/ouroboros" target="_blank" rel="noopener noreferrer">see the whole ladder →</a>'
    );
  });
});
