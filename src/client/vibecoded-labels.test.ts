import { describe, it, expect } from "vitest";
import {
  getBuiltWithLabel,
  getBuiltWithTier,
  getTierLabel,
} from "./vibecoded-labels";
import { expandTiers } from "../shared/vibecoded-tiers";

describe("getBuiltWithLabel", () => {
  it('returns "Lovable" for "lovable"', () => {
    expect(getBuiltWithLabel("lovable")).toBe("Lovable");
  });

  it('returns "Claude Code" for "claude_code"', () => {
    expect(getBuiltWithLabel("claude_code")).toBe("Claude Code");
  });

  it("passes through unknown values unchanged (no crash)", () => {
    expect(getBuiltWithLabel("unknown_thing")).toBe("unknown_thing");
  });
});

describe("getBuiltWithTier", () => {
  it("returns 2 for lovable", () => {
    expect(getBuiltWithTier("lovable")).toBe(2);
  });

  it("returns 4 for cloudflare_workers", () => {
    expect(getBuiltWithTier("cloudflare_workers")).toBe(4);
  });

  it("returns null for unknown values", () => {
    expect(getBuiltWithTier("unknown_thing")).toBeNull();
  });
});

describe("getTierLabel", () => {
  it('returns "No-code AI builder" for tier 1', () => {
    expect(getTierLabel(1)).toBe("No-code AI builder");
  });

  it("returns null for unknown tier numbers", () => {
    expect(getTierLabel(99)).toBeNull();
  });
});

describe("expandTiers", () => {
  it("expands tier 2 to include lovable and bolt", () => {
    const result = expandTiers([2]);
    expect(result).toContain("lovable");
    expect(result).toContain("bolt");
  });

  it("returns empty array for unknown tier numbers", () => {
    expect(expandTiers([99])).toEqual([]);
  });
});
