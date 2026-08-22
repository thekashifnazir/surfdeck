import type { BuildFilterSelection, AvailableFilters } from "../App";
import { getProvenanceLabel } from "../provenance-labels";
import { TIER_LABELS } from "../../shared/vibecoded-tiers";

/** The four character options with user-friendly labels and their API query values. */
const CHARACTERS: { label: string; value: string }[] = [
  { label: "Modern Indie", value: "modern_indie" },
  { label: "Old Web", value: "old_web" },
  { label: "Retro Personal", value: "retro_personal" },
  { label: "Minimal Static", value: "minimal_static" },
];

export interface TellyMenuProps {
  open: boolean;
  cornerMode: boolean;
  selectedCharacter: string | null;
  onCharacterChange: (character: string | null) => void;
  buildFilters: BuildFilterSelection;
  onSelectionChange: (selection: BuildFilterSelection) => void;
  availableFilters: AvailableFilters;
  selectedTiers: number[];
  onTierChange: (tiers: number[]) => void;
  onClearAll: () => void;
}

/**
 * TellyMenu — the on-screen TUNING display (OSD) overlaid inside the telly
 * screen. Toggled by the remote's MENU key; sits above whatever the screen
 * is showing (idle / static / tuned / future iframe embed).
 * Shows character + build filters in OPEN WEB mode, tier chips in VIBECODED mode.
 */
export default function TellyMenu({
  open,
  cornerMode,
  selectedCharacter,
  onCharacterChange,
  buildFilters,
  onSelectionChange,
  availableFilters,
  selectedTiers,
  onTierChange,
  onClearAll,
}: TellyMenuProps) {
  // --- Character chip toggle (single-select, toggle-off) ---
  function handleCharacterClick(value: string) {
    if (selectedCharacter === value) {
      onCharacterChange(null);
    } else {
      onCharacterChange(value);
    }
  }

  // --- Build filter chip toggle (multi-select within dimension) ---
  function handleBuildToggle(
    dimension: keyof BuildFilterSelection,
    value: string
  ) {
    const current = buildFilters[dimension];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onSelectionChange({ ...buildFilters, [dimension]: next });
  }

  // --- Tier chip toggle (multi-select) ---
  function handleTierToggle(tier: number) {
    if (selectedTiers.includes(tier)) {
      onTierChange(selectedTiers.filter((t) => t !== tier));
    } else {
      onTierChange([...selectedTiers, tier]);
    }
  }

  const className = `osd${open ? " osd--open" : ""}`;

  return (
    <div className={className} role="dialog" aria-label="Tuning menu">
      <div className="osd__scanlines" aria-hidden="true" />
      <div className="osd__header">&mdash; TUNING &mdash;</div>
      <div className="osd__body">
      {cornerMode ? (
        // VIBECODED mode: tier chips
        <div className="filters__group">
          <div className="filters__label">Tier</div>
          <div className="chip-row" role="group" aria-label="Tier filter">
            {availableFilters.corner_tiers.map((tier) => {
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
          </div>
        </div>
      ) : (
        // OPEN WEB mode: character + stack + host + static/dynamic
        <>
          {/* Character */}
          <div className="filters__group">
            <div className="filters__label">Character</div>
            <div
              className="chip-row"
              role="group"
              aria-label="Character filter"
            >
              {CHARACTERS.map(({ label, value }) => {
                const isSelected = selectedCharacter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`chip${isSelected ? " chip--active" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => handleCharacterClick(value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stack */}
          {availableFilters.stacks.filter((v) => v !== "" && v != null).length >
            0 && (
            <div className="filters__group">
              <div className="filters__label">Stack</div>
              <div className="chip-row" role="group" aria-label="Stack filter">
                {availableFilters.stacks
                  .filter((v) => v !== "" && v != null)
                  .map((value) => {
                    const isSelected = buildFilters.stacks.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`chip${isSelected ? " chip--active" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => handleBuildToggle("stacks", value)}
                      >
                        {getProvenanceLabel(value)}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Host */}
          {availableFilters.hosts.filter((v) => v !== "" && v != null).length >
            0 && (
            <div className="filters__group">
              <div className="filters__label">Hosted on</div>
              <div className="chip-row" role="group" aria-label="Host filter">
                {availableFilters.hosts
                  .filter((v) => v !== "" && v != null)
                  .map((value) => {
                    const isSelected = buildFilters.hosts.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`chip${isSelected ? " chip--active" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => handleBuildToggle("hosts", value)}
                      >
                        {getProvenanceLabel(value)}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Static/Dynamic */}
          {availableFilters.static_or_dynamic.filter(
            (v) => v !== "" && v != null
          ).length > 0 && (
            <div className="filters__group">
              <div className="filters__label">Type</div>
              <div className="chip-row" role="group" aria-label="Type filter">
                {availableFilters.static_or_dynamic
                  .filter((v) => v !== "" && v != null)
                  .map((value) => {
                    const isSelected =
                      buildFilters.static_or_dynamic.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`chip${isSelected ? " chip--active" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleBuildToggle("static_or_dynamic", value)
                        }
                      >
                        {getProvenanceLabel(value)}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Clear all button */}
      <button
        type="button"
        className="osd__clear"
        onClick={onClearAll}
      >
        Clear all &times;
      </button>
      </div>
    </div>
  );
}
