import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeLcdText } from "./lcd-text";
import { getZapTimings } from "./zap-timings";

/**
 * Bug-fix regression tests for Cycle 6 tasks 1–3.
 *
 * These are logic-level / structural tests that do NOT require a DOM renderer.
 * They validate the fixes applied in App.tsx without rendering the component.
 */

// ─── Helper: read App.tsx source ───
const APP_SOURCE = readFileSync(
  resolve(__dirname, "App.tsx"),
  "utf-8"
);

// ─── Task 1: press-note is OUTSIDE .scene ───

describe("Bug fix: press-note outside .scene", () => {
  it("press-note is rendered AFTER the .scene div closes", () => {
    // Verify the structural pattern: .scene's closing </div> appears
    // immediately before the Press-note JSX comment block.
    // Actual pattern in source: "</div>\n\n      {/* Press-note"
    const pattern = "</div>\n\n      {/* Press-note";
    expect(APP_SOURCE).toContain(pattern);
  });

  it("press-note className does not appear between scene open and scene close", () => {
    // Find .scene's opening tag
    const sceneOpenIdx = APP_SOURCE.indexOf('<div className="scene">');
    expect(sceneOpenIdx).toBeGreaterThan(-1);

    // Find the last </div> before the Press-note comment — that's .scene's closing tag.
    const pressNoteComment = APP_SOURCE.indexOf("{/* Press-note");
    expect(pressNoteComment).toBeGreaterThan(-1);

    // Walk backwards from Press-note comment to find the preceding </div>
    const textBefore = APP_SOURCE.slice(0, pressNoteComment);
    const sceneCloseIdx = textBefore.lastIndexOf("</div>");
    expect(sceneCloseIdx).toBeGreaterThan(sceneOpenIdx);

    // The .scene block is between its open tag and its closing </div>
    const sceneBlock = APP_SOURCE.slice(sceneOpenIdx, sceneCloseIdx);

    // press-note should NOT be in this block
    expect(sceneBlock).not.toContain("press-note");
    // But it should contain the expected children
    expect(sceneBlock).toContain("Remote");
    expect(sceneBlock).toContain("telly-container");
  });
});

// ─── Task 2: card delay timings via real getZapTimings ───

describe("Bug fix: first-press card delay", () => {
  it("first-press net card delay (cardDelay - staticDuration) is positive", () => {
    const { staticDuration, cardDelay } = getZapTimings(true);
    const netDelay = cardDelay - staticDuration;

    expect(netDelay).toBeGreaterThan(0);
    expect(netDelay).toBe(400);
  });

  it("compressed (subsequent) net card delay is positive", () => {
    const { staticDuration, cardDelay } = getZapTimings(false);
    const netDelay = cardDelay - staticDuration;

    expect(netDelay).toBeGreaterThan(0);
    expect(netDelay).toBe(100);
  });

  it("App.tsx source uses getZapTimings for timing values", () => {
    // Verify the real function is used (not hardcoded inline)
    expect(APP_SOURCE).toContain("getZapTimings(isFirstSurf)");
  });
});

// ─── Task 3: LCD shows channel number when tuned with mood ───

describe("Bug fix: LCD channel number when tuned with mood", () => {
  it('includes "CH" when tuned with a mood selected', () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: "beautiful",
      channelCounter: 223,
      channelNumber: 223,
      cornerMode: false,
    });

    expect(result).toContain("CH");
    expect(result).toBe("CH 223 · BEAUTIFUL");
  });

  it('includes channel and uppercased mood label when tuned', () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "tuned",
      selectedMood: "think",
      channelCounter: 450,
      channelNumber: 450,
      cornerMode: false,
    });

    expect(result).toBe("CH 450 · THINK");
  });

  it("shows full mood label when idle (pre-first-surf)", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "idle",
      selectedMood: "beautiful",
      channelCounter: 217,
      channelNumber: null,
      cornerMode: false,
    });

    expect(result).toBe("Show me something beautiful");
    expect(result).not.toContain("CH");
  });

  it("no_match always takes precedence", () => {
    const result = computeLcdText({
      statusMessage: "no_match",
      zapState: "tuned",
      selectedMood: "useful",
      channelCounter: 300,
      channelNumber: 300,
      cornerMode: false,
    });

    expect(result).toBe("NOTHING IN THAT CORNER RIGHT NOW");
  });

  it("zapping shows TUNING > CH regardless of mood", () => {
    const result = computeLcdText({
      statusMessage: null,
      zapState: "zapping",
      selectedMood: "learn",
      channelCounter: 218,
      channelNumber: 218,
      cornerMode: false,
    });

    expect(result).toBe("TUNING > CH 218");
  });
});

// ─── Exhausted "END OF DIAL": LCD readout + start-the-dial-over wiring ───

describe("Exhausted state: LCD reads END OF DIAL", () => {
  it('computes "END OF DIAL" for the exhausted status', () => {
    const result = computeLcdText({
      statusMessage: "exhausted",
      zapState: "idle",
      selectedMood: null,
      channelCounter: 217,
      channelNumber: null,
      cornerMode: false,
    });
    expect(result).toBe("END OF DIAL");
  });

  it("exhausted takes precedence over a selected mood", () => {
    const result = computeLcdText({
      statusMessage: "exhausted",
      zapState: "idle",
      selectedMood: "beautiful",
      channelCounter: 217,
      channelNumber: null,
      cornerMode: true,
    });
    expect(result).toBe("END OF DIAL");
  });
});

describe("Exhausted state: start-the-dial-over wiring in App.tsx", () => {
  it("defines handleStartOver that clears the seen-list then surfs", () => {
    // One user gesture: remove the seen-list key, then call handleSurf so the
    // surf's opener runs inside the same click (never popup-blocked).
    expect(APP_SOURCE).toMatch(
      /const\s+handleStartOver\s*=\s*useCallback\(\s*\(\)\s*=>\s*\{[\s\S]*?localStorage\.removeItem\(SEEN_KEY\)[\s\S]*?handleSurf\(\)[\s\S]*?\}/
    );
  });

  it("passes handleStartOver to the Telly as onStartOver", () => {
    expect(APP_SOURCE).toContain("onStartOver={handleStartOver}");
  });
});
