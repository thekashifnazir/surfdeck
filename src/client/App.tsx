import { useEffect, useState } from "react";
import MoodSelector from "./components/MoodSelector";
import CharacterFilter from "./components/CharacterFilter";
import BuildFilter from "./components/BuildFilter";
import CornerTierFilter from "./components/CornerTierFilter";
import SurfButton from "./components/SurfButton";
import ProvenanceCard from "./components/ProvenanceCard";
import StatusMessage from "./components/StatusMessage";

/** Shape of a site returned by the /api/surf endpoint. */
export interface SurfSite {
  id: number;
  url: string;
  title: string;
  why_note: string;
  mood_tags: string[];
  character: string;
  stack: string | null;
  host: string | null;
  static_or_dynamic: string | null;
  built_with: string | null;
}

/** Available build filter values from /api/filters. */
export interface AvailableFilters {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
  corner_tiers: number[];
}

/** Active build filter selections (multi-select within each dimension). */
export interface BuildFilterSelection {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
}

/** Possible status messages surfaced after a surf attempt. */
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

  // Corner mode state
  const [cornerMode, setCornerMode] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<number[]>([]);

  /** localStorage key for the seen-list. */
  const SEEN_KEY = "surfdeck_seen";

  // Available filter options (fetched from API)
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    stacks: [],
    hosts: [],
    static_or_dynamic: [],
    corner_tiers: [],
  });

  // Surf result state
  const [lastSurfResult, setLastSurfResult] = useState<SurfSite | null>(null);
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
        // Silently ignore — filters will remain empty, surf still works unfiltered
      }
    }

    fetchFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  // Clear status message when user changes any filter (Req 6.4)
  useEffect(() => {
    setStatusMessage((prev) => {
      if (prev === "no_match" || prev === "error") {
        return null;
      }
      return prev;
    });
  }, [selectedMood, selectedCharacter, buildFilters, selectedTiers, cornerMode]);

  /** Clears the seen-list from localStorage and re-enables stumbling (Req 11.3). */
  function handleReset() {
    localStorage.removeItem(SEEN_KEY);
    setStatusMessage(null);
    setLastSurfResult(null);
  }

  /** Enter the Vibecoded Corner. */
  function enterCorner() {
    setCornerMode(true);
    setLastSurfResult(null);
    setStatusMessage(null);
  }

  /** Exit corner mode and return to open-web surf. */
  function exitCorner() {
    setCornerMode(false);
    setSelectedTiers([]);
    setLastSurfResult(null);
    setStatusMessage(null);
  }

  return (
    <main>
      {/* Corner mode toggle */}
      <section aria-label="Surf mode">
        {cornerMode ? (
          <button
            type="button"
            onClick={exitCorner}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background: "transparent",
              color: "#1a73e8",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            &larr; Back to open-web surf
          </button>
        ) : (
          <button
            type="button"
            onClick={enterCorner}
            style={{
              padding: "0.5rem 1rem",
              border: "2px solid #7c3aed",
              borderRadius: "6px",
              background: "#f5f3ff",
              color: "#7c3aed",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Enter the Vibecoded Corner
          </button>
        )}
      </section>

      {/* Mood selector */}
      <section aria-label="Mood selector">
        <MoodSelector selectedMood={selectedMood} onMoodChange={setSelectedMood} />
      </section>

      {/* Character filter */}
      <section aria-label="Character filter">
        <CharacterFilter selectedCharacter={selectedCharacter} onCharacterChange={setSelectedCharacter} />
      </section>

      {/* Build filters — hidden in corner mode (Req 7.6) */}
      {!cornerMode && (
        <section aria-label="Build filters">
          <BuildFilter
            available={availableFilters}
            selected={buildFilters}
            onSelectionChange={setBuildFilters}
          />
        </section>
      )}

      {/* Tier filter — visible only in corner mode (Req 7.2) */}
      {cornerMode && (
        <section aria-label="Tier filter">
          <CornerTierFilter
            availableTiers={availableFilters.corner_tiers}
            selectedTiers={selectedTiers}
            onTierChange={setSelectedTiers}
          />
        </section>
      )}

      {/* Surf button */}
      <section aria-label="Surf action">
        <SurfButton
          selectedMood={selectedMood}
          selectedCharacter={selectedCharacter}
          buildFilters={buildFilters}
          cornerMode={cornerMode}
          selectedTiers={selectedTiers}
          onSurfResult={setLastSurfResult}
          onStatusChange={setStatusMessage}
        />
      </section>

      {/* Provenance card */}
      <section aria-label="Provenance card">
        {lastSurfResult && <ProvenanceCard site={lastSurfResult} />}
      </section>

      {/* Status message area */}
      <section aria-label="Status message">
        <StatusMessage
          status={statusMessage}
          siteUrl={lastSurfResult?.url ?? null}
          onReset={handleReset}
        />
      </section>
    </main>
  );
}
