import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StatusMessage from "./StatusMessage";
import type { StatusKind } from "../App";

/** Render StatusMessage to an HTML string for assertion. */
function render(
  status: StatusKind,
  props: { siteUrl?: string | null; onReset?: () => void } = {}
): string {
  return renderToStaticMarkup(
    createElement(StatusMessage, {
      status,
      siteUrl: props.siteUrl ?? null,
      onReset: props.onReset,
    })
  );
}

// ─── Exhausted case removed (telly now carries END OF DIAL) ─────────────────

describe("StatusMessage — exhausted case removed", () => {
  it("renders nothing for the exhausted status", () => {
    expect(render("exhausted")).toBe("");
  });

  it("does not render the old exhausted copy or a Reset button", () => {
    // Even when an onReset handler is supplied, no exhausted UI appears.
    const html = render("exhausted", { onReset: () => {} });
    expect(html).not.toContain("You've wandered the whole neighbourhood.");
    expect(html).not.toContain("reset-btn");
    expect(html).not.toContain(">Reset<");
  });
});

// ─── Other cases unchanged ──────────────────────────────────────────────────

describe("StatusMessage — other cases unchanged", () => {
  it("still renders nothing for ok / null", () => {
    expect(render("ok")).toBe("");
    expect(render(null)).toBe("");
  });

  it("still renders the no_match line", () => {
    expect(render("no_match")).toContain("Loosen a filter and try again.");
  });

  it("still renders the popup_blocked line with an open link", () => {
    const html = render("popup_blocked", { siteUrl: "https://example.com" });
    expect(html).toContain("Your browser blocked the new tab.");
    expect(html).toContain("Open the site here");
    expect(html).toContain('href="https://example.com"');
  });

  it("still renders the error line", () => {
    expect(render("error")).toContain("That one got away.");
  });

  it("still renders the ouroboros treatment", () => {
    const html = render("ok", { siteUrl: "/ouroboros" });
    expect(html).toContain("The loop closes — you surfed to the surfer.");
  });
});
