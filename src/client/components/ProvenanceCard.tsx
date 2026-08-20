import type { SurfSite } from "../App";
import { getProvenanceLabel } from "../provenance-labels";

export interface ProvenanceCardProps {
  site: SurfSite;
}

/**
 * Checks whether a provenance field value should be displayed.
 * Returns false for null, empty string, or the literal string "unknown".
 */
function isDisplayable(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.trim() === "") return false;
  if (value.toLowerCase() === "unknown") return false;
  return true;
}

/**
 * ProvenanceCard displays how a surfed site was built.
 *
 * - Shows non-blank provenance fields (stack, host, static_or_dynamic) with labels.
 * - Omits any field whose value is null, empty, or "unknown".
 * - If all three fields are blank: shows "Hand-made on the open web."
 * - Never displays the literal string "unknown".
 * - Renders entirely from precomputed data — no network requests, no loading state.
 */
export default function ProvenanceCard({ site }: ProvenanceCardProps) {
  const fields: { label: string; value: string }[] = [];

  if (isDisplayable(site.stack)) {
    fields.push({ label: "Stack", value: getProvenanceLabel(site.stack) });
  }
  if (isDisplayable(site.host)) {
    fields.push({ label: "Hosted on", value: getProvenanceLabel(site.host) });
  }
  if (isDisplayable(site.static_or_dynamic)) {
    fields.push({ label: "Type", value: getProvenanceLabel(site.static_or_dynamic) });
  }

  // All three provenance fields are blank — show the quiet fallback line
  if (fields.length === 0) {
    return (
      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "#64748b",
            fontStyle: "italic",
          }}
        >
          Hand-made on the open web.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <dl style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem" }}>
        {fields.map(({ label, value }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column" }}>
            <dt
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.025em",
              }}
            >
              {label}
            </dt>
            <dd style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b" }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
