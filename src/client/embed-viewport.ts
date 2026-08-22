export interface EmbedViewport {
  virtualWidth: number; // CSS px the iframe is laid out at
  scale: number;        // transform scale
  iframeWidth: number;  // = virtualWidth
  iframeHeight: number; // = screenHeight / scale (fills the screen)
}

/**
 * Pure — no DOM. Returns the virtual width, scale, and iframe dimensions so the
 * scaled frame exactly fills the screen width and height.
 * virtualWidth: 1280 by default; 980 when the screen is narrow enough that 1280
 * scales text unreadably small. Breakpoint APPROVED (review 8): screenWidth < 480
 * → 980 (covers the 390px mobile target).
 */
export function computeEmbedViewport(
  screenWidth: number,
  screenHeight: number
): EmbedViewport {
  const virtualWidth = screenWidth < 480 ? 980 : 1280;
  const scale = screenWidth / virtualWidth;   // scaled width === screenWidth
  return {
    virtualWidth,
    scale,
    iframeWidth: virtualWidth,
    iframeHeight: screenHeight / scale,        // scaled height === screenHeight
  };
}
