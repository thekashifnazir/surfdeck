import { describe, it, expect } from "vitest";
import { computeEmbedViewport, MIN_SCALE } from "./embed-viewport";

// ─── computeEmbedViewport ───

describe("computeEmbedViewport", () => {
  it("scaled width equals screenWidth (desktop)", () => {
    const { iframeWidth, scale } = computeEmbedViewport(1000, 600);
    expect(iframeWidth * scale).toBeCloseTo(1000);
  });

  it("scaled width equals screenWidth (mobile)", () => {
    const { iframeWidth, scale } = computeEmbedViewport(390, 700);
    expect(iframeWidth * scale).toBeCloseTo(390);
  });

  it("scaled height equals screenHeight (desktop)", () => {
    const { iframeHeight, scale } = computeEmbedViewport(1000, 600);
    expect(iframeHeight * scale).toBeCloseTo(600);
  });

  it("scaled height equals screenHeight (mobile)", () => {
    const { iframeHeight, scale } = computeEmbedViewport(390, 700);
    expect(iframeHeight * scale).toBeCloseTo(700);
  });

  it("virtualWidth follows the MIN_SCALE clamp at desktop widths", () => {
    // 480 / 0.6 = 800 → clamped up to the 1000 floor
    expect(computeEmbedViewport(480, 600).virtualWidth).toBe(1000);
    // 640 / 0.6 = 1066.67 → within [1000, 1280], proportional
    expect(computeEmbedViewport(640, 600).virtualWidth).toBeCloseTo(1066.67, 1);
    // 1000 / 0.6 = 1666.67 → clamped down to the 1280 ceiling
    expect(computeEmbedViewport(1000, 600).virtualWidth).toBe(1280);
  });

  it("virtualWidth is 980 below the breakpoint", () => {
    expect(computeEmbedViewport(390, 700).virtualWidth).toBe(980);
    expect(computeEmbedViewport(479, 700).virtualWidth).toBe(980);
  });

  it("clamps to the 1000 floor at the 480px breakpoint", () => {
    // 480px switches OFF mobile, but 480/0.6 = 800 clamps up to the 1000 floor
    expect(computeEmbedViewport(480, 600).virtualWidth).toBe(1000);
  });

  it("uses 980 just below the 480px breakpoint (479)", () => {
    expect(computeEmbedViewport(479, 600).virtualWidth).toBe(980);
  });

  it("clamps to the 1000 floor for narrow non-mobile widths", () => {
    // 600 / 0.6 = 1000 → exactly at the floor
    const { virtualWidth, scale } = computeEmbedViewport(600, 600);
    expect(virtualWidth).toBe(1000);
    expect(scale).toBeCloseTo(0.6);
  });

  it("scales proportionally at MIN_SCALE in the mid range", () => {
    // 640 / 0.6 = 1066.67 → scale pinned at MIN_SCALE
    const { virtualWidth, scale } = computeEmbedViewport(640, 600);
    expect(virtualWidth).toBeCloseTo(1066.67, 1);
    expect(scale).toBeCloseTo(MIN_SCALE);
  });

  it("hits MIN_SCALE exactly at 768px (768/0.6 = 1280 ceiling)", () => {
    const { virtualWidth, scale } = computeEmbedViewport(768, 600);
    expect(virtualWidth).toBe(1280);
    expect(scale).toBeCloseTo(MIN_SCALE);
  });

  it("clamps to the 1280 ceiling at wide widths", () => {
    expect(computeEmbedViewport(1000, 600).virtualWidth).toBe(1280);
    expect(computeEmbedViewport(1280, 600).virtualWidth).toBe(1280);
    // 1280 → scale 1 (unchanged desktop case)
    expect(computeEmbedViewport(1280, 600).scale).toBeCloseTo(1);
  });

  it("iframeWidth equals virtualWidth", () => {
    const desktop = computeEmbedViewport(1000, 600);
    expect(desktop.iframeWidth).toBe(desktop.virtualWidth);

    const mobile = computeEmbedViewport(390, 700);
    expect(mobile.iframeWidth).toBe(mobile.virtualWidth);
  });

  it("scale is screenWidth / virtualWidth", () => {
    expect(computeEmbedViewport(1000, 600).scale).toBeCloseTo(1000 / 1280);
    expect(computeEmbedViewport(390, 700).scale).toBeCloseTo(390 / 980);
  });
});
