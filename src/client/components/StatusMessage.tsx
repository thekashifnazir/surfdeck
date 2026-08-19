import type { StatusKind } from "../App";

export interface StatusMessageProps {
  /** Current status to display. Null means no message shown. */
  status: StatusKind;
  /** Site URL for popup-blocked state — displayed as a clickable link. */
  siteUrl?: string | null;
  /** Callback for the reset button in the exhausted state. */
  onReset?: () => void;
}

/**
 * StatusMessage renders contextual messages after a stumble attempt:
 *
 * - **no_match**: "Nothing in that corner right now." + "Loosen a filter and try again."
 * - **exhausted**: "You've wandered the whole neighbourhood." + "Reset history to start fresh?" + reset button
 * - **popup_blocked**: Informs the user and provides the site URL as a clickable link.
 *
 * The exhausted state is visually distinguished from zero-match (it is not an error).
 * The zero-match message should be cleared by the parent when a filter changes (Req 6.4).
 */
export default function StatusMessage({ status, siteUrl, onReset }: StatusMessageProps) {
  if (!status || status === "ok") {
    return null;
  }

  if (status === "no_match") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "#92400e",
          }}
        >
          Nothing in that corner right now.
        </h2>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.9rem",
            color: "#a16207",
          }}
        >
          Loosen a filter and try again.
        </p>
      </div>
    );
  }

  if (status === "exhausted") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          background: "#ede9fe",
          border: "1px solid #a78bfa",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "#5b21b6",
          }}
        >
          You've wandered the whole neighbourhood.
        </h2>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.9rem",
            color: "#6d28d9",
          }}
        >
          Reset history to start fresh?
        </p>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              marginTop: "0.75rem",
              padding: "0.5rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "6px",
              background: "#7c3aed",
              color: "#fff",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            Reset
          </button>
        )}
      </div>
    );
  }

  if (status === "popup_blocked") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          background: "#f0f9ff",
          border: "1px solid #38bdf8",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            color: "#0c4a6e",
          }}
        >
          Your browser blocked the new tab.
          {siteUrl ? (
            <>
              {" "}
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0284c7", fontWeight: 600, textDecoration: "underline" }}
              >
                Open the site here
              </a>
            </>
          ) : (
            " Try allowing popups for this site."
          )}
        </p>
      </div>
    );
  }

  // status === "error" — remain interactive, no blocking overlay (Req 7.3)
  if (status === "error") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            color: "#991b1b",
          }}
        >
          Something hiccupped. Hit Stumble again whenever you're ready.
        </p>
      </div>
    );
  }

  return null;
}
