import { describe, it, expect } from "vitest";
import { getActiveFilterSummary, computeLcdText } from "./lcd-text";

// ─── getActiveFilterSummary ───

describe("getActiveFilterSummary", () => {
  it("returns null when no filters are active", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: [], hosts: [], static_or_dynamic: [] },
      []
    );
    expect(result).toBeNull();
  });

  it("returns null when all args are undefined", () => {
    const result = getActiveFilterSummary(undefined, undefined, undefined);
    expect(result).toBeNull();
  });

  it("returns uppercased value for a single character filter", () => {
    const result = getActiveFilterSummary(
      "modern_indie",
      { stacks: [], hosts: [], static_or_dynamic: [] },
      []
    );
    expect(result).toBe("MODERN_INDIE");
  });

  it("returns uppercased value for a single stack filter", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: ["nextjs"], hosts: [], static_or_dynamic: [] },
      []
    );
    expect(result).toBe("NEXTJS");
  });

  it("returns uppercased value for a single host filter", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: [], hosts: ["neocities"], static_or_dynamic: [] },
      []
    );
    expect(result).toBe("NEOCITIES");
  });

  it("returns uppercased value for a single static_or_dynamic filter", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: [], hosts: [], static_or_dynamic: ["static"] },
      []
    );
    expect(result).toBe("STATIC");
  });

  it("returns TIER label for a single tier selection", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: [], hosts: [], static_or_dynamic: [] },
      [3]
    );
    expect(result).toBe("TIER 3");
  });

  it("returns first value +N for multiple filters", () => {
    const result = getActiveFilterSummary(
      "modern_indie",
      { stacks: ["nextjs", "react"], hosts: [], static_or_dynamic: [] },
      []
    );
    // character + 2 stacks = 3 values → "MODERN_INDIE +2"
    expect(result).toBe("MODERN_INDIE +2");
  });

  it("returns first value +1 for exactly two filters", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: ["nextjs"], hosts: ["vercel"], static_or_dynamic: [] },
      []
    );
    expect(result).toBe("NEXTJS +1");
  });

  it("counts tiers alongside build filters", () => {
    const result = getActiveFilterSummary(
      null,
      { stacks: [], hosts: [], static_or_dynamic: [] },
      [1, 2, 3]
    );
    // 3 tier values → "TIER 1 +2"
    expect(result).toBe("TIER 1 +2");
  });
});

// ─── computeLcdText with filter summary ───

describe("computeLcdText with active filters", () => {
  it("appends filter summary when tuned with mood and one filter", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: "beautiful",
      channelCounter: 218,
      channelNumber: 218,
      cornerMode: false,
      selectedCharacter: null,
      buildFilters: { stacks: [], hosts: ["neocities"], static_or_dynamic: [] },
      selectedTiers: [],
    });
    expect(result).toBe("CH 218 · BEAUTIFUL · NEOCITIES");
  });

  it("appends truncated filter summary when tuned with mood and multiple filters", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: "think",
      channelCounter: 218,
      channelNumber: 218,
      cornerMode: false,
      selectedCharacter: null,
      buildFilters: { stacks: ["nextjs"], hosts: ["vercel"], static_or_dynamic: ["static"] },
      selectedTiers: [],
    });
    expect(result).toBe("CH 218 · THINK · NEXTJS +2");
  });

  it("appends filter summary when tuned with no mood", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: null,
      channelCounter: 300,
      channelNumber: 300,
      cornerMode: false,
      selectedCharacter: "retro_personal",
      buildFilters: { stacks: [], hosts: [], static_or_dynamic: [] },
      selectedTiers: [],
    });
    expect(result).toBe("CH 300 - OPEN WEB · RETRO_PERSONAL");
  });

  it("does not append filter summary when idle (not tuned)", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "idle",
      selectedMood: "useful",
      channelCounter: 217,
      channelNumber: null,
      cornerMode: false,
      selectedCharacter: "modern_indie",
      buildFilters: { stacks: [], hosts: [], static_or_dynamic: [] },
      selectedTiers: [],
    });
    // Idle + mood → full mood label, no filter info
    expect(result).toBe("Show me something useful");
  });

  it("does not append filter summary during zapping", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "zapping",
      selectedMood: null,
      channelCounter: 225,
      channelNumber: 225,
      cornerMode: false,
      selectedCharacter: "minimal_static",
      buildFilters: { stacks: ["react"], hosts: [], static_or_dynamic: [] },
      selectedTiers: [],
    });
    expect(result).toBe("TUNING > CH 225");
  });

  it("no_match still takes precedence over filters", () => {
    const result = computeLcdText({
      statusMessage: "no_match",
      zapState: "tuned",
      selectedMood: "think",
      channelCounter: 300,
      channelNumber: 300,
      cornerMode: false,
      selectedCharacter: "modern_indie",
      buildFilters: { stacks: ["nextjs"], hosts: [], static_or_dynamic: [] },
      selectedTiers: [],
    });
    expect(result).toBe("NOTHING IN THAT CORNER RIGHT NOW");
  });

  it("works without optional filter params (backward-compatible)", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: "beautiful",
      channelCounter: 223,
      channelNumber: 223,
      cornerMode: false,
    });
    expect(result).toBe("CH 223 · BEAUTIFUL");
  });

  it("appends filter summary in corner mode when tuned without mood", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: null,
      channelCounter: 400,
      channelNumber: 400,
      cornerMode: true,
      selectedCharacter: null,
      buildFilters: { stacks: [], hosts: [], static_or_dynamic: [] },
      selectedTiers: [2, 4],
    });
    expect(result).toBe("CH 400 - VIBECODED · TIER 2 +1");
  });
});
