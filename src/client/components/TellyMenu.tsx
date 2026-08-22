import { useState } from "react";
import type { BuildFilterSelection, AvailableFilters } from "../App";
import { getProvenanceLabel } from "../provenance-labels";
import { CHARACTERS } from "../character-labels";
import { TIER_LABELS } from "../../shared/vibecoded-tiers";
import { GROUP_GLOSS, CHIP_GLOSS } from "../gloss-map";

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

  // --- Info strip: reserved bottom line describing the hovered/focused chip ---
  // State is null when idle; otherwise holds the chip's label + gloss. Only set
  // when a CHIP_GLOSS entry exists for the value, so unmapped chips leave the
  // strip on its idle text (no crash, no blank populated line).
  const [hint, setHint] = useState<{ label: string; gloss: string } | null>(
    null
  );

  function showHint(label: string, value: string) {
    const gloss = CHIP_GLOSS[value];
    if (gloss) setHint({ label, gloss });
  }

  function clearHint() {
    setHint(null);
  }

  // --- BUILD DIALS collapse: STACK + HOSTED ON + TYPE hide behind one toggle,
  // collapsed by default. CHARACTER stays above; TIER (corner mode) is separate. ---
  const [buildDialsOpen, setBuildDialsOpen] = useState(false);

  const className = `osd${open ? " osd--open" : ""}`;

  return (
    <div className={className} role="dialog" aria-label="Tuning menu">
      <div className="osd__scanlines" aria-hidden="true" />
      <div className="osd__header">&mdash; TUNING &mdash;</div>
      <div className="osd__subtitle">
        narrow the surf &mdash; or just press SURF and take your chances
      </div>
      <div className="osd__body">
      {cornerMode ? (
        // VIBECODED mode: tier chips
        <div className="filters__group">
          <div className="filters__labelbox">
            <div className="filters__label">Tier</div>
            <div className="filters__gloss">{GROUP_GLOSS.tier}</div>
          </div>
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
                  onMouseEnter={() => showHint(label, String(tier))}
                  onFocus={() => showHint(label, String(tier))}
                  onMouseLeave={clearHint}
                  onBlur={clearHint}
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
            <div className="filters__labelbox">
              <div className="filters__label">Character</div>
              <div className="filters__gloss">{GROUP_GLOSS.character}</div>
            </div>
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
                    onMouseEnter={() => showHint(label, value)}
                    onFocus={() => showHint(label, value)}
                    onMouseLeave={clearHint}
                    onBlur={clearHint}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BUILD DIALS — collapsible section wrapping STACK + HOSTED ON +
              TYPE. Collapsed by default; toggled by the dashed row below.
              CHARACTER (above) is always visible; TIER (corner mode) is
              separate. */}
          <button
            type="button"
            className="osd__build-dials-toggle"
            aria-expanded={buildDialsOpen}
            aria-controls="osd-build-dials"
            onClick={() => setBuildDialsOpen((v) => !v)}
          >
            <span className="osd__build-dials-chevron" aria-hidden="true">
              {buildDialsOpen ? "\u25BE" : "\u25B8"}
            </span>
            <span className="osd__build-dials-label">
              BUILD DIALS &mdash; filter by what it&rsquo;s built with (for the
              curious)
            </span>
          </button>

          <div
            id="osd-build-dials"
            className={`osd__build-dials${
              buildDialsOpen ? " osd__build-dials--open" : ""
            }`}
          >
          {/* Stack */}
          {availableFilters.stacks.filter((v) => v !== "" && v != null).length >
            0 && (
            <div className="filters__group">
              <div className="filters__labelbox">
                <div className="filters__label">Stack</div>
                <div className="filters__gloss">{GROUP_GLOSS.stack}</div>
              </div>
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
                        onMouseEnter={() =>
                          showHint(getProvenanceLabel(value), value)
                        }
                        onFocus={() =>
                          showHint(getProvenanceLabel(value), value)
                        }
                        onMouseLeave={clearHint}
                        onBlur={clearHint}
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
              <div className="filters__labelbox">
                <div className="filters__label">Hosted on</div>
                <div className="filters__gloss">{GROUP_GLOSS.host}</div>
              </div>
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
                        onMouseEnter={() =>
                          showHint(getProvenanceLabel(value), value)
                        }
                        onFocus={() =>
                          showHint(getProvenanceLabel(value), value)
                        }
                        onMouseLeave={clearHint}
                        onBlur={clearHint}
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
              <div className="filters__labelbox">
                <div className="filters__label">Type</div>
                <div className="filters__gloss">
                  {GROUP_GLOSS.static_or_dynamic}
                </div>
              </div>
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
                        onMouseEnter={() =>
                          showHint(getProvenanceLabel(value), value)
                        }
                        onFocus={() =>
                          showHint(getProvenanceLabel(value), value)
                        }
                        onMouseLeave={clearHint}
                        onBlur={clearHint}
                      >
                        {getProvenanceLabel(value)}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
          </div>
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

      {/* Info strip — reserved bottom line; describes the hovered/focused chip
          or shows idle guidance. Fixed min-height so there is no layout shift
          between idle and populated states. */}
      <div className="osd__info-strip" aria-live="polite">
        {hint ? (
          <>
            <span className="osd__info-strip-label">{hint.label}</span>
            {" \u2014 "}
            {hint.gloss}
          </>
        ) : (
          "hover any option to see what it means"
        )}
      </div>
    </div>
  );
}
