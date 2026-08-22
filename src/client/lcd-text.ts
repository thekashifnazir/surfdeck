import type { ZapState, StatusKind, BuildFilterSelection } from "./App";
import { getProvenanceLabel } from "./provenance-labels";
import { getCharacterLabel } from "./character-labels";

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
  selectedCharacter?: string | null;
  buildFilters?: BuildFilterSelection;
  selectedTiers?: number[];
}

/**
 * Collects all active secondary filter values into a single LCD-friendly string.
 *
 * Each value is resolved to its humanised display label via the existing label
 * maps BEFORE uppercasing, so `modern_indie` → "MODERN INDIE" (not
 * "MODERN_INDIE") and `nextjs` → "NEXT.JS". Tier chips keep their "TIER {n}"
 * form.
 *
 * - 0 active filters → null
 * - 1 active filter  → "LABEL" (uppercased)
 * - 2+ active filters → "FIRST_LABEL +{n-1}"
 */
export function getActiveFilterSummary(
  selectedCharacter: string | null | undefined,
  buildFilters: BuildFilterSelection | undefined,
  selectedTiers: number[] | undefined
): string | null {
  const values: string[] = [];

  if (selectedCharacter) {
    values.push(getCharacterLabel(selectedCharacter));
  }

  if (buildFilters) {
    values.push(...buildFilters.stacks.map(getProvenanceLabel));
    values.push(...buildFilters.hosts.map(getProvenanceLabel));
    values.push(...buildFilters.static_or_dynamic.map(getProvenanceLabel));
  }

  if (selectedTiers && selectedTiers.length > 0) {
    for (const tier of selectedTiers) {
      values.push(`TIER ${tier}`);
    }
  }

  if (values.length === 0) return null;
  if (values.length === 1) return values[0].toUpperCase();
  return `${values[0].toUpperCase()} +${values.length - 1}`;
}

/**
 * Pure function that computes the LCD readout text based on app state.
 *
 * Priority order:
 *  0. exhausted status → "END OF DIAL"
 *  1. no_match status → fixed string
 *  2. zapping → "TUNING > CH {n}"
 *  3. tuned + mood + filters → "CH {n} · MOOD · FILTER_SUMMARY"
 *  4. tuned + mood, no filters → "CH {n} · MOOD"
 *  5. tuned + no mood + filters → "CH {n} - MODE · FILTER_SUMMARY"
 *  6. idle + mood → full mood label
 *  7. else → mode label with optional channel
 */
export function computeLcdText(opts: LcdTextOpts): string {
  const {
    statusMessage,
    zapState,
    selectedMood,
    channelCounter,
    channelNumber,
    cornerMode,
    selectedCharacter,
    buildFilters,
    selectedTiers,
  } = opts;

  const filterSummary = getActiveFilterSummary(selectedCharacter, buildFilters, selectedTiers);

  if (statusMessage === "exhausted") {
    return "END OF DIAL";
  } else if (statusMessage === "no_match") {
    return "NOTHING IN THAT CORNER RIGHT NOW";
  } else if (zapState === "zapping") {
    return `TUNING > CH ${channelCounter}`;
  } else if (zapState === "tuned" && selectedMood && MOOD_LABELS[selectedMood]) {
    const base = `CH ${channelCounter} · ${selectedMood.toUpperCase()}`;
    return filterSummary ? `${base} · ${filterSummary}` : base;
  } else if (selectedMood && MOOD_LABELS[selectedMood]) {
    return MOOD_LABELS[selectedMood];
  } else {
    const modeLabel = cornerMode ? "VIBECODED" : "OPEN WEB";
    if (channelNumber) {
      const base = `CH ${channelCounter} - ${modeLabel}`;
      return (zapState === "tuned" && filterSummary) ? `${base} · ${filterSummary}` : base;
    }
    return modeLabel;
  }
}
