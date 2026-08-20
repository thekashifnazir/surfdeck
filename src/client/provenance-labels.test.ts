import { describe, it, expect } from "vitest";
import { getProvenanceLabel, PROVENANCE_LABELS } from "./provenance-labels";

describe("getProvenanceLabel", () => {
  it('returns "Next.js" for "nextjs"', () => {
    expect(getProvenanceLabel("nextjs")).toBe("Next.js");
  });

  it('returns "GitHub Pages" for "github_pages"', () => {
    expect(getProvenanceLabel("github_pages")).toBe("GitHub Pages");
  });

  it('returns "Static" for "static"', () => {
    expect(getProvenanceLabel("static")).toBe("Static");
  });

  it("passes through unknown values unchanged", () => {
    expect(getProvenanceLabel("some_future_value")).toBe("some_future_value");
  });
});

describe("ProvenanceCard label integration", () => {
  it("does not interfere with blank detection — empty string passes through as empty", () => {
    // ProvenanceCard's isDisplayable treats "" as not displayable (triggers fallback).
    // getProvenanceLabel must not transform "" into a displayable string.
    expect(getProvenanceLabel("")).toBe("");
  });

  it('does not map "unknown" — the label layer never rescues the forbidden literal', () => {
    // ProvenanceCard filters out "unknown" values. The label map must not contain
    // "unknown" as a key, which would give it a friendly label and bypass the filter.
    expect(PROVENANCE_LABELS).not.toHaveProperty("unknown");
  });

  it("no label value in the map equals the string 'unknown'", () => {
    const values = Object.values(PROVENANCE_LABELS);
    expect(values).not.toContain("unknown");
  });
});
