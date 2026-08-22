/**
 * Character options with user-friendly display labels and their API query
 * values. Single source of truth shared by the TUNING menu (TellyMenu) and the
 * LCD filter summary (lcd-text).
 */
export const CHARACTERS: { label: string; value: string }[] = [
  { label: "Modern Indie", value: "modern_indie" },
  { label: "Old Web", value: "old_web" },
  { label: "Retro Personal", value: "retro_personal" },
  { label: "Minimal Static", value: "minimal_static" },
];

/** Map from character value → display label, derived from CHARACTERS. */
export const CHARACTER_LABELS: Record<string, string> = Object.fromEntries(
  CHARACTERS.map(({ value, label }) => [value, label])
);

/**
 * Returns the display label for a character value.
 * Falls through to the raw value if no label is defined.
 */
export function getCharacterLabel(value: string): string {
  return CHARACTER_LABELS[value] ?? value;
}
