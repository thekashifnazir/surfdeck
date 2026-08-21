/**
 * Returns timing values for the zap ceremony.
 *
 * - staticDuration: how long the TV static/snow plays before tuning in
 * - cardDelay: total delay from zap start before the provenance card prints
 *
 * The net card delay (cardDelay - staticDuration) is the pause between
 * the screen tuning in and the card appearing.
 */
export function getZapTimings(isFirstSurf: boolean): {
  staticDuration: number;
  cardDelay: number;
} {
  return isFirstSurf
    ? { staticDuration: 800, cardDelay: 1200 }
    : { staticDuration: 400, cardDelay: 500 };
}
