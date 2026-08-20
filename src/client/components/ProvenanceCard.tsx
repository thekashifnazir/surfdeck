import type { SurfSite } from "../App";
import { getProvenanceLabel } from "../provenance-labels";
import { getBuiltWithLabel, getBuiltWithTier, getTierLabel } from "../vibecoded-labels";

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
 * Builds the tertiary "(runs: ...)" string from non-blank provenance fields.
 * Returns null if no fields are displayable.
 */
function buildRunsLine(site: SurfSite): string | null {
  const parts: string[] = [];
  if (isDisplayable(site.stack)) parts.push(getProvenanceLabel(site.stack));
  if (isDisplayable(site.host)) parts.push(getProvenanceLabel(site.host));
  if (isDisplayable(site.static_or_dynamic)) parts.push(getProvenanceLabel(site.static_or_dynamic));
  if (parts.length === 0) return null;
  return `(runs: ${parts.join(" · ")})`;
}

/**
 * ProvenanceCard displays how a surfed site was built.
 *
 * For vibecoded sites (built_with is non-null):
 *   - Primary: "Built with {label}"
 *   - Secondary: "{TIER_LABELS[tier]} · Tier {N}"
 *   - Tertiary: "(runs: {stack} · {host} · {static_or_dynamic})" — only non-blank values
 *
 * For open-web sites (built_with is null):
 *   - Shows non-blank provenance fields (stack, host, static_or_dynamic) with labels.
 *   - If all three fields are blank: shows "Hand-made on the open web."
 *
 * Never displays the literal string "unknown".
 * Renders entirely from precomputed data — no network requests, no loading state.
 */
export default function ProvenanceCard({ site }: ProvenanceCardProps) {
  // Vibecoded site with a known builder — builder-first layout
  if (isDisplayable(site.built_with)) {
    const tier = getBuiltWithTier(site.built_with);
    const tierLabel = tier !== null ? getTierLabel(tier) : null;
    const runsLine = buildRunsLine(site);

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
        {/* Primary: builder */}
        <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
          Built with {getBuiltWithLabel(site.built_with)}
        </p>

        {/* Secondary: tier label + number */}
        {tier !== null && tierLabel !== null && (
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            {tierLabel} &middot; Tier {tier}
          </p>
        )}

        {/* Tertiary: runtime provenance (demoted) */}
        {runsLine && (
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.8rem",
              color: "#94a3b8",
              fontStyle: "italic",
            }}
          >
            {runsLine}
          </p>
        )}
      </div>
    );
  }

  // Open-web site — existing behaviour
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
