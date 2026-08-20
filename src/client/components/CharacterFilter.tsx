/** The four character options with user-friendly labels and their API query values. */
const CHARACTERS: { label: string; value: string }[] = [
  { label: "Modern Indie", value: "modern_indie" },
  { label: "Old Web", value: "old_web" },
  { label: "Retro Personal", value: "retro_personal" },
  { label: "Minimal Static", value: "minimal_static" },
];

export interface CharacterFilterProps {
  selectedCharacter: string | null;
  onCharacterChange: (character: string | null) => void;
}

/**
 * Renders four character buttons with single-select toggle-off behaviour.
 *
 * - Clicking an unselected character activates it.
 * - Clicking the already-selected character deselects it (sets null).
 * - At most one character is active at a time.
 * - No default selection.
 * - Selection persists across surfs until the user explicitly changes it.
 */
export default function CharacterFilter({ selectedCharacter, onCharacterChange }: CharacterFilterProps) {
  function handleClick(value: string) {
    if (selectedCharacter === value) {
      // Toggle off: clicking the already-selected character deselects it
      onCharacterChange(null);
    } else {
      onCharacterChange(value);
    }
  }

  return (
    <div role="group" aria-label="Character filter">
      {CHARACTERS.map(({ label, value }) => {
        const isSelected = selectedCharacter === value;

        return (
          <button
            key={value}
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
