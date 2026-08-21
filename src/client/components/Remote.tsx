import type { ZapState } from "../App";

/** Mood key definitions — short keycap + full frozen label + API value */
const MOOD_KEYS: { keycap: string; label: string; value: string | null }[] = [
  { keycap: "USEFUL", label: "Show me something useful", value: "useful" },
  { keycap: "TEACH", label: "Teach me something", value: "learn" },
  { keycap: "WASTE", label: "Waste my time", value: "waste_time" },
  { keycap: "BEAUTY", label: "Show me something beautiful", value: "beautiful" },
  { keycap: "THINK", label: "Make me think", value: "think" },
  { keycap: "LUCKY", label: "Surprise me", value: null },
];

export interface RemoteProps {
  selectedMood: string | null;
  onMoodChange: (mood: string | null) => void;
  cornerMode: boolean;
  onCornerToggle: () => void;
  onSurf: () => void;
  isLoading: boolean;
  zapState: ZapState;
  isFirstSurf: boolean;
  lcdText: string;
}

/**
 * The Remote — a charcoal device surface containing the SURF key,
 * mood keys, INPUT key, IR LED, and LCD readout.
 */
export default function Remote({
  selectedMood,
  onMoodChange,
  cornerMode,
  onCornerToggle,
  onSurf,
  isLoading,
  zapState,
  isFirstSurf,
  lcdText,
}: RemoteProps) {
  function handleMoodClick(value: string | null) {
    if (value === null) {
      // LUCKY always clears the mood filter
      onMoodChange(null);
    } else if (selectedMood === value) {
      // Toggle off
      onMoodChange(null);
    } else {
      onMoodChange(value);
    }
  }

  // Determine LED animation class
  let ledClass = "ir-led";
  if (zapState === "zapping") {
    ledClass += isFirstSurf ? " ir-led--blip" : " ir-led--blip-fast";
  }

  // Determine LCD flicker class
  let lcdClass = "lcd";
  if (zapState === "zapping") {
    lcdClass += " lcd--flicker";
  }

  // SURF key pressed state
  let surfKeyClass = "surf-key";
  if (zapState === "zapping") {
    surfKeyClass += " surf-key--pressed";
  }

  return (
    <div className="remote" role="group" aria-label="Surfdeck remote control">
      {/* IR LED */}
      <div className={ledClass} aria-hidden="true" />

      {/* LCD Readout */}
      <div className={lcdClass} aria-live="polite" aria-atomic="true">
        <span className="lcd__text">{lcdText}</span>
      </div>

      {/* SURF Key */}
      <button
        type="button"
        className={surfKeyClass}
        onClick={onSurf}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label="Surf — open a random site in a new tab"
      >
        {isLoading ? "SURFING…" : "SURF"}
      </button>

      {/* Mood Keys */}
      <div className="mood-keys" role="group" aria-label="Mood selector">
        {MOOD_KEYS.map(({ keycap, label, value }) => {
          const isActive = value !== null && selectedMood === value;

          return (
            <button
              key={keycap}
              type="button"
              className={`mood-key${isActive ? " mood-key--active" : ""}`}
              aria-pressed={isActive}
              aria-label={label}
              onClick={() => handleMoodClick(value)}
            >
              {keycap}
            </button>
          );
        })}
      </div>

      {/* INPUT Key */}
      <button
        type="button"
        className={`input-key${cornerMode ? " input-key--active" : ""}`}
        onClick={onCornerToggle}
        aria-pressed={cornerMode}
        aria-label={cornerMode ? "Switch to open web mode" : "Switch to vibecoded mode"}
      >
        {cornerMode ? "INPUT: VIBECODED" : "INPUT: OPEN WEB"}
      </button>
    </div>
  );
}
