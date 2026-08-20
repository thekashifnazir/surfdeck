/**
 * Unit tests for the /api/filters route.
 *
 * Validates: Requirements 4.1, 4.5
 */

import { describe, it, expect } from "vitest";
import { filtersRoute } from "./filters.js";
import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

/**
 * Create a mock D1 database that returns predefined DISTINCT values
 * for each column query.
 */
function createMockD1(data: {
  stacks: string[];
  hosts: string[];
  static_or_dynamic: string[];
  corner_built_with?: string[];
}): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        all<T>(): Promise<D1Result<T>> {
          let results: unknown[] = [];

          if (sql.includes("DISTINCT stack")) {
            results = data.stacks.map((s) => ({ stack: s }));
          } else if (sql.includes("DISTINCT host")) {
            results = data.hosts.map((h) => ({ host: h }));
          } else if (sql.includes("DISTINCT static_or_dynamic")) {
            results = data.static_or_dynamic.map((s) => ({
              static_or_dynamic: s,
            }));
          } else if (sql.includes("DISTINCT built_with")) {
            results = (data.corner_built_with ?? []).map((b) => ({
              built_with: b,
            }));
          }

          return Promise.resolve({
            results: results as T[],
            success: true,
            meta: {} as D1Meta,
          } as D1Result<T>);
        },
      };
    },
    dump: () => Promise.resolve(new ArrayBuffer(0)),
    batch: () => Promise.resolve([]),
    exec: () => Promise.resolve({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.route("/api", filtersRoute);
  return { app, db };
}

describe("/api/filters route", () => {
  it("returns distinct non-null values for all three dimensions plus corner_tiers", async () => {
    const db = createMockD1({
      stacks: ["astro", "hugo", "nextjs"],
      hosts: ["cloudflare_pages", "neocities", "vercel"],
      static_or_dynamic: ["dynamic", "static"],
      corner_built_with: ["lovable", "bolt", "cloudflare_workers"],
    });

    const { app } = createApp(db);
    const res = await app.request("/api/filters", undefined, { DB: db });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      stacks: ["astro", "hugo", "nextjs"],
      hosts: ["cloudflare_pages", "neocities", "vercel"],
      static_or_dynamic: ["dynamic", "static"],
      corner_tiers: [2, 4],
    });
  });

  it("returns empty arrays when no values exist", async () => {
    const db = createMockD1({
      stacks: [],
      hosts: [],
      static_or_dynamic: [],
      corner_built_with: [],
    });

    const { app } = createApp(db);
    const res = await app.request("/api/filters", undefined, { DB: db });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      stacks: [],
      hosts: [],
      static_or_dynamic: [],
      corner_tiers: [],
    });
  });

  it("returns 500 on D1 error", async () => {
    const db = {
      prepare() {
        return {
          bind() {
            return this;
          },
          all() {
            return Promise.reject(new Error("D1 failure"));
          },
        };
      },
      dump: () => Promise.resolve(new ArrayBuffer(0)),
      batch: () => Promise.resolve([]),
      exec: () => Promise.resolve({ count: 0, duration: 0 }),
    } as unknown as D1Database;

    const { app } = createApp(db);
    const res = await app.request("/api/filters", undefined, { DB: db });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });
});
