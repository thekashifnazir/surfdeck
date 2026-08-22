import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Footer from "./Footer";

/** Helper: render the Footer to an HTML string for assertion. */
function renderFooter() {
  return renderToStaticMarkup(createElement(Footer));
}

/** The five footer links, in their approved order (label → href). */
const EXPECTED_LINKS: { label: string; href: string; external: boolean }[] = [
  { label: "KASHIFNAZIR.COM", href: "https://kashifnazir.com", external: true },
  { label: "GITHUB", href: "https://github.com/thekashifnazir", external: true },
  { label: "LINKEDIN", href: "https://www.linkedin.com/in/kashifnazir/", external: true },
  { label: "HOW THIS WAS MADE", href: "/ouroboros", external: false },
  {
    label: "REPO &amp; PROCESS LOG",
    href: "https://github.com/thekashifnazir/surfdeck/blob/main/docs/kiro-process.md",
    external: true,
  },
];

// ─── Links present in order with correct hrefs (Requirement 5.4) ───

describe("Footer links", () => {
  it("renders all five link labels in the approved order", () => {
    const html = renderFooter();
    let lastIndex = -1;
    for (const { label } of EXPECTED_LINKS) {
      const index = html.indexOf(label);
      expect(index, `label "${label}" should be present`).toBeGreaterThan(-1);
      expect(index, `label "${label}" should appear after the previous label`).toBeGreaterThan(
        lastIndex
      );
      lastIndex = index;
    }
  });

  it("maps each label to its correct href", () => {
    const html = renderFooter();
    for (const { label, href } of EXPECTED_LINKS) {
      // Anchor markup: href attribute appears before the label text within the same <a>.
      expect(html).toContain(`href="${href}"`);
      // The label immediately follows its opening tag: >LABEL</a>
      expect(html).toContain(`>${label}</a>`);
    }
  });
});

// ─── Same-origin vs external link hardening (Requirement 5.4) ───

describe("Footer link targets", () => {
  it('"HOW THIS WAS MADE" points to /ouroboros and is same-origin (no target=_blank)', () => {
    const html = renderFooter();
    // The same-origin anchor: href="/ouroboros" with no target/rel attributes.
    expect(html).toContain('href="/ouroboros">HOW THIS WAS MADE</a>');
  });

  it("external links carry target=_blank and rel=noopener noreferrer", () => {
    const html = renderFooter();
    for (const { href, external } of EXPECTED_LINKS) {
      if (!external) continue;
      // Grab the anchor tag for this href and check its attributes.
      const anchorStart = html.indexOf(`href="${href}"`);
      expect(anchorStart, `anchor for ${href} should exist`).toBeGreaterThan(-1);
      const anchorEnd = html.indexOf(">", anchorStart);
      const anchorTag = html.slice(anchorStart, anchorEnd);
      expect(anchorTag).toContain('target="_blank"');
      expect(anchorTag).toContain('rel="noopener noreferrer"');
    }
  });

  it("the same-origin /ouroboros link does NOT carry target=_blank", () => {
    const html = renderFooter();
    const anchorStart = html.indexOf('href="/ouroboros"');
    const anchorEnd = html.indexOf(">", anchorStart);
    const anchorTag = html.slice(anchorStart, anchorEnd);
    expect(anchorTag).not.toContain('target="_blank"');
    expect(anchorTag).not.toContain("noopener");
  });
});

// ─── Copyright line + Doto tagline (Requirement 5.5) ───

describe("Footer base row", () => {
  it("renders the copyright line", () => {
    const html = renderFooter();
    expect(html).toContain("© 2026 Kashif Nazir");
  });

  it("renders the Doto build tagline inside site-footer__doto", () => {
    const html = renderFooter();
    expect(html).toContain('class="site-footer__doto"');
    expect(html).toContain("SURFDECK — BUILT END-TO-END BY AI IN KIRO");
  });
});

// ─── ID block (name + role) (Requirement 9.3) ───

describe("Footer id block", () => {
  it("renders the author name and role", () => {
    const html = renderFooter();
    expect(html).toContain("Kashif Nazir");
    expect(html).toContain("Senior Technical Architect");
  });
});
