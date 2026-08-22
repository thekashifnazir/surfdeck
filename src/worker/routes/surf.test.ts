/**
 * Unit tests for /api/surf route
 *
 * Feature: mvp-stumble, Task 5.1
 * Validates: Requirements 1.1, 1.4, 5.4, 10.5, 10.6, 11.1
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { surfRoute } from "./surf.js";
import type { SiteRow } from "../engine/surf.js";

type Bindings = {
  DB: D1Database;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a test app with the surf route mounted at /api */
function createApp(mockDb: D1Database) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.route("/api", surfRoute);
  return {
    fetch(url: string) {
      return app.request(url, {}, { DB: mockDb });
    },
  };
}

/** A sample site row */
const sampleSite: SiteRow = {
  id: 42,
  url: "https://example.com",
  title: "Example Site",
  mood_tags: "learn;beautiful",
  character: "modern_indie",
  stack: "nextjs",
  host: "vercel",
  static_or_dynamic: "dynamic",
  built_with: null,
  why_note: "A cool site about things",
  nsfw: 0,
  vibecoded: 0,
  source: "manual",
  tier: "featured",
  added_at: "2024-01-01T00:00:00.000Z",
  embeddable: 1,
};

/**
 * Create a mock D1 that returns a predetermined site or count.
 */
function createMockD1(options: {
  count?: number;
  site?: SiteRow | null;
  shouldThrow?: boolean;
}): D1Database {
  const { count = 1, site = sampleSite, shouldThrow = false } = options;
  let callIndex = 0;

  return {
    prepare() {
      if (shouldThrow) throw new Error("D1 connection error");
      return {
        bind() {
          return {
            first<T>(): Promise<T | null> {
              callIndex++;
              // First call is the COUNT query
              if (callIndex === 1) {
                return Promise.resolve({ cnt: count } as T);
              }
              // Second call is the SELECT query
              return Promise.resolve(site as T | null);
            },
          };
        },
      };
    },
    dump: () => Promise.resolve(new ArrayBuffer(0)),
    batch: () => Promise.resolve([]),
    exec: () => Promise.resolve({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

/** Helper to get typed JSON from response */
async function json(res: Response): Promise<AnyJson> {
  return res.json() as Promise<AnyJson>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/surf route", () => {
  describe("successful surf (status: ok)", () => {
    it("returns site with correct shape when a site is found", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
      expect(body.site).toEqual({
        id: 42,
        url: "https://example.com",
        title: "Example Site",
        why_note: "A cool site about things",
        mood_tags: ["learn", "beautiful"],
        character: "modern_indie",
        stack: "nextjs",
        host: "vercel",
        static_or_dynamic: "dynamic",
        built_with: null,
        embeddable: true,
      });
    });

    it("includes the embeddable boolean field in the response", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf");

      const body = await json(res);
      expect(body.site).toHaveProperty("embeddable");
      expect(typeof body.site.embeddable).toBe("boolean");
    });

    it("maps embeddable integer to boolean", async () => {
      const embeddableSite = createApp(
        createMockD1({ count: 1, site: { ...sampleSite, embeddable: 1 } })
      );
      const embRes = await embeddableSite.fetch("/api/surf");
      const embBody = await json(embRes);
      expect(embBody.site.embeddable).toBe(true);

      const nonEmbeddableSite = createApp(
        createMockD1({ count: 1, site: { ...sampleSite, embeddable: 0 } })
      );
      const nonEmbRes = await nonEmbeddableSite.fetch("/api/surf");
      const nonEmbBody = await json(nonEmbRes);
      expect(nonEmbBody.site.embeddable).toBe(false);
    });

    it("transforms mood_tags from semicolon-separated string to array", async () => {
      const site = { ...sampleSite, mood_tags: "useful;think;waste_time" };
      const app = createApp(createMockD1({ count: 1, site }));
      const res = await app.fetch("/api/surf");

      const body = await json(res);
      expect(body.site.mood_tags).toEqual(["useful", "think", "waste_time"]);
    });

    it("returns null for blank provenance fields", async () => {
      const site = { ...sampleSite, stack: null, host: null, static_or_dynamic: null };
      const app = createApp(createMockD1({ count: 1, site }));
      const res = await app.fetch("/api/surf");

      const body = await json(res);
      expect(body.site.stack).toBeNull();
      expect(body.site.host).toBeNull();
      expect(body.site.static_or_dynamic).toBeNull();
    });

    it("does not include tier, added_at, nsfw, or source in response", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf");

      const body = await json(res);
      expect(body.site).not.toHaveProperty("tier");
      expect(body.site).not.toHaveProperty("added_at");
      expect(body.site).not.toHaveProperty("nsfw");
      expect(body.site).not.toHaveProperty("source");
    });
  });

  describe("no_match response", () => {
    it("returns no_match when count is 0", async () => {
      const app = createApp(createMockD1({ count: 0 }));
      const res = await app.fetch("/api/surf?character=old_web");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual({ status: "no_match" });
    });
  });

  describe("exhausted response", () => {
    it("returns exhausted when pool exists but all seen", async () => {
      // Mock: count=1 (pool exists), but site query returns null (all seen)
      const app = createApp(createMockD1({ count: 1, site: null }));
      const res = await app.fetch("/api/surf?seen=1,2,3");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual({ status: "exhausted" });
    });
  });

  describe("error handling", () => {
    it("returns 500 with JSON body on D1 errors", async () => {
      const app = createApp(createMockD1({ shouldThrow: true }));
      const res = await app.fetch("/api/surf");

      expect(res.status).toBe(500);
      const body = await json(res);
      expect(body).toEqual({ error: "Internal server error" });
    });
  });

  describe("parameter validation", () => {
    it("ignores invalid mood values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?mood=invalid_mood");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });

    it("accepts valid mood values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?mood=learn");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });

    it("ignores invalid character values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?character=nonsense");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });

    it("accepts valid character values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?character=modern_indie");

      expect(res.status).toBe(200);
    });

    it("parses comma-separated stack values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?stack=nextjs,hugo");

      expect(res.status).toBe(200);
    });

    it("parses comma-separated host values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?host=vercel,netlify");

      expect(res.status).toBe(200);
    });

    it("ignores invalid static_or_dynamic values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?static_or_dynamic=maybe");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });

    it("accepts valid static_or_dynamic values", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?static_or_dynamic=static");

      expect(res.status).toBe(200);
    });

    it("parses seen IDs as positive integers, dropping invalid ones", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?seen=1,abc,-5,3,0,2.5");

      expect(res.status).toBe(200);
    });

    it("handles empty seen param gracefully", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?seen=");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });

    it("treats surprise mood as no mood filter", async () => {
      const app = createApp(createMockD1({ count: 1, site: sampleSite }));
      const res = await app.fetch("/api/surf?mood=surprise");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });
  });
});
