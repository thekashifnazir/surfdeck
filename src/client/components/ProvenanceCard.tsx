import type { SurfSite } from "../App";
import { getProvenanceLabel } from "../provenance-labels";
import { getBuiltWithLabel, getBuiltWithTier, getTierLabel } from "../vibecoded-labels";

// Update when data/featured-sites.csv changes. Source of truth: SELECT COUNT(*) FROM sites WHERE nsfw = 0
const CORPUS_TOTAL = 349;

export interface ProvenanceCardProps {
  site: SurfSite;
  cornerMode: boolean;
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
 * ProvenanceCard — the typed card that prints from the slot under the telly.
 *
 * Design:
 *   - Heading: HOW THIS SITE IS BUILT — CATCH № {n} OF {CORPUS_TOTAL}
 *   - Body: confident fields joined by · (open-web) or builder-first (corner)
 *   - Footer: "Everyone's a builder. Learn from the sites you like."
 *   - Stamp: OPENS IN NEW TAB (rotated)
 *
 * Never displays "unknown · unknown · unknown".
 * All-blank fallback: "Hand-made on the open web."
 */
export default function ProvenanceCard({ site, cornerMode }: ProvenanceCardProps) {
  // Build body content
  let bodyContent: string;
  let isFallback = false;

  if (cornerMode && isDisplayable(site.built_with)) {
    // Corner mode: builder-first
    const tier = getBuiltWithTier(site.built_with);
    const parts = [`Built with ${getBuiltWithLabel(site.built_with)}`];
    if (tier !== null) {
      parts.push(`Tier ${tier}`);
    }
    bodyContent = parts.join(" · ");
  } else {
    // Open-web mode: confident provenance fields
    const parts: string[] = [];
    if (isDisplayable(site.stack)) parts.push(getProvenanceLabel(site.stack));
    if (isDisplayable(site.host)) parts.push(getProvenanceLabel(site.host));
    if (isDisplayable(site.static_or_dynamic)) parts.push(getProvenanceLabel(site.static_or_dynamic));

    if (parts.length === 0) {
      bodyContent = "Hand-made on the open web.";
      isFallback = true;
    } else {
      bodyContent = parts.join(" · ");
    }
  }

  return (
    <div className="prov-card">
      <p className="prov-card__heading">
        HOW THIS SITE IS BUILT — CATCH №&nbsp;{site.id} OF {CORPUS_TOTAL}
      </p>
      <p className={`prov-card__body${isFallback ? " prov-card__body--fallback" : ""}`}>
        {bodyContent}
      </p>
      <p className="prov-card__footer">
        Everyone's a builder. Learn from the sites you like.
      </p>
      <span className="prov-card__stamp" aria-hidden="true">
        OPENS IN NEW TAB
      </span>
    </div>
  );
}
