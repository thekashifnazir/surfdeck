import { useEffect, useState, useCallback, useRef } from "react";
import Remote from "./components/Remote";
import Telly from "./components/Telly";
import CardSlot from "./components/CardSlot";
import ProvenanceCard from "./components/ProvenanceCard";
import CharacterFilter from "./components/CharacterFilter";
import BuildFilter from "./components/BuildFilter";
import CornerTierFilter from "./components/CornerTierFilter";
import StatusMessage from "./components/StatusMessage";
import { useSurf } from "./hooks/useSurf";

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

/** Animation phase for the zap sequence. */
export type ZapState = "idle" | "zapping" | "tuned";

/** Frozen mood labels — displayed on the LCD when a mood is selected. */
const MOOD_LABELS: Record<string, string> = {
  useful: "Show me something useful",
  learn: "Teach me something",
  waste_time: "Waste my time",
  beautiful: "Show me something beautiful",
  think: "Make me think",
};

/** localStorage key for the seen-list. */
const SEEN_KEY = "surfdeck_seen";

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

  // Zap animation state
  const [zapState, setZapState] = useState<ZapState>("idle");
  const [isFirstSurf, setIsFirstSurf] = useState(true);
  const [channelNumber, setChannelNumber] = useState<number | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [isReprint, setIsReprint] = useState(false);

  // Rolling TV channel counter (decoupled from site ID)
  const [channelCounter, setChannelCounter] = useState(217);

  // Press count for press-note text
  const [pressCount, setPressCount] = useState(0);

  // Refs for timeout cleanup
  const zapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Surf hook
  const { handleSurf: doSurf, isLoading } = useSurf({
    selectedMood,
    selectedCharacter,
    buildFilters,
    cornerMode,
    selectedTiers,
    onSurfResult: setLastSurfResult,
    onStatusChange: setStatusMessage,
  });

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
    return () => { cancelled = true; };
  }, []);

  // Clear status message when user changes any filter
  useEffect(() => {
    setStatusMessage((prev) => {
      if (prev === "no_match" || prev === "error") {
        return null;
      }
      return prev;
    });
  }, [selectedMood, selectedCharacter, buildFilters, selectedTiers, cornerMode]);

  // Watch for surf results to drive the zap animation
  useEffect(() => {
    if (lastSurfResult && zapState === "zapping") {
      const staticDuration = isFirstSurf ? 800 : 400;
      const cardDelay = isFirstSurf ? 600 : 500;

      // Timer: static → tuned
      zapTimerRef.current = setTimeout(() => {
        setZapState("tuned");

        // Timer: card print
        cardTimerRef.current = setTimeout(() => {
          setCardVisible(true);
          setIsReprint(false);
        }, cardDelay - staticDuration);
      }, staticDuration);
    }
  }, [lastSurfResult, zapState, isFirstSurf]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (zapTimerRef.current) clearTimeout(zapTimerRef.current);
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
    };
  }, []);

  /** Handle SURF press — trigger zap animation + actual surf. */
  const handleSurf = useCallback(() => {
    // If a card is currently showing, mark as reprint
    if (cardVisible) {
      setIsReprint(true);
    }

    // Clear previous timers
    if (zapTimerRef.current) clearTimeout(zapTimerRef.current);
    if (cardTimerRef.current) clearTimeout(cardTimerRef.current);

    // Compute next rolling channel counter BEFORE entering zapping state
    // so the LCD always has a value (never null/"TUNING...")
    const next = channelCounter + 1 + (channelCounter % 5);
    const nextChannel = next > 999 ? 7 : next;
    setChannelCounter(nextChannel);
    setChannelNumber(nextChannel);

    // Start zap animation
    setZapState("zapping");

    // Increment press count for press-note
    setPressCount((c) => c + 1);

    // Fire the actual surf (opens tab immediately — never gated on animation)
    doSurf();

    // Mark subsequent surfs as compressed
    if (isFirstSurf) {
      setIsFirstSurf(false);
    }
  }, [doSurf, isFirstSurf, cardVisible, channelCounter]);

  /** Handle status changes that affect telly (e.g. exhausted, no_match) */
  useEffect(() => {
    if (statusMessage === "exhausted") {
      setZapState("idle");
      setChannelNumber(null);
      setCardVisible(false);
    } else if (statusMessage === "no_match" || statusMessage === "error") {
      setZapState("idle");
    }
  }, [statusMessage]);

  /** Reset: clears seen-list, restores first-press ceremony. */
  function handleReset() {
    localStorage.removeItem(SEEN_KEY);
    setStatusMessage(null);
    setLastSurfResult(null);
    setZapState("idle");
    setChannelNumber(null);
    setChannelCounter(217);
    setCardVisible(false);
    setIsReprint(false);
    setIsFirstSurf(true);
    setPressCount(0);
  }

  /** Toggle corner mode. */
  function handleCornerToggle() {
    if (cornerMode) {
      setCornerMode(false);
      setSelectedTiers([]);
    } else {
      setCornerMode(true);
    }
    setLastSurfResult(null);
    setStatusMessage(null);
    setZapState("idle");
    setChannelNumber(null);
    setCardVisible(false);
  }

  // Compute LCD text
  let lcdText: string;
  if (zapState === "zapping") {
    lcdText = `TUNING > CH ${channelCounter}`;
  } else if (selectedMood && MOOD_LABELS[selectedMood]) {
    lcdText = MOOD_LABELS[selectedMood];
  } else {
    const modeLabel = cornerMode ? "VIBECODED" : "OPEN WEB";
    lcdText = isFirstSurf ? modeLabel : `CH ${channelCounter} - ${modeLabel}`;
  }

  // LCD shows no-match message when applicable
  if (statusMessage === "no_match") {
    lcdText = "NOTHING IN THAT CORNER RIGHT NOW";
  }

  return (
    <main className="page">
      {/* Hero */}
      <header className="hero">
        <h1 className="hero__wordmark">Surfdeck</h1>
        <p className="hero__headline">
          Every catch prints a card worth keeping.
        </p>
      </header>

      {/* Scene: Remote + Telly */}
      <div className="scene">
        <Remote
          selectedMood={selectedMood}
          onMoodChange={setSelectedMood}
          cornerMode={cornerMode}
          onCornerToggle={handleCornerToggle}
          onSurf={handleSurf}
          isLoading={isLoading}
          zapState={zapState}
          isFirstSurf={isFirstSurf}
          lcdText={lcdText}
        />

        <div className="telly-container">
          <Telly
            zapState={zapState}
            isFirstSurf={isFirstSurf}
            channelNumber={channelNumber}
            status={statusMessage}
          />

          <div className="telly__stand" aria-hidden="true" />

          {/* Card Slot — below the telly */}
          <CardSlot visible={cardVisible} reprint={isReprint}>
            {lastSurfResult && (
              <ProvenanceCard site={lastSurfResult} cornerMode={cornerMode} />
            )}
          </CardSlot>
        </div>

        {/* Press-note — evolving hint below the telly */}
        <p className="press-note">
          {pressCount === 0 && "press SURF — zap, then the card prints"}
          {pressCount === 1 && "channel and card stay up — press again whenever"}
          {pressCount >= 2 && "quick blip; the card reprints with each catch"}
        </p>
      </div>

      {/* Filters below the scene */}
      <section className="filters" aria-label="Filters">
        <CharacterFilter
          selectedCharacter={selectedCharacter}
          onCharacterChange={setSelectedCharacter}
        />

        {/* Build filters — hidden in corner mode */}
        {!cornerMode && (
          <BuildFilter
            available={availableFilters}
            selected={buildFilters}
            onSelectionChange={setBuildFilters}
          />
        )}

        {/* Tier filter — visible only in corner mode */}
        {cornerMode && (
          <CornerTierFilter
            availableTiers={availableFilters.corner_tiers}
            selectedTiers={selectedTiers}
            onTierChange={setSelectedTiers}
          />
        )}
      </section>

      {/* Status message */}
      <StatusMessage
        status={statusMessage}
        siteUrl={lastSurfResult?.url ?? null}
        onReset={handleReset}
      />
    </main>
  );
}
