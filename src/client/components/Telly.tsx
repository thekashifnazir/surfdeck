import type { ZapState, StatusKind } from "../App";

export interface TellyProps {
  zapState: ZapState;
  isFirstSurf: boolean;
  channelNumber: number | null;
  status: StatusKind;
}

/**
 * The Telly — a CRT television screen that shows:
 * - idle: blank/off
 * - static: CSS noise animation during zap
 * - tuned: channel number + subtitle (persists until next press)
 * - exhausted: snow + NO SIGNAL
 */
export default function Telly({ zapState, isFirstSurf, channelNumber, status }: TellyProps) {
  // Determine screen state class
  let screenClass = "telly__screen";

  if (status === "exhausted") {
    screenClass += " telly__screen--exhausted";
  } else if (zapState === "zapping") {
    screenClass += isFirstSurf ? " telly__screen--static" : " telly__screen--static-fast";
  } else if (zapState === "tuned") {
    screenClass += isFirstSurf ? " telly__screen--tuned" : " telly__screen--tuned-fast";
  } else {
    screenClass += " telly__screen--idle";
  }

  return (
    <div className="telly" role="region" aria-label="Channel display">
      <div className={screenClass} aria-live="polite">
        {/* Exhausted state */}
        {status === "exhausted" && (
          <span className="telly__no-signal">NO SIGNAL</span>
        )}

        {/* Tuned state — channel display */}
        {zapState === "tuned" && status !== "exhausted" && channelNumber !== null && (
          <>
            <span className="telly__channel">CH {channelNumber}</span>
            <span className="telly__subtitle">
              somebody's hand-made site → opens in a new tab
            </span>
          </>
        )}
      </div>
    </div>
  );
}
