import { useEffect, useState } from "react";
import type {
  ZapState,
  StatusKind,
  BuildFilterSelection,
  AvailableFilters,
} from "../App";
import TellyMenu from "./TellyMenu";

/**
 * How long an embed may take to load before the telly gives up and shows the
 * pressable fallback. A backstop for sites whose framing headers changed since
 * the precomputed embeddable check.
 */
const LOAD_FAILURE_TIMEOUT_MS = 5000;

export interface TellyProps {
  zapState: ZapState;
  isFirstSurf: boolean;
  channelNumber: number | null;
  status: StatusKind;
  // URL to embed inside the telly screen. When set, the telly renders an
  // iframe; if it fails to load within the failure window it swaps to the
  // pressable fallback for this same URL.
  embeddedUrl?: string | null;
  // URL of the currently-surfed site, used by the pressable fallback control
  // to open the site in a new tab (non-embeddable sites are not auto-opened,
  // and an embed that fails to load falls back to opening this URL).
  siteUrl?: string | null;
  // Title of the currently-surfed site, shown on the pressable fallback button
  // (e.g. "SMASHING MAGAZINE won't tune in — press to open it across the room").
  siteTitle?: string | null;
  // On-screen TUNING menu (OSD) — overlaid inside the screen
  menuOpen: boolean;
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
 * The Telly — a CRT television screen that shows:
 * - idle: blank/off
 * - static: CSS noise animation during zap
 * - tuned: channel number + subtitle (persists until next press)
 * - exhausted: snow + NO SIGNAL
 *
 * The on-screen TUNING menu (TellyMenu) overlays the screen above all of the
 * above states — and, in a later phase, above the embedded iframe.
 */
export default function Telly({
  zapState,
  isFirstSurf,
  channelNumber,
  status,
  embeddedUrl,
  siteUrl,
  siteTitle,
  menuOpen,
  cornerMode,
  selectedCharacter,
  onCharacterChange,
  buildFilters,
  onSelectionChange,
  availableFilters,
  selectedTiers,
  onTierChange,
  onClearAll,
}: TellyProps) {
  // Track iframe load so the CSS fade-in can trigger via the --loaded class.
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Set once the load-failure timer expires for the current embed. When true,
  // the telly abandons the iframe and shows the pressable fallback instead.
  const [loadFailed, setLoadFailed] = useState(false);

  // Reset the loaded/failed flags whenever the embedded URL changes so a new
  // channel starts fresh rather than inheriting the previous site's state.
  useEffect(() => {
    setIframeLoaded(false);
    setLoadFailed(false);
  }, [embeddedUrl]);

  const tuned = zapState === "tuned" && status !== "exhausted";
  // Only render the iframe while the embed is live and hasn't failed to load.
  const showIframe = tuned && Boolean(embeddedUrl) && !loadFailed;
  // The embed is "live" (loading or loaded) whenever the iframe is shown. While
  // it loads we keep the TV static running underneath it and suppress the CH
  // readout so nothing bleeds through behind the frame. Once onLoad fires, the
  // static fades out and the iframe fades in.
  const embedLoading = showIframe && !iframeLoaded;

  // Load-failure timer: when an embed is showing, arm a 5s timer. The iframe's
  // onload clears it (see onLoad below); if it expires first we swap to the
  // pressable fallback. onload is NOT treated as proof the site rendered —
  // Chrome fires onload even for XFO-blocked frames, so we still need the
  // timer as a backstop for sites whose headers changed since the last check.
  useEffect(() => {
    if (!showIframe || iframeLoaded) return;
    const timer = setTimeout(() => setLoadFailed(true), LOAD_FAILURE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [showIframe, iframeLoaded]);

  // A surf landed on a non-embeddable site (tuned, no embed URL, and the surf
  // resolved to an actual site rather than idle/no_match), OR an embed failed
  // to load within the timeout. Either way, show the pressable fallback.
  const nonEmbeddable =
    tuned && !embeddedUrl && (status === "ok" || status === "popup_blocked");
  const showFallback = nonEmbeddable || (tuned && Boolean(embeddedUrl) && loadFailed);

  // The URL the pressable fallback opens. For a load-failure it is the embed
  // URL; for a non-embeddable site it is the surfed site URL (which App passes
  // since the site is not auto-opened).
  const fallbackUrl = embeddedUrl ?? siteUrl ?? null;

  // The caught site's name for the fallback button. Falls back to a generic
  // label if the title is missing so the sentence always reads sensibly.
  const fallbackName = (siteTitle ?? "").trim() || "This channel";

  // Determine screen state class. When an embed is live the screen itself is a
  // plain dark backdrop (the iframe + loading-static layer sit on top of it);
  // this prevents the tuned off-white backdrop showing through the frame.
  let screenClass = "telly__screen";

  if (status === "exhausted") {
    screenClass += " telly__screen--exhausted";
  } else if (showIframe) {
    screenClass += " telly__screen--embed";
  } else if (zapState === "zapping") {
    screenClass += isFirstSurf ? " telly__screen--static" : " telly__screen--static-fast";
  } else if (zapState === "tuned") {
    screenClass += isFirstSurf ? " telly__screen--tuned" : " telly__screen--tuned-fast";
  } else {
    screenClass += " telly__screen--idle";
  }

  // The CH readout + subtitle only belong to a plain tuned channel (no embed).
  // While an embed is loading or showing, the frame owns the screen and no
  // channel text may bleed through behind it. It still appears in the fallback
  // and (via NO SIGNAL) exhausted states, per requirement 2.
  const showChannelReadout =
    zapState === "tuned" &&
    status !== "exhausted" &&
    channelNumber !== null &&
    !showIframe;

  return (
    <div className="telly" role="region" aria-label="Channel display">
      <div className={screenClass} aria-live="polite">
        {/* Exhausted state */}
        {status === "exhausted" && (
          <span className="telly__no-signal">NO SIGNAL</span>
        )}

        {/* Tuned state — channel display (plain channel only; suppressed while
            an embed is loading/showing so nothing bleeds through the frame) */}
        {showChannelReadout && (
          <>
            <span className="telly__channel">CH {channelNumber}</span>
            <span className="telly__subtitle">
              somebody's hand-made site → opens in a new tab
            </span>
          </>
        )}

        {/* Loading static — while the embed loads, keep the TV static running
            (same visual language as the zap ceremony) instead of a bare
            backdrop. It fades out as the iframe fades in once onLoad fires.
            Under prefers-reduced-motion the CSS shows a plain dark screen. */}
        {embedLoading && (
          <div className="telly__embed-static" aria-hidden="true" />
        )}

        {/* Embedded channel — the surfed site plays inside the screen. The
            iframe owns pointer/wheel/touch over the screen: nothing we render
            sits above it while the menu is closed, so scrolling reaches the
            embedded site (a cross-origin frame the parent cannot script). */}
        {showIframe && (
          <iframe
            title="Embedded channel"
            src={embeddedUrl ?? undefined}
            className={
              iframeLoaded
                ? "telly__iframe telly__iframe--loaded"
                : "telly__iframe"
            }
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onLoad={() => setIframeLoaded(true)}
          />
        )}

        {/* Non-embeddable / load-failure fallback — a pressable control that
            opens the site in a new tab. Clicking it is a user gesture, so
            window.open is not popup-blocked. */}
        {showFallback && (
          <button
            type="button"
            className="telly__screen--fallback"
            onClick={() => {
              if (fallbackUrl) window.open(fallbackUrl, "_blank");
            }}
          >
            <span className="telly__fallback-name">{fallbackName}</span>
            <span className="telly__fallback-line">
              won't tune in — press to open it across the room
            </span>
          </button>
        )}

        {/* On-screen TUNING menu — overlays whatever the screen shows. Only
            interactive (pointer-events) while open, so a closed menu never
            steals scrolling from the embedded iframe. */}
        <TellyMenu
          open={menuOpen}
          cornerMode={cornerMode}
          selectedCharacter={selectedCharacter}
          onCharacterChange={onCharacterChange}
          buildFilters={buildFilters}
          onSelectionChange={onSelectionChange}
          availableFilters={availableFilters}
          selectedTiers={selectedTiers}
          onTierChange={onTierChange}
          onClearAll={onClearAll}
        />
      </div>

      {/* Bezel — the dark frame below the screen. Holds the pop-out control so
          it never overlaps the embedded site's own content. Right-aligned,
          near the stand. Visible only while a site is embedded (hidden once
          the fallback control takes over on load failure). */}
      {showIframe && (
        <div className="telly__bezel">
          <button
            type="button"
            className="telly__popout"
            aria-label="Open this site in a new tab"
            onClick={() => {
              if (embeddedUrl) window.open(embeddedUrl, "_blank");
            }}
          >
            <svg
              className="telly__popout-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
              <path d="M19 19H5V5h6V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2v6z" />
            </svg>
            <span className="telly__popout-label">POP OUT</span>
          </button>
        </div>
      )}
    </div>
  );
}
