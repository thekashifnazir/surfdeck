/**
 * Unit tests for the /api/corpus-size route.
 *
 * Validates: Requirement 6.6
 */

import { describe, it, expect } from "vitest";
import { corpusSizeRoute } from "./corpus-size.js";
import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

/**
 * Create a mock D1 database that returns a predefined count.
 */
function createMockD1(total: number): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        first<T>(): Promise<T | null> {
          return Promise.resolve({ total } as unknown as T);
        },
        all() {
          return Promise.resolve({ results: [], success: true, meta: {} });
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
  app.route("/api", corpusSizeRoute);
  return { app, db };
}

describe("/api/corpus-size route", () => {
  it("returns the total count of non-NSFW sites", async () => {
    const db = createMockD1(349);
    const { app } = createApp(db);
    const res = await app.request("/api/corpus-size", undefined, { DB: db });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ total: 349 });
  });

  it("sets Cache-Control header to public, max-age=3600", async () => {
    const db = createMockD1(288);
    const { app } = createApp(db);
    const res = await app.request("/api/corpus-size", undefined, { DB: db });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("returns 0 when no sites exist", async () => {
    const db = createMockD1(0);
    const { app } = createApp(db);
    const res = await app.request("/api/corpus-size", undefined, { DB: db });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ total: 0 });
  });

  it("returns 500 on D1 error", async () => {
    const db = {
      prepare() {
        return {
          bind() {
            return this;
          },
          first() {
            return Promise.reject(new Error("D1 failure"));
          },
        };
      },
      dump: () => Promise.resolve(new ArrayBuffer(0)),
      batch: () => Promise.resolve([]),
      exec: () => Promise.resolve({ count: 0, duration: 0 }),
    } as unknown as D1Database;

    const { app } = createApp(db);
    const res = await app.request("/api/corpus-size", undefined, { DB: db });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });
});
