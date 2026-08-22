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
    expect(html).toContain("CATCH №\u00a07 OF 349");
  });

  it("updates when corpus total changes", () => {
    const html = renderCard({ id: 100 }, { corpusTotal: 500 });
    expect(html).toContain("CATCH №\u00a0100 OF 500");
  });
});

// ─── Card content: catch number uses site ID ───

describe("ProvenanceCard catch number", () => {
  it("uses site.id for the catch number", () => {
    const html = renderCard({ id: 288 }, { corpusTotal: 349 });
    expect(html).toContain("CATCH №\u00a0288 OF 349");
  });
});
