import { useEffect, useState } from "react";

/** Shape of a site returned by the /api/stumble endpoint. */
export interface StumbleSite {
  id: number;
  url: string;
  title: string;
  why_note: string;
  mood_tags: string[];
  character: string;
  stack: string | null;
  host: string | null;
  static_or_dynamic: string | null;
}

/** Available build filter values from /api/filters. */
export interface AvailableFilters {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
}

/** Active build filter selections (multi-select within each dimension). */
export interface BuildFilterSelection {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
}

/** Possible status messages surfaced after a stumble attempt. */
export type StatusKind =
  | "ok"
  | "no_match"
  | "exhausted"
  | "popup_blocked"
  | "error"
  | null;

export default function App() {
  // Filter state
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [buildFilters, setBuildFilters] = useState<BuildFilterSelection>({
    stacks: [],
    hosts: [],
    static_or_dynamic: [],
  });

  // Available filter options (fetched from API)
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    stacks: [],
    hosts: [],
    static_or_dynamic: [],
  });

  // Stumble result state
  const [lastStumbleResult, setLastStumbleResult] = useState<StumbleSite | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusKind>(null);

  // Fetch available filter values on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchFilters() {
      try {
        const response = await fetch("/api/filters");
        if (!response.ok) return;
        const data: AvailableFilters = await response.json();
        if (!cancelled) {
          setAvailableFilters(data);
        }
      } catch {
        // Silently ignore — filters will remain empty, stumble still works unfiltered
      }
    }

    fetchFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      {/* Mood selector area — MoodSelector component (task 7.2) */}
      <section aria-label="Mood selector">
        <p>Mood: {selectedMood ?? "none"}</p>
      </section>

      {/* Character filter area — CharacterFilter component (task 7.3) */}
      <section aria-label="Character filter">
        <p>Character: {selectedCharacter ?? "none"}</p>
      </section>

      {/* Build filter area — BuildFilter component (task 7.4) */}
      <section aria-label="Build filters">
        <p>
          Stacks: {buildFilters.stacks.length > 0 ? buildFilters.stacks.join(", ") : "none"}
        </p>
        <p>
          Hosts: {buildFilters.hosts.length > 0 ? buildFilters.hosts.join(", ") : "none"}
        </p>
        <p>
          Type: {buildFilters.static_or_dynamic.length > 0 ? buildFilters.static_or_dynamic.join(", ") : "none"}
        </p>
        <p>Available stacks: {availableFilters.stacks.join(", ") || "loading..."}</p>
        <p>Available hosts: {availableFilters.hosts.join(", ") || "loading..."}</p>
        <p>Available types: {availableFilters.static_or_dynamic.join(", ") || "loading..."}</p>
      </section>

      {/* Stumble button area — StumbleButton component (task 8.1) */}
      <section aria-label="Stumble action">
        <button type="button">Stumble</button>
      </section>

      {/* Provenance card area — ProvenanceCard component (task 8.2) */}
      <section aria-label="Provenance card">
        {lastStumbleResult && (
          <div>
            <p>{lastStumbleResult.title}</p>
            <p>{lastStumbleResult.stack ?? ""}</p>
            <p>{lastStumbleResult.host ?? ""}</p>
            <p>{lastStumbleResult.static_or_dynamic ?? ""}</p>
          </div>
        )}
      </section>

      {/* Status message area — StatusMessage component (task 8.3) */}
      <section aria-label="Status message">
        {statusMessage && <p>{statusMessage}</p>}
      </section>
    </main>
  );
}
