import { useState, useCallback } from "react";
import type { BuildFilterSelection, StatusKind, SurfSite } from "../App";

/** localStorage key for the seen-list. */
const SEEN_KEY = "surfdeck_seen";

/** Timeout in milliseconds for the surf fetch request. */
const FETCH_TIMEOUT_MS = 5000;

export interface UseSurfOptions {
  selectedMood: string | null;
  selectedCharacter: string | null;
  buildFilters: BuildFilterSelection;
  cornerMode: boolean;
  selectedTiers: number[];
  onSurfResult: (site: SurfSite | null) => void;
  onStatusChange: (status: StatusKind) => void;
  onEmbedUrl: (url: string | null) => void;
}

export interface UseSurfReturn {
  handleSurf: () => void;
  isLoading: boolean;
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

  if (cornerMode) {
    params.set("vibecoded", "1");
    if (selectedTiers.length > 0) {
      params.set("tier", selectedTiers.join(","));
    }
  }

  if (mood) {
    params.set("mood", mood);
  }

  if (character) {
    params.set("character", character);
  }

  if (buildFilters.stacks.length > 0) {
    params.set("stack", buildFilters.stacks.join(","));
  }
  if (buildFilters.hosts.length > 0) {
    params.set("host", buildFilters.hosts.join(","));
  }
  if (buildFilters.static_or_dynamic.length > 0) {
    params.set("static_or_dynamic", buildFilters.static_or_dynamic.join(","));
  }

  if (seen.length > 0) {
    params.set("seen", seen.join(","));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Callbacks the response handler needs to drive App state. */
interface SurfResponseHandlers {
  onSurfResult: (site: SurfSite | null) => void;
  onStatusChange: (status: StatusKind) => void;
  onEmbedUrl: (url: string | null) => void;
}

/**
 * Applies the surf API response to app state.
 *
 * Pure with respect to React — extracted so the branching can be unit-tested
 * without a DOM. Nothing opens on surf press: no tab is pre-opened, so there is
 * no tab to navigate or close here. The opener for non-embeddable sites is the
 * telly's pressable fallback control (a user gesture, never popup-blocked).
 *
 * - status "ok" + embeddable: hand the URL to App state so the telly renders an
 *   iframe.
 * - status "ok" + non-embeddable: clear the embedded URL and open nothing — the
 *   telly's fallback control is the opener.
 * - no_match / exhausted / error: clear the embedded URL.
 */
export function applySurfResponse(
  data: { status?: string; site?: SurfSite },
  { onSurfResult, onStatusChange, onEmbedUrl }: SurfResponseHandlers
): void {
  if (data.status === "ok" && data.site) {
    const site = data.site;

    if (site.embeddable === true) {
      // Embeddable: hand the URL to App state so the telly renders an iframe.
      onEmbedUrl(site.url);
    } else {
      // Non-embeddable: open nothing. The telly's pressable fallback control
      // is the opener; clear any prior embedded URL so it shows.
      onEmbedUrl(null);
    }

    appendToSeenList(site.id);
    onSurfResult(site);
    onStatusChange("ok");
  } else if (data.status === "no_match") {
    onEmbedUrl(null);
    onSurfResult(null);
    onStatusChange("no_match");
  } else if (data.status === "exhausted") {
    onEmbedUrl(null);
    onSurfResult(null);
    onStatusChange("exhausted");
  } else {
    onEmbedUrl(null);
    onStatusChange("error");
  }
}

/**
 * Hook that encapsulates all surf logic: fetch, tab opening, seen-list, and status.
 * Extracted from the old SurfButton component to decouple behaviour from UI.
 */
export function useSurf({
  selectedMood,
  selectedCharacter,
  buildFilters,
  cornerMode,
  selectedTiers,
  onSurfResult,
  onStatusChange,
  onEmbedUrl,
}: UseSurfOptions): UseSurfReturn {
  const [isLoading, setIsLoading] = useState(false);

  const handleSurf = useCallback(async () => {
    // Nothing opens on press — the telly embeds the site or shows a pressable
    // fallback whose click is the opener. No optimistic blank tab.
    setIsLoading(true);
    onStatusChange(null);
    onSurfResult(null);

    const seen = getSeenList();
    const queryString = buildQueryString(selectedMood, selectedCharacter, buildFilters, seen, cornerMode, selectedTiers);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/surf${queryString}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        onEmbedUrl(null);
        onStatusChange("error");
        return;
      }

      const data = (await response.json()) as {
        status?: string;
        site?: SurfSite;
      };

      applySurfResponse(data, { onSurfResult, onStatusChange, onEmbedUrl });
    } catch {
      clearTimeout(timeoutId);
      onEmbedUrl(null);
      onStatusChange("error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMood, selectedCharacter, buildFilters, cornerMode, selectedTiers, onSurfResult, onStatusChange, onEmbedUrl]);

  return { handleSurf, isLoading };
}
