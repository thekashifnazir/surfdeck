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
 * Renders four character buttons as chips with single-select toggle-off behaviour.
 */
export default function CharacterFilter({ selectedCharacter, onCharacterChange }: CharacterFilterProps) {
  function handleClick(value: string) {
    if (selectedCharacter === value) {
      onCharacterChange(null);
    } else {
      onCharacterChange(value);
    }
  }

  return (
    <div className="filters__group">
      <div className="filters__label">Character</div>
      <div className="chip-row" role="group" aria-label="Character filter">
        {CHARACTERS.map(({ label, value }) => {
          const isSelected = selectedCharacter === value;

          return (
            <button
              key={value}
              type="button"
              className={`chip${isSelected ? " chip--active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => handleClick(value)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
