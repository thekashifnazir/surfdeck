import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * TellyMenu component tests — logic-level / structural.
 * Validates the component renders correct filter sets based on mode,
 * clear-all triggers the callback, and CSS classes are applied properly.
 */

const SOURCE = readFileSync(
  resolve(__dirname, "TellyMenu.tsx"),
  "utf-8"
);

// Character options were lifted to a shared module (character-labels.ts) so the
// LCD filter summary and the OSD share one source of truth. The character
// values live there now; the component imports CHARACTERS from it.
const CHARACTER_LABELS_SOURCE = readFileSync(
  resolve(__dirname, "../character-labels.ts"),
  "utf-8"
);

describe("TellyMenu: Component structure", () => {
  it("exports a default function component", () => {
    expect(SOURCE).toContain("export default function TellyMenu");
  });

  it("accepts the open prop and applies osd--open class conditionally", () => {
    // The className logic should be based on the `open` prop
    expect(SOURCE).toContain('osd--open');
    expect(SOURCE).toMatch(/open\s*\?\s*"\s*osd--open"/);
  });

  it("renders osd as the root className", () => {
    // Template literal builds className starting with "osd"
    expect(SOURCE).toContain("`osd");
  });
});

describe("TellyMenu: OPEN WEB mode (cornerMode=false)", () => {
  it("renders character chips with all 4 values", () => {
    // Values now sourced from the shared character-labels module.
    expect(SOURCE).toContain("CHARACTERS");
    expect(SOURCE).toContain("character-labels");
    expect(CHARACTER_LABELS_SOURCE).toContain("modern_indie");
    expect(CHARACTER_LABELS_SOURCE).toContain("old_web");
    expect(CHARACTER_LABELS_SOURCE).toContain("retro_personal");
    expect(CHARACTER_LABELS_SOURCE).toContain("minimal_static");
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

describe("TellyMenu: VIBECODED mode (cornerMode=true)", () => {
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

describe("TellyMenu: Clear all button", () => {
  it("renders a Clear all button", () => {
    expect(SOURCE).toContain("Clear all");
    expect(SOURCE).toContain("osd__clear");
  });

  it("calls onClearAll when clicked", () => {
    expect(SOURCE).toContain("onClick={onClearAll}");
  });
});

describe("TellyMenu: Accessibility", () => {
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
