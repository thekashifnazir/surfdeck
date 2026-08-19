import { useEffect, useState } from "react";
import MoodSelector from "./components/MoodSelector";
import CharacterFilter from "./components/CharacterFilter";
import BuildFilter from "./components/BuildFilter";
import StumbleButton from "./components/StumbleButton";
import ProvenanceCard from "./components/ProvenanceCard";

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
      {/* Mood selector */}
      <section aria-label="Mood selector">
        <MoodSelector selectedMood={selectedMood} onMoodChange={setSelectedMood} />
      </section>

      {/* Character filter */}
      <section aria-label="Character filter">
        <CharacterFilter selectedCharacter={selectedCharacter} onCharacterChange={setSelectedCharacter} />
      </section>

      {/* Build filters */}
      <section aria-label="Build filters">
        <BuildFilter
          available={availableFilters}
          selected={buildFilters}
          onSelectionChange={setBuildFilters}
        />
      </section>

      {/* Stumble button */}
      <section aria-label="Stumble action">
        <StumbleButton
          selectedMood={selectedMood}
          selectedCharacter={selectedCharacter}
          buildFilters={buildFilters}
          onStumbleResult={setLastStumbleResult}
          onStatusChange={setStatusMessage}
          lastSiteUrl={lastStumbleResult?.url ?? null}
        />
      </section>

      {/* Provenance card */}
      <section aria-label="Provenance card">
        {lastStumbleResult && <ProvenanceCard site={lastStumbleResult} />}
      </section>

      {/* Status message area — StatusMessage component (task 8.3) */}
      <section aria-label="Status message">
        {statusMessage && <p>{statusMessage}</p>}
      </section>
    </main>
  );
}
