import { TIER_LABELS } from "../../shared/vibecoded-tiers";

export interface CornerTierFilterProps {
  availableTiers: number[];
  selectedTiers: number[];
  onTierChange: (tiers: number[]) => void;
}

/**
 * Renders tier filter buttons for the Vibecoded Corner mode.
 *
 * - Only tiers present in `availableTiers` are rendered.
 * - Buttons act as multi-select toggles: click to add/remove a tier.
 * - The "YOLO" button clears the tier selection (surf all tiers).
 * - YOLO appears active when no tiers are selected (i.e., no tier filter).
 */
export default function CornerTierFilter({
  availableTiers,
  selectedTiers,
  onTierChange,
}: CornerTierFilterProps) {
  function handleTierToggle(tier: number) {
    if (selectedTiers.includes(tier)) {
      onTierChange(selectedTiers.filter((t) => t !== tier));
    } else {
      onTierChange([...selectedTiers, tier]);
    }
  }

  function handleYolo() {
    onTierChange([]);
  }

  const isYoloActive = selectedTiers.length === 0;

  return (
    <div role="group" aria-label="Tier filter">
      {availableTiers.map((tier) => {
        const label = TIER_LABELS[tier];
        if (!label) return null;

        const isSelected = selectedTiers.includes(tier);

        return (
          <button
            key={tier}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleTierToggle(tier)}
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
      <button
        type="button"
        aria-pressed={isYoloActive}
        onClick={handleYolo}
        style={{
          margin: "0.25rem",
          padding: "0.5rem 1rem",
          border: isYoloActive ? "2px solid #1a73e8" : "2px solid #ccc",
          borderRadius: "6px",
          background: isYoloActive ? "#e8f0fe" : "#fff",
          color: isYoloActive ? "#1a73e8" : "#333",
          fontWeight: isYoloActive ? 600 : 400,
          cursor: "pointer",
        }}
      >
        YOLO — surf all tiers
      </button>
    </div>
  );
}
