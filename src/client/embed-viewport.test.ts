import { describe, it, expect } from "vitest";
import { computeEmbedViewport } from "./embed-viewport";

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

  it("virtualWidth is 1280 at desktop widths", () => {
    expect(computeEmbedViewport(480, 600).virtualWidth).toBe(1280);
    expect(computeEmbedViewport(640, 600).virtualWidth).toBe(1280);
    expect(computeEmbedViewport(1000, 600).virtualWidth).toBe(1280);
  });

  it("virtualWidth is 980 below the breakpoint", () => {
    expect(computeEmbedViewport(390, 700).virtualWidth).toBe(980);
    expect(computeEmbedViewport(479, 700).virtualWidth).toBe(980);
  });

  it("uses 1280 at exactly the 480px breakpoint", () => {
    expect(computeEmbedViewport(480, 600).virtualWidth).toBe(1280);
  });

  it("uses 980 just below the 480px breakpoint (479)", () => {
    expect(computeEmbedViewport(479, 600).virtualWidth).toBe(980);
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
