import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TellyMenu from "./TellyMenu";
import type { AvailableFilters, BuildFilterSelection } from "../App";
import { GROUP_GLOSS, CHIP_GLOSS } from "../gloss-map";

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

// ─────────────────────────────────────────────────────────────────────────────
// TUNING Menu v2 (tasks 10–13) — rendered-output + behaviour coverage.
//
// The interactive bits (info-strip hover/focus, BUILD DIALS toggle) are driven
// by React state; with no jsdom/testing-library in the toolchain (Req 9.1: no
// new deps) they are asserted against the source, while everything observable in
// the default static render (group glosses, idle info-strip text, BUILD DIALS
// collapsed-by-default) is asserted against real rendered HTML.
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: render TellyMenu to an HTML string for assertion. */
function renderMenu(
  overrides: {
    cornerMode?: boolean;
    selectedCharacter?: string | null;
    buildFilters?: Partial<BuildFilterSelection>;
    selectedTiers?: number[];
    availableFilters?: Partial<AvailableFilters>;
  } = {}
) {
  const availableFilters: AvailableFilters = {
    stacks: ["nextjs", "hugo", "static_html"],
    hosts: ["vercel", "github_pages"],
    static_or_dynamic: ["static", "dynamic"],
    corner_tiers: [1, 2, 3, 4],
    ...overrides.availableFilters,
  };

  const buildFilters: BuildFilterSelection = {
    stacks: [],
    hosts: [],
    static_or_dynamic: [],
    ...overrides.buildFilters,
  };

  return renderToStaticMarkup(
    createElement(TellyMenu, {
      open: true,
      cornerMode: overrides.cornerMode ?? false,
      selectedCharacter: overrides.selectedCharacter ?? null,
      onCharacterChange: () => {},
      buildFilters,
      onSelectionChange: () => {},
      availableFilters,
      selectedTiers: overrides.selectedTiers ?? [],
      onTierChange: () => {},
      onClearAll: () => {},
    })
  );
}

describe("TellyMenu v2: header subtitle (Req 1.7)", () => {
  it("renders the centred italic subtitle under the header", () => {
    const html = renderMenu();
    expect(html).toContain("osd__subtitle");
    expect(html).toContain(
      "narrow the surf \u2014 or just press SURF and take your chances"
    );
  });
});

describe("TellyMenu v2: group glosses (Req 1.3)", () => {
  it("uses GROUP_GLOSS as the source of the group gloss lines", () => {
    expect(SOURCE).toContain('from "../gloss-map"');
    expect(SOURCE).toContain("GROUP_GLOSS");
    expect(SOURCE).toContain("filters__gloss");
  });

  it("renders the CHARACTER / STACK / HOSTED ON / TYPE glosses verbatim (open-web mode)", () => {
    const html = renderMenu({ cornerMode: false });
    expect(html).toContain(GROUP_GLOSS.character);
    expect(html).toContain(GROUP_GLOSS.stack);
    expect(html).toContain(GROUP_GLOSS.host);
    expect(html).toContain(GROUP_GLOSS.static_or_dynamic);
    // The exact approved copy, not just the map reference.
    expect(html).toContain("what kind of place it is");
    expect(html).toContain("what it was built with");
    expect(html).toContain("where it lives online");
    expect(html).toContain("does it change while you watch");
  });

  it("renders the TIER gloss verbatim (corner mode)", () => {
    const html = renderMenu({ cornerMode: true });
    expect(html).toContain(GROUP_GLOSS.tier);
    expect(html).toContain("how much of it AI built");
  });

  it("wraps each group label with its gloss in a labelbox", () => {
    const html = renderMenu();
    expect(html).toContain("filters__labelbox");
    expect(html).toContain('class="filters__gloss"');
  });
});

describe("TellyMenu v2: info strip (Req 1.4)", () => {
  it("shows the idle text when no chip is hovered/focused", () => {
    const html = renderMenu();
    expect(html).toContain("osd__info-strip");
    expect(html).toContain("hover any option to see what it means");
  });

  it("marks the info strip as an aria-live region for a11y", () => {
    const html = renderMenu();
    expect(html).toContain('aria-live="polite"');
  });

  it("populates the strip from CHIP_GLOSS on chip hover/focus (label bold + em-dash + gloss)", () => {
    // Interaction is state-driven; assert the wiring in source.
    expect(SOURCE).toContain("CHIP_GLOSS");
    expect(SOURCE).toContain("const gloss = CHIP_GLOSS[value]");
    // The populated strip renders "**{label}** \u2014 {gloss}".
    expect(SOURCE).toContain("osd__info-strip-label");
    expect(SOURCE).toContain("hint.label");
    expect(SOURCE).toContain("hint.gloss");
    expect(SOURCE).toContain("\\u2014"); // em-dash separator between label and gloss
  });

  it("wires hover and keyboard focus (and clears on leave/blur) on chips", () => {
    expect(SOURCE).toContain("onMouseEnter");
    expect(SOURCE).toContain("onFocus");
    expect(SOURCE).toContain("onMouseLeave={clearHint}");
    expect(SOURCE).toContain("onBlur={clearHint}");
    expect(SOURCE).toContain("showHint(");
  });

  it("only sets a hint when a CHIP_GLOSS entry exists (unmapped chips stay idle)", () => {
    expect(SOURCE).toContain("if (gloss) setHint({ label, gloss })");
  });

  it("has a CHIP_GLOSS entry for every rendered value in the fixture (no blank populated strip)", () => {
    // Sanity: the chip values this menu renders all resolve to a gloss.
    for (const v of ["nextjs", "hugo", "static_html", "vercel", "github_pages", "static", "dynamic"]) {
      expect(CHIP_GLOSS[v]).toBeTruthy();
    }
    // character values + tier keys too.
    for (const v of ["modern_indie", "old_web", "retro_personal", "minimal_static"]) {
      expect(CHIP_GLOSS[v]).toBeTruthy();
    }
    for (const t of ["1", "2", "3", "4"]) {
      expect(CHIP_GLOSS[t]).toBeTruthy();
    }
  });
});

describe("TellyMenu v2: BUILD DIALS collapse (Req 1.6)", () => {
  it("renders the BUILD DIALS toggle with the approved label (for the curious)", () => {
    const html = renderMenu({ cornerMode: false });
    expect(html).toContain("osd__build-dials-toggle");
    expect(html).toContain("BUILD DIALS");
    expect(html).toContain("filter by what it");
    expect(html).toContain("built with (for the curious)");
  });

  it("is collapsed by default (aria-expanded=false, ▸ chevron, no OPEN/CLOSED text)", () => {
    const html = renderMenu({ cornerMode: false });
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("\u25B8"); // ▸ collapsed chevron
    // Chevron-only: state is exposed via aria-expanded, not visible text.
    expect(html).not.toContain("CLOSED");
    expect(html).not.toContain("osd__build-dials-state");
    // The collapsible container does NOT carry the --open modifier by default.
    expect(html).not.toContain("osd__build-dials--open");
  });

  it("initialises the collapse state to false and toggles it", () => {
    // Default-collapsed state + open/close toggle wiring in source.
    expect(SOURCE).toContain("useState(false)");
    expect(SOURCE).toContain("setBuildDialsOpen((v) => !v)");
    expect(SOURCE).toContain("aria-expanded={buildDialsOpen}");
    expect(SOURCE).toContain("osd__build-dials--open");
    expect(SOURCE).toContain('buildDialsOpen ? "\\u25BE" : "\\u25B8"'); // ▾ open / ▸ closed
  });

  it("keeps the toggle keyboard-operable and linked to its region (aria-controls)", () => {
    const html = renderMenu({ cornerMode: false });
    expect(html).toContain('aria-controls="osd-build-dials"');
    expect(html).toContain('id="osd-build-dials"');
  });

  it("wraps STACK + HOSTED ON + TYPE, while CHARACTER sits above the toggle (open-web)", () => {
    const html = renderMenu({ cornerMode: false });
    const toggleIdx = html.indexOf("osd__build-dials-toggle");
    const characterIdx = html.indexOf("Character filter");
    const stackIdx = html.indexOf("Stack filter");
    const hostIdx = html.indexOf("Host filter");
    const typeIdx = html.indexOf("Type filter");
    // CHARACTER renders before the BUILD DIALS toggle.
    expect(characterIdx).toBeGreaterThanOrEqual(0);
    expect(toggleIdx).toBeGreaterThan(characterIdx);
    // STACK / HOSTED ON / TYPE render inside/after the toggle.
    expect(stackIdx).toBeGreaterThan(toggleIdx);
    expect(hostIdx).toBeGreaterThan(toggleIdx);
    expect(typeIdx).toBeGreaterThan(toggleIdx);
  });

  it("does NOT render the BUILD DIALS toggle in corner mode (TIER is separate)", () => {
    const html = renderMenu({ cornerMode: true });
    expect(html).not.toContain("osd__build-dials-toggle");
    expect(html).toContain('aria-label="Tier filter"');
  });
});
