import { describe, it, expect, beforeEach, vi } from "vitest";
import { applySurfResponse } from "./useSurf";
import type { SurfSite } from "../App";

// applySurfResponse calls appendToSeenList, which reads/writes localStorage.
// Provide a minimal in-memory stub so the pure branching can be exercised in
// the default (node) test environment — no DOM required.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

function makeSite(overrides: Partial<SurfSite> = {}): SurfSite {
  return {
    id: 7,
    url: "https://example.com",
    title: "Example",
    why_note: "why",
    mood_tags: ["useful"],
    character: "modern_indie",
    stack: "react",
    host: "netlify",
    static_or_dynamic: "static",
    built_with: null,
    embeddable: true,
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onSurfResult: vi.fn(),
    onStatusChange: vi.fn(),
    onEmbedUrl: vi.fn(),
  };
}

describe("applySurfResponse — embed branching (no tab opens on press)", () => {
  // Nothing should open on a surf press under the revised behaviour. Guard the
  // whole suite with a window.open spy that must never fire.
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy = vi.fn();
    (globalThis as unknown as { window: Window }).window = {
      open: openSpy,
    } as unknown as Window;
  });

  it("embeddable=true: embeds the URL and opens no tab", () => {
    const handlers = makeHandlers();
    const site = makeSite({ embeddable: true, url: "https://embed.me" });

    applySurfResponse({ status: "ok", site }, handlers);

    expect(handlers.onEmbedUrl).toHaveBeenCalledWith("https://embed.me");
    expect(handlers.onSurfResult).toHaveBeenCalledWith(site);
    expect(handlers.onStatusChange).toHaveBeenCalledWith("ok");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("embeddable=false: clears the embedded URL and opens nothing (fallback is the opener)", () => {
    const handlers = makeHandlers();
    const site = makeSite({ embeddable: false, url: "https://open.web" });

    applySurfResponse({ status: "ok", site }, handlers);

    expect(handlers.onEmbedUrl).toHaveBeenCalledWith(null);
    expect(handlers.onSurfResult).toHaveBeenCalledWith(site);
    expect(handlers.onStatusChange).toHaveBeenCalledWith("ok");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("no_match: clears embedded URL, reports no_match, opens nothing", () => {
    const handlers = makeHandlers();

    applySurfResponse({ status: "no_match" }, handlers);

    expect(handlers.onEmbedUrl).toHaveBeenCalledWith(null);
    expect(handlers.onSurfResult).toHaveBeenCalledWith(null);
    expect(handlers.onStatusChange).toHaveBeenCalledWith("no_match");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("exhausted: clears embedded URL, reports exhausted, opens nothing", () => {
    const handlers = makeHandlers();

    applySurfResponse({ status: "exhausted" }, handlers);

    expect(handlers.onEmbedUrl).toHaveBeenCalledWith(null);
    expect(handlers.onSurfResult).toHaveBeenCalledWith(null);
    expect(handlers.onStatusChange).toHaveBeenCalledWith("exhausted");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("unknown status: clears embedded URL, reports error, opens nothing", () => {
    const handlers = makeHandlers();

    applySurfResponse({ status: "weird" }, handlers);

    expect(handlers.onEmbedUrl).toHaveBeenCalledWith(null);
    expect(handlers.onStatusChange).toHaveBeenCalledWith("error");
    expect(openSpy).not.toHaveBeenCalled();
  });
});
