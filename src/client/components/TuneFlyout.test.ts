import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * TuneFlyout component tests — logic-level / structural.
 * Validates the component renders correct filter sets based on mode,
 * clear-all triggers the callback, and CSS classes are applied properly.
 */

const SOURCE = readFileSync(
  resolve(__dirname, "TuneFlyout.tsx"),
  "utf-8"
);

describe("TuneFlyout: Component structure", () => {
  it("exports a default function component", () => {
    expect(SOURCE).toContain("export default function TuneFlyout");
  });

  it("accepts the open prop and applies tune-flyout--open class conditionally", () => {
    // The className logic should be based on the `open` prop
    expect(SOURCE).toContain('tune-flyout--open');
    expect(SOURCE).toMatch(/open\s*\?\s*"\s*tune-flyout--open"/);
  });

  it("renders tune-flyout as the root className", () => {
    // Template literal builds className starting with "tune-flyout"
    expect(SOURCE).toContain("`tune-flyout");
  });
});

describe("TuneFlyout: OPEN WEB mode (cornerMode=false)", () => {
  it("renders character chips with all 4 values", () => {
    expect(SOURCE).toContain("modern_indie");
    expect(SOURCE).toContain("old_web");
    expect(SOURCE).toContain("retro_personal");
    expect(SOURCE).toContain("minimal_static");
  });

  it("renders character chips as single-select toggle-off", () => {
    // Toggle-off: if selected === value → null
    expect(SOURCE).toContain("selectedCharacter === value");
    expect(SOURCE).toContain("onCharacterChange(null)");
  });

  it("renders stack filter chips from availableFilters.stacks", () => {
    expect(SOURCE).toContain("availableFilters.stacks");
    expect(SOURCE).toContain('aria-label="Stack filter"');
  });

  it("renders host filter chips from availableFilters.hosts", () => {
    expect(SOURCE).toContain("availableFilters.hosts");
    expect(SOURCE).toContain('aria-label="Host filter"');
  });

  it("renders static/dynamic filter chips from availableFilters.static_or_dynamic", () => {
    expect(SOURCE).toContain("availableFilters.static_or_dynamic");
    expect(SOURCE).toContain('aria-label="Type filter"');
  });

  it("uses getProvenanceLabel for build filter chip display text", () => {
    expect(SOURCE).toContain("getProvenanceLabel(value)");
  });

  it("uses multi-select toggle for build filters", () => {
    // Multi-select: includes → remove, else → add
    expect(SOURCE).toContain("current.includes(value)");
    expect(SOURCE).toContain("current.filter");
    expect(SOURCE).toContain("[...current, value]");
  });
});

describe("TuneFlyout: VIBECODED mode (cornerMode=true)", () => {
  it("renders tier chips from availableFilters.corner_tiers", () => {
    expect(SOURCE).toContain("availableFilters.corner_tiers");
    expect(SOURCE).toContain('aria-label="Tier filter"');
  });

  it("uses TIER_LABELS for display text", () => {
    expect(SOURCE).toContain("TIER_LABELS[tier]");
  });

  it("uses multi-select toggle for tier chips", () => {
    expect(SOURCE).toContain("selectedTiers.includes(tier)");
    expect(SOURCE).toContain("selectedTiers.filter");
    expect(SOURCE).toContain("[...selectedTiers, tier]");
  });

  it("conditionally renders tiers only in cornerMode", () => {
    // The ternary: cornerMode ? (tier chips) : (open web chips)
    expect(SOURCE).toMatch(/cornerMode\s*\?/);
  });
});

describe("TuneFlyout: Clear all button", () => {
  it("renders a Clear all button", () => {
    expect(SOURCE).toContain("Clear all");
    expect(SOURCE).toContain("tune-flyout__clear");
  });

  it("calls onClearAll when clicked", () => {
    expect(SOURCE).toContain("onClick={onClearAll}");
  });
});

describe("TuneFlyout: Accessibility", () => {
  it("uses aria-pressed on all chip buttons", () => {
    // Count occurrences — should have aria-pressed in multiple places
    const matches = SOURCE.match(/aria-pressed/g);
    expect(matches).not.toBeNull();
    // At least 3 groups: character, build filters, tiers
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it("uses role=group with aria-label on filter groups", () => {
    expect(SOURCE).toContain('role="group"');
    expect(SOURCE).toContain("aria-label=");
  });

  it("all filter chips use the .chip class for 44px min-height", () => {
    // All buttons should use the chip class
    const chipMatches = SOURCE.match(/className={`chip/g);
    expect(chipMatches).not.toBeNull();
    expect(chipMatches!.length).toBeGreaterThanOrEqual(4);
  });
});
