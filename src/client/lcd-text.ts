import type { ZapState, StatusKind } from "./App";

/** Frozen mood labels — displayed on the LCD when a mood is selected. */
export const MOOD_LABELS: Record<string, string> = {
  useful: "Show me something useful",
  learn: "Teach me something",
  waste_time: "Waste my time",
  beautiful: "Show me something beautiful",
  think: "Make me think",
};

export interface LcdTextOpts {
  statusMessage: StatusKind;
  zapState: ZapState;
  selectedMood: string | null;
  channelCounter: number;
  channelNumber: number | null;
  cornerMode: boolean;
}

/**
 * Pure function that computes the LCD readout text based on app state.
 *
 * Priority order:
 *  1. no_match status → fixed string
 *  2. zapping → "TUNING > CH {n}"
 *  3. tuned + mood → "CH {n} · MOOD"
 *  4. idle + mood → full mood label
 *  5. else → mode label with optional channel
 */
export function computeLcdText(opts: LcdTextOpts): string {
  const { statusMessage, zapState, selectedMood, channelCounter, channelNumber, cornerMode } = opts;

  if (statusMessage === "no_match") {
    return "NOTHING IN THAT CORNER RIGHT NOW";
  } else if (zapState === "zapping") {
    return `TUNING > CH ${channelCounter}`;
  } else if (zapState === "tuned" && selectedMood && MOOD_LABELS[selectedMood]) {
    return `CH ${channelCounter} · ${selectedMood.toUpperCase()}`;
  } else if (selectedMood && MOOD_LABELS[selectedMood]) {
    return MOOD_LABELS[selectedMood];
  } else {
    const modeLabel = cornerMode ? "VIBECODED" : "OPEN WEB";
    return channelNumber ? `CH ${channelCounter} - ${modeLabel}` : modeLabel;
  }
}
