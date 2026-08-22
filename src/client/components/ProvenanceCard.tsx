import type { ReactNode } from "react";
import type { SurfSite } from "../App";
import { getProvenanceLabel } from "../provenance-labels";
import { getProvenanceUrl, NEOCITIES_URL } from "../provenance-urls";
import { getToolInfo, LEAD_LINE_BY_TIER } from "../tool-map";
import { RECIPE_FRAGMENTS } from "../gloss-map";
import { getBuiltWithLabel, getBuiltWithTier, getTierLabel } from "../vibecoded-labels";

export interface ProvenanceCardProps {
  site: SurfSite;
  cornerMode: boolean;
  corpusTotal: number;
  embedded?: boolean;
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
 * Renders a stack/host tech-line part. When the raw corpus value has an entry
 * in the provenance URL map, the label becomes a dotted-coral anchor that opens
 * the official "learn more" page in a new tab. Otherwise it renders as plain
 * text (no broken link).
 */
function renderTechPart(value: string, key: string): ReactNode {
  const label = getProvenanceLabel(value);
  const url = getProvenanceUrl(value);
  return url ? (
    <a
      key={key}
      className="prov-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  ) : (
    <span key={key}>{label}</span>
  );
}

/**
 * Renders the shared MAKE ONE YOURSELF box (identical dashed-coral markup in
 * both modes). `lead` is the sentence with a single embedded CTA anchor; `cue`
 * is the italic-grey time-cue line.
 */
function MakeOneBox({ lead, cue }: { lead: ReactNode; cue: string }): ReactNode {
  return (
    <div className="make-one">
      <p className="make-one__label">MAKE ONE YOURSELF</p>
      <p className="make-one__line">{lead}</p>
      <p className="make-one__cue">
        <span className="make-one__cue-text">{cue}</span>
        <a
          className="prov-link make-one__ladder"
          href="/ouroboros"
          target="_blank"
          rel="noopener noreferrer"
        >
          see the whole ladder →
        </a>
      </p>
    </div>
  );
}

/**
 * Splits a lead-line template on "{Tool}" and renders the tool name as a bold
 * dotted-coral anchor between the surrounding text. Used by the corner variant,
 * whose lead line is keyed off the site's tier (LEAD_LINE_BY_TIER).
 */
function renderTierLead(template: string, toolLabel: string, url: string): ReactNode {
  const [before, after] = template.split("{Tool}");
  return (
    <>
      {before}
      <a className="prov-link" href={url} target="_blank" rel="noopener noreferrer">
        {toolLabel}
      </a>
      {after}
    </>
  );
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
export default function ProvenanceCard({ site, cornerMode, corpusTotal, embedded = false }: ProvenanceCardProps) {
  // Build body content
  let bodyContent: ReactNode;
  let isFallback = false;
  // Open-web recipe line: per-value fragments joined by " — ". Only present
  // fragments are included; the whole line is omitted when neither is present.
  let recipeLine: string | null = null;

  if (cornerMode && isDisplayable(site.built_with)) {
    // Corner mode: builder-first — "Built with {Tool} · Tier {N} — {tier label
    // lowercased}". {Tool} becomes a dotted-coral link when the tool map has a
    // URL for the built_with value; otherwise it renders as plain text.
    const tier = getBuiltWithTier(site.built_with);
    const toolLabel = getBuiltWithLabel(site.built_with);
    const toolInfo = getToolInfo(site.built_with);
    const toolNode: ReactNode = toolInfo ? (
      <a
        className="prov-link"
        href={toolInfo.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {toolLabel}
      </a>
    ) : (
      <span>{toolLabel}</span>
    );
    const tierLabel = tier !== null ? getTierLabel(tier) : null;
    bodyContent = (
      <>
        Built with {toolNode}
        {tier !== null && (
          <>
            {" · "}Tier&nbsp;{tier}
            {tierLabel ? ` — ${tierLabel}` : null}
          </>
        )}
      </>
    );
  } else {
    // Open-web mode: confident provenance fields.
    // stack + host become dotted-coral "learn more" links when a URL is
    // mapped; the type value (Static/Dynamic) stays plain text.
    const parts: ReactNode[] = [];

    if (isDisplayable(site.stack)) {
      parts.push(renderTechPart(site.stack, "stack"));
    }
    if (isDisplayable(site.host)) {
      parts.push(renderTechPart(site.host, "host"));
    }
    if (isDisplayable(site.static_or_dynamic)) {
      // Type is always plain text.
      parts.push(<span key="type">{getProvenanceLabel(site.static_or_dynamic)}</span>);
    }

    // Recipe line — composed from per-value fragments (stack + host).
    const recipeFragments: string[] = [];
    if (isDisplayable(site.stack) && RECIPE_FRAGMENTS[site.stack]) {
      recipeFragments.push(RECIPE_FRAGMENTS[site.stack]);
    }
    if (isDisplayable(site.host) && RECIPE_FRAGMENTS[site.host]) {
      recipeFragments.push(RECIPE_FRAGMENTS[site.host]);
    }
    if (recipeFragments.length > 0) {
      recipeLine = `the recipe: ${recipeFragments.join(" — ")}`;
    }

    if (parts.length === 0) {
      bodyContent = "Hand-made on the open web.";
      isFallback = true;
    } else {
      // Interleave " · " separators between rendered parts.
      bodyContent = parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? " · " : null}
          {part}
        </span>
      ));
    }
  }

  // MAKE ONE YOURSELF block — the card's closer in BOTH modes.
  //   - Corner: rendered only when built_with is displayable AND mapped in the
  //     tool map; lead line keyed off the site's tier (LEAD_LINE_BY_TIER).
  //   - Open-web: ALWAYS rendered; stack-keyed line with a blank-stack fallback
  //     to neocities. Both variants reuse the identical dashed-coral box.
  let makeOneBlock: ReactNode = null;
  if (cornerMode) {
    if (isDisplayable(site.built_with)) {
      const toolInfo = getToolInfo(site.built_with);
      const tier = getBuiltWithTier(site.built_with);
      const leadTemplate = tier !== null ? LEAD_LINE_BY_TIER[tier] : undefined;
      // Only render when the tool is mapped AND a tier-keyed lead line exists.
      if (toolInfo && leadTemplate) {
        const toolLabel = getBuiltWithLabel(site.built_with);
        makeOneBlock = (
          <MakeOneBox
            lead={renderTierLead(leadTemplate, toolLabel, toolInfo.url)}
            cue={toolInfo.timeCue}
          />
        );
      }
    }
  } else {
    // Open-web: stack-keyed line, with the blank-stack path covering stackless
    // sites. Fixed time-cue.
    const stack = site.stack;
    const lead = isDisplayable(stack) ? (
      <>
        This site was hand-built with {getProvenanceLabel(stack)}.{" "}
        <a
          className="prov-link"
          href={getProvenanceUrl(stack) ?? NEOCITIES_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Start yours →
        </a>
      </>
    ) : (
      <>
        This site was made by a person, not a platform.{" "}
        <a className="prov-link" href={NEOCITIES_URL} target="_blank" rel="noopener noreferrer">
          Start yours →
        </a>
      </>
    );
    makeOneBlock = <MakeOneBox lead={lead} cue="a text editor and a free host is all it takes" />;
  }

  return (
    <div className="prov-card">
      <p className="prov-card__title">{site.title}</p>
      <p className="prov-card__heading">
        CATCH №&nbsp;{site.id} ·{" "}
        {cornerMode ? "VIBECODED CORNER" : `ONE OF ${corpusTotal} HAND-PICKED SITES`}
      </p>
      <p className={`prov-card__body${isFallback ? " prov-card__body--fallback" : ""}`}>
        {bodyContent}
      </p>
      {recipeLine && (
        <p className="prov-card__recipe">{recipeLine}</p>
      )}
      {site.why_note && (
        <p className="prov-card__why">{site.why_note}</p>
      )}
      {/* Open-web only: dashed divider + footer. Corner mode omits the footer
          entirely — the MAKE ONE YOURSELF box (task 20) closes the card. */}
      {!cornerMode && (
        <>
          <hr className="prov-card__divider" />
          <p className="prov-card__footer">
            Everyone's a builder.{" "}
            <span className="prov-card__footer-emph">Learn from this one</span> — tap
            the underlined parts.
          </p>
        </>
      )}
      {makeOneBlock}
      <span className="prov-card__stamp" aria-hidden="true">
        {embedded ? "OPENS IN TELLY" : "OPENS IN NEW TAB"}
      </span>
    </div>
  );
}
