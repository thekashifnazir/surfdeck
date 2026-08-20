import { useState } from "react";
import type { BuildFilterSelection, StatusKind, SurfSite } from "../App";

/** localStorage key for the seen-list. */
const SEEN_KEY = "surfdeck_seen";

/** Timeout in milliseconds for the surf fetch request. */
const FETCH_TIMEOUT_MS = 5000;

export interface SurfButtonProps {
  selectedMood: string | null;
  selectedCharacter: string | null;
  buildFilters: BuildFilterSelection;
  cornerMode: boolean;
  selectedTiers: number[];
  onSurfResult: (site: SurfSite | null) => void;
  onStatusChange: (status: StatusKind) => void;
}

/**
 * Reads the seen-list from localStorage as an array of site IDs.
 * Returns an empty array if not set or invalid.
 */
function getSeenList(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Appends a site ID to the seen-list in localStorage.
 */
function appendToSeenList(siteId: number): void {
  const seen = getSeenList();
  if (!seen.includes(siteId)) {
    seen.push(siteId);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
}

/**
 * Builds the query string for the surf API request.
 */
function buildQueryString(
  mood: string | null,
  character: string | null,
  buildFilters: BuildFilterSelection,
  seen: number[],
  cornerMode: boolean,
  selectedTiers: number[]
): string {
  const params = new URLSearchParams();

  // Vibecoded corner mode
  if (cornerMode) {
    params.set("vibecoded", "1");

    // Tier filter (only in corner mode)
    if (selectedTiers.length > 0) {
      params.set("tier", selectedTiers.join(","));
    }
  }

  // Mood: only send if a real mood is selected (not null / not "surprise")
  if (mood) {
    params.set("mood", mood);
  }

  // Character
  if (character) {
    params.set("character", character);
  }

  // Build filters
  if (buildFilters.stacks.length > 0) {
    params.set("stack", buildFilters.stacks.join(","));
  }
  if (buildFilters.hosts.length > 0) {
    params.set("host", buildFilters.hosts.join(","));
  }
  if (buildFilters.static_or_dynamic.length > 0) {
    params.set("static_or_dynamic", buildFilters.static_or_dynamic.join(","));
  }

  // Seen-list
  if (seen.length > 0) {
    params.set("seen", seen.join(","));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * The main Surf button. Handles the open-then-navigate pattern:
 * 1. Opens a blank tab synchronously within the click gesture.
 * 2. Fetches /api/surf with current filters + seen-list.
 * 3. On success: navigates the pre-opened tab to the site URL.
 * 4. On failure/timeout: closes the blank tab and shows error state.
 * 5. If popup is blocked (window.open returns null): still fetches, updates
 *    seen-list and result, then sets popup_blocked so StatusMessage can link
 *    to the freshly fetched site.
 */
export default function SurfButton({
  selectedMood,
  selectedCharacter,
  buildFilters,
  cornerMode,
  selectedTiers,
  onSurfResult,
  onStatusChange,
}: SurfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSurf() {
    // Open blank tab synchronously within the click gesture (required for Safari)
    const tab = window.open("about:blank", "_blank");
    const popupBlocked = !tab;

    setIsLoading(true);
    onStatusChange(null);
    onSurfResult(null);

    const seen = getSeenList();
    const queryString = buildQueryString(selectedMood, selectedCharacter, buildFilters, seen, cornerMode, selectedTiers);

    // AbortController with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/surf${queryString}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Server error (500, etc.)
        tab?.close();
        onStatusChange("error");
        return;
      }

      const data = (await response.json()) as {
        status?: string;
        site?: SurfSite;
      };

      if (data.status === "ok" && data.site) {
        if (popupBlocked) {
          // Popup was blocked — update state so StatusMessage shows a link to the fresh site
          appendToSeenList(data.site.id);
          onSurfResult(data.site);
          onStatusChange("popup_blocked");
        } else {
          // Navigate the pre-opened tab to the site URL
          tab.location.href = data.site.url;
          appendToSeenList(data.site.id);
          onSurfResult(data.site);
          onStatusChange("ok");
        }
      } else if (data.status === "no_match") {
        tab?.close();
        onSurfResult(null);
        onStatusChange("no_match");
      } else if (data.status === "exhausted") {
        tab?.close();
        onSurfResult(null);
        onStatusChange("exhausted");
      } else {
        // Unexpected response shape
        tab?.close();
        onStatusChange("error");
      }
    } catch {
      // Network error or timeout (AbortError)
      clearTimeout(timeoutId);
      tab?.close();
      onStatusChange("error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSurf}
        disabled={isLoading}
        aria-busy={isLoading}
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1.1rem",
          fontWeight: 700,
          border: "none",
          borderRadius: "8px",
          background: isLoading ? "#94a3b8" : "#1a73e8",
          color: "#fff",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "background 0.15s ease",
        }}
      >
        {isLoading ? "Surfing\u2026" : "Surf"}
      </button>
    </div>
  );
}
