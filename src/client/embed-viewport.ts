export interface EmbedViewport {
  virtualWidth: number; // CSS px the iframe is laid out at
  scale: number;        // transform scale
  iframeWidth: number;  // = virtualWidth
  iframeHeight: number; // = screenHeight / scale (fills the screen)
}

/** Readability floor: the miniature never renders more scaled-down than this. */
export const MIN_SCALE = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pure — no DOM. Returns the virtual width, scale, and iframe dimensions so the
 * scaled frame exactly fills the screen width and height.
 *
 * virtualWidth: 980 for narrow mobile screens (screenWidth < 480, covers the
 * 390px mobile target). For non-mobile screens the virtual width is derived
 * from a MIN_SCALE readability floor: virtualWidth = clamp(screenWidth /
 * MIN_SCALE, 1000, 1280). This keeps the site from scaling unreadably small on
 * mid-size windows — e.g. on a ~600px screen the site renders at 1000 virtual
 * px scaled to 0.6 instead of 1280 at ~0.47. Wide windows scale up toward the
 * 1280 ceiling, and staying >= 1000 virtual px still trips the desktop
 * breakpoints on almost all sites. Breakpoint APPROVED (review 8): screenWidth
 * < 480 → 980.
 */
export function computeEmbedViewport(
  screenWidth: number,
  screenHeight: number
): EmbedViewport {
  const virtualWidth =
    screenWidth < 480 ? 980 : clamp(screenWidth / MIN_SCALE, 1000, 1280);
  const scale = screenWidth / virtualWidth;   // scaled width === screenWidth
  return {
    virtualWidth,
    scale,
    iframeWidth: virtualWidth,
    iframeHeight: screenHeight / scale,        // scaled height === screenHeight
  };
}
