/**
 * UPSERT Integration Tests for Seed Import Logic
 *
 * Uses better-sqlite3 in-memory DB to verify that seedRowToSQL()
 * generates correct UPSERT behavior at the database level.
 *
 * Validates: Requirements 12.2
 */

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { seedRowToSQL, SeedRow } from "./seed-logic.js";

// Schema matching schema.sql
const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mood_tags TEXT NOT NULL,
  character TEXT NOT NULL,
  stack TEXT,
  host TEXT,
  static_or_dynamic TEXT,
  why_note TEXT NOT NULL,
  nsfw INTEGER NOT NULL DEFAULT 0,
  vibecoded INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  added_at TEXT NOT NULL
);
`;

function makeRow(overrides: Partial<SeedRow> = {}): SeedRow {
  return {
    url: "https://example.com",
    title: "Example Site",
    mood_tags: "useful;learn",
    character: "modern_indie",
    stack: null,
    host: null,
    static_or_dynamic: null,
    why_note: "A great example site",
    nsfw: 0,
    source: "manual",
    tier: "featured",
    added_at: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("UPSERT integration tests", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(CREATE_TABLE);
  });

  it("updates provenance on re-insert — blank stack becomes nextjs, same id and added_at, one row total", () => {
    // First insert: blank stack
    const row1 = makeRow({ stack: null });
    db.exec(seedRowToSQL(row1));

    // Verify initial state
    const before = db.prepare("SELECT * FROM sites WHERE url = ?").get(row1.url) as any;
    expect(before.stack).toBeNull();
    const originalId = before.id;
    const originalAddedAt = before.added_at;

    // Second insert (UPSERT): same URL, now with stack=nextjs
    const row2 = makeRow({ stack: "nextjs" });
    db.exec(seedRowToSQL(row2));

    // Verify UPSERT result
    const after = db.prepare("SELECT * FROM sites WHERE url = ?").get(row1.url) as any;
    expect(after.stack).toBe("nextjs");
    expect(after.id).toBe(originalId);
    expect(after.added_at).toBe(originalAddedAt);

    // Only one row exists
    const count = db.prepare("SELECT COUNT(*) as cnt FROM sites").get() as any;
    expect(count.cnt).toBe(1);
  });

  it("preserves added_at — original timestamp survives re-seed", () => {
    const originalTimestamp = "2024-01-15T12:00:00.000Z";
    const laterTimestamp = "2024-08-20T18:30:00.000Z";

    // First insert with original timestamp
    const row1 = makeRow({ added_at: originalTimestamp });
    db.exec(seedRowToSQL(row1));

    // Re-seed with a different added_at (simulating a later seed run)
    const row2 = makeRow({
      added_at: laterTimestamp,
      title: "Updated Title",
      stack: "hugo",
      host: "github_pages",
      static_or_dynamic: "static",
    });
    db.exec(seedRowToSQL(row2));

    // added_at must remain the original value (not updated by UPSERT)
    const result = db.prepare("SELECT * FROM sites WHERE url = ?").get(row1.url) as any;
    expect(result.added_at).toBe(originalTimestamp);

    // But content fields were updated
    expect(result.title).toBe("Updated Title");
    expect(result.stack).toBe("hugo");
    expect(result.host).toBe("github_pages");
    expect(result.static_or_dynamic).toBe("static");
  });

  it("idempotency — running UPSERT N times produces same DB state as once", () => {
    const row = makeRow({
      stack: "astro",
      host: "netlify",
      static_or_dynamic: "static",
    });
    const sql = seedRowToSQL(row);

    // Run the UPSERT 5 times
    for (let i = 0; i < 5; i++) {
      db.exec(sql);
    }

    // Still only one row
    const count = db.prepare("SELECT COUNT(*) as cnt FROM sites").get() as any;
    expect(count.cnt).toBe(1);

    // Values match what was inserted
    const result = db.prepare("SELECT * FROM sites WHERE url = ?").get(row.url) as any;
    expect(result.url).toBe(row.url);
    expect(result.title).toBe(row.title);
    expect(result.mood_tags).toBe(row.mood_tags);
    expect(result.character).toBe(row.character);
    expect(result.stack).toBe("astro");
    expect(result.host).toBe("netlify");
    expect(result.static_or_dynamic).toBe("static");
    expect(result.why_note).toBe(row.why_note);
    expect(result.nsfw).toBe(0);
    expect(result.source).toBe(row.source);
    expect(result.tier).toBe("featured");
    expect(result.added_at).toBe(row.added_at);

    // vibecoded was never touched — still default 0
    expect(result.vibecoded).toBe(0);
  });
});
