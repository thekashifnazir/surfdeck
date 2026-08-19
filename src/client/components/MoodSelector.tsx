/** The six mood buttons in display order, with their API query values. */
const MOODS: { label: string; value: string | null }[] = [
  { label: "Show me something useful", value: "useful" },
  { label: "Teach me something", value: "learn" },
  { label: "Waste my time", value: "waste_time" },
  { label: "Show me something beautiful", value: "beautiful" },
  { label: "Make me think", value: "think" },
  { label: "Surprise me", value: null },
];

export interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodChange: (mood: string | null) => void;
}

/**
 * Renders six mood buttons with single-select toggle-off behaviour.
 *
 * - Clicking an unselected mood activates it (sets the query value).
 * - Clicking the already-selected mood deselects it (sets null).
 * - "Surprise me" always sets null (equivalent to no mood filter).
 * - The selected button is visually distinguished via aria-pressed and styling.
 */
export default function MoodSelector({ selectedMood, onMoodChange }: MoodSelectorProps) {
  function handleClick(value: string | null) {
    if (value === null) {
      // "Surprise me" always clears the mood filter
      onMoodChange(null);
    } else if (selectedMood === value) {
      // Toggle off: clicking the already-selected mood deselects it
      onMoodChange(null);
    } else {
      onMoodChange(value);
    }
  }

  return (
    <div role="group" aria-label="Mood selector">
      {MOODS.map(({ label, value }) => {
        const isSelected = value !== null && selectedMood === value;

        return (
          <button
            key={label}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleClick(value)}
            style={{
              margin: "0.25rem",
              padding: "0.5rem 1rem",
              border: isSelected ? "2px solid #1a73e8" : "2px solid #ccc",
              borderRadius: "6px",
              background: isSelected ? "#e8f0fe" : "#fff",
              color: isSelected ? "#1a73e8" : "#333",
              fontWeight: isSelected ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
