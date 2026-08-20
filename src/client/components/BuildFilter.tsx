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
 * Renders three build filter groups (stack, host, static_or_dynamic) with
 * multi-select toggle behaviour within each group.
 *
 * - Values are populated from the /api/filters response (passed as `available`).
 * - Clicking an unselected value adds it to the selection (OR within dimension).
 * - Clicking a selected value removes it from the selection.
 * - All deselected = no build filter constraint for that dimension.
 * - Blank/empty values are never displayed.
 */
export default function BuildFilter({ available, selected, onSelectionChange }: BuildFilterProps) {
  function handleToggle(dimension: keyof BuildFilterSelection, value: string) {
    const current = selected[dimension];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onSelectionChange({ ...selected, [dimension]: next });
  }

  /** Maps an BuildFilterAvailable key to its corresponding BuildFilterSelection key. */
  const dimensions: { availableKey: keyof BuildFilterAvailable; selectionKey: keyof BuildFilterSelection }[] = [
    { availableKey: "stacks", selectionKey: "stacks" },
    { availableKey: "hosts", selectionKey: "hosts" },
    { availableKey: "static_or_dynamic", selectionKey: "static_or_dynamic" },
  ];

  return (
    <div role="group" aria-label="Build filters">
      {dimensions.map(({ availableKey, selectionKey }) => {
        // Filter out blank/empty values
        const values = available[availableKey].filter((v) => v !== "" && v != null);

        if (values.length === 0) return null;

        return (
          <fieldset
            key={selectionKey}
            style={{ border: "none", padding: 0, margin: "0.5rem 0" }}
          >
            <legend style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              {DIMENSION_LABELS[selectionKey]}
            </legend>
            <div>
              {values.map((value) => {
                const isSelected = selected[selectionKey].includes(value);

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggle(selectionKey, value)}
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
                    {getProvenanceLabel(value)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
