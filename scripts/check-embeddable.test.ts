import { describe, it, expect } from "vitest";
import { isRelativeUrl, isEmbeddableFromHeaders } from "./check-embeddable.js";

describe("isRelativeUrl — same-origin corpus rows", () => {
  it("treats a leading-slash relative URL (e.g. /ouroboros) as relative", () => {
    // Relative URLs are same-origin by definition and cannot be header-checked
    // with fetch, so checkUrl short-circuits them to embeddable = true.
    expect(isRelativeUrl("/ouroboros")).toBe(true);
    expect(isRelativeUrl("/")).toBe(true);
  });

  it("does NOT treat absolute http(s) URLs as relative", () => {
    expect(isRelativeUrl("https://example.com")).toBe(false);
    expect(isRelativeUrl("http://example.com/path")).toBe(false);
  });
});

describe("isEmbeddableFromHeaders — header inspection (regression guard)", () => {
  it("blocks on X-Frame-Options DENY / SAMEORIGIN", () => {
    expect(isEmbeddableFromHeaders(new Headers({ "x-frame-options": "DENY" }))).toBe(false);
    expect(isEmbeddableFromHeaders(new Headers({ "x-frame-options": "SAMEORIGIN" }))).toBe(false);
  });

  it("allows when no framing headers are present", () => {
    expect(isEmbeddableFromHeaders(new Headers())).toBe(true);
  });
});
