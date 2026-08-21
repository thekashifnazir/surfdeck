import { TIER_LABELS } from "../../shared/vibecoded-tiers";

export interface CornerTierFilterProps {
  availableTiers: number[];
  selectedTiers: number[];
  onTierChange: (tiers: number[]) => void;
}

/**
 * Renders tier filter buttons as chips for the Vibecoded Corner mode.
 * Multi-select toggles. YOLO clears selection (surf all tiers).
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
    <div className="filters__group">
      <div className="filters__label">Tier</div>
      <div className="chip-row" role="group" aria-label="Tier filter">
        {availableTiers.map((tier) => {
          const label = TIER_LABELS[tier];
          if (!label) return null;

          const isSelected = selectedTiers.includes(tier);

          return (
            <button
              key={tier}
              type="button"
              className={`chip${isSelected ? " chip--active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => handleTierToggle(tier)}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          className={`chip${isYoloActive ? " chip--active" : ""}`}
          aria-pressed={isYoloActive}
          onClick={handleYolo}
        >
          YOLO
        </button>
      </div>
    </div>
  );
}
