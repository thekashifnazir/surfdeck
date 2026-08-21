import type { BuildFilterSelection } from "../App";
import { getProvenanceLabel } from "../provenance-labels";

/** The subset of available filter values that BuildFilter needs (string arrays only). */
export interface BuildFilterAvailable {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
}

/** Friendly labels for each build filter dimension. */
const DIMENSION_LABELS: Record<keyof BuildFilterSelection, string> = {
  stacks: "Stack",
  hosts: "Hosted on",
  static_or_dynamic: "Type",
};

export interface BuildFilterProps {
  available: BuildFilterAvailable;
  selected: BuildFilterSelection;
  onSelectionChange: (selection: BuildFilterSelection) => void;
}

/**
 * Renders three build filter groups (stack, host, static_or_dynamic) as chip rows.
 * Multi-select toggle within each group.
 */
export default function BuildFilter({ available, selected, onSelectionChange }: BuildFilterProps) {
  function handleToggle(dimension: keyof BuildFilterSelection, value: string) {
    const current = selected[dimension];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onSelectionChange({ ...selected, [dimension]: next });
  }

  const dimensions: { availableKey: keyof BuildFilterAvailable; selectionKey: keyof BuildFilterSelection }[] = [
    { availableKey: "stacks", selectionKey: "stacks" },
    { availableKey: "hosts", selectionKey: "hosts" },
    { availableKey: "static_or_dynamic", selectionKey: "static_or_dynamic" },
  ];

  return (
    <div role="group" aria-label="Build filters">
      {dimensions.map(({ availableKey, selectionKey }) => {
        const values = available[availableKey].filter((v) => v !== "" && v != null);
        if (values.length === 0) return null;

        return (
          <div key={selectionKey} className="filters__group">
            <div className="filters__label">{DIMENSION_LABELS[selectionKey]}</div>
            <div className="chip-row">
              {values.map((value) => {
                const isSelected = selected[selectionKey].includes(value);

                return (
                  <button
                    key={value}
                    type="button"
                    className={`chip${isSelected ? " chip--active" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => handleToggle(selectionKey, value)}
                  >
                    {getProvenanceLabel(value)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
