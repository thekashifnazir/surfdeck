import type { StatusKind } from "../App";

export interface StatusMessageProps {
  status: StatusKind;
  siteUrl?: string | null;
  onReset?: () => void;
}

/**
 * StatusMessage — contextual messages expressed through the telly/remote metaphor.
 * No red error boxes. A miss is part of the wander.
 */
export default function StatusMessage({ status, siteUrl, onReset }: StatusMessageProps) {
  // Ouroboros treatment
  if (status === "ok" && siteUrl === "/ouroboros") {
    return (
      <div className="status-line" role="status" aria-live="polite">
        <p className="status-line__text">
          The loop closes — you surfed to the surfer.
        </p>
      </div>
    );
  }

  if (!status || status === "ok") {
    return null;
  }

  if (status === "no_match") {
    return (
      <div className="status-line" role="status" aria-live="polite">
        <p className="status-line__text">
          Loosen a filter and try again.
        </p>
      </div>
    );
  }

  if (status === "exhausted") {
    return (
      <div className="status-line" role="status" aria-live="polite">
        <p className="status-line__text">
          You've wandered the whole neighbourhood.
        </p>
        {onReset && (
          <button type="button" className="reset-btn" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
    );
  }

  if (status === "popup_blocked") {
    return (
      <div className="status-line" role="alert" aria-live="assertive">
        <p className="status-line__text">
          Your browser blocked the new tab.
          {siteUrl && (
            <>
              {" "}
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="status-line__link"
              >
                Open the site here
              </a>
            </>
          )}
        </p>
      </div>
    );
  }

  // error
  if (status === "error") {
    return (
      <div className="status-line" role="status" aria-live="polite">
        <p className="status-line__text">
          That one got away. Surf again whenever you're ready.
        </p>
      </div>
    );
  }

  return null;
}
