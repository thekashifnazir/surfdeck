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
import {
  seedRowToSQL,
  SeedRow,
  csvRowToSeedRow,
  csvToInsertStatements,
  buildColIndex,
  parseCSV,
  EmbeddableLookup,
} from "./seed-logic.js";

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
  built_with TEXT,
  why_note TEXT NOT NULL,
  nsfw INTEGER NOT NULL DEFAULT 0,
  vibecoded INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  added_at TEXT NOT NULL,
  embeddable INTEGER NOT NULL DEFAULT 1
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
    built_with: null,
    why_note: "A great example site",
    nsfw: 0,
    vibecoded: 0,
    source: "manual",
    tier: "featured",
    added_at: "2024-06-01T00:00:00.000Z",
    embeddable: 1,
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

    // vibecoded defaults to 0 (passed through from SeedRow)
    expect(result.vibecoded).toBe(0);
    // built_with defaults to null
    expect(result.built_with).toBeNull();
    // embeddable defaults to 1 (passed through from SeedRow)
    expect(result.embeddable).toBe(1);
  });

  it("UPSERT updates embeddable — re-seed flips 1 to 0", () => {
    const row1 = makeRow({ embeddable: 1 });
    db.exec(seedRowToSQL(row1));

    const before = db.prepare("SELECT * FROM sites WHERE url = ?").get(row1.url) as any;
    expect(before.embeddable).toBe(1);

    const row2 = makeRow({ embeddable: 0 });
    db.exec(seedRowToSQL(row2));

    const after = db.prepare("SELECT * FROM sites WHERE url = ?").get(row1.url) as any;
    expect(after.embeddable).toBe(0);

    const count = db.prepare("SELECT COUNT(*) as cnt FROM sites").get() as any;
    expect(count.cnt).toBe(1);
  });
});

describe("embeddable flag in generated SQL", () => {
  it("seedRowToSQL includes the embeddable column and value", () => {
    const sql = seedRowToSQL(makeRow({ embeddable: 0 }));

    // Column present in the INSERT column list
    expect(sql).toContain(", added_at, embeddable)");
    // Value 0 present in the VALUES tuple (after the quoted added_at)
    expect(sql).toContain("'2024-06-01T00:00:00.000Z', 0)");
    // Present in the ON CONFLICT update clause
    expect(sql).toContain("embeddable = excluded.embeddable");
  });

  it("seedRowToSQL emits embeddable = 1 for an embeddable row", () => {
    const sql = seedRowToSQL(makeRow({ embeddable: 1 }));
    expect(sql).toContain("'2024-06-01T00:00:00.000Z', 1)");
  });
});

describe("embeddable lookup threading (csvRowToSeedRow / csvToInsertStatements)", () => {
  const CSV = [
    "url,title,mood_tags,character,stack,host,static_or_dynamic,built_with,why_note,nsfw,vibecoded,source",
    "https://a.example,Site A,useful,modern_indie,,,,,Note A,false,,manual",
    "https://b.example,Site B,learn,old_web,,,,,Note B,false,,manual",
  ].join("\n");

  it("csvRowToSeedRow defaults embeddable to 1 when no lookup provided", () => {
    const rows = parseCSV(CSV);
    const colIndex = buildColIndex(rows[0]);
    const seedRow = csvRowToSeedRow(rows[1], colIndex, "2024-06-01T00:00:00.000Z");
    expect(seedRow?.embeddable).toBe(1);
  });

  it("csvRowToSeedRow honors a lookup marking a URL as not embeddable (0)", () => {
    const rows = parseCSV(CSV);
    const colIndex = buildColIndex(rows[0]);
    const lookup: EmbeddableLookup = new Map([["https://a.example", false]]);

    const seedRowA = csvRowToSeedRow(rows[1], colIndex, "2024-06-01T00:00:00.000Z", lookup);
    const seedRowB = csvRowToSeedRow(rows[2], colIndex, "2024-06-01T00:00:00.000Z", lookup);

    expect(seedRowA?.embeddable).toBe(0);
    // URL not in the lookup → defaults to 1
    expect(seedRowB?.embeddable).toBe(1);
  });

  it("csvRowToSeedRow treats an explicit true lookup entry as embeddable (1)", () => {
    const rows = parseCSV(CSV);
    const colIndex = buildColIndex(rows[0]);
    const lookup: EmbeddableLookup = new Map([["https://a.example", true]]);
    const seedRow = csvRowToSeedRow(rows[1], colIndex, "2024-06-01T00:00:00.000Z", lookup);
    expect(seedRow?.embeddable).toBe(1);
  });

  it("csvToInsertStatements defaults all rows to embeddable = 1 without a lookup", () => {
    const statements = csvToInsertStatements(CSV, "2024-06-01T00:00:00.000Z");
    expect(statements).toHaveLength(2);
    for (const stmt of statements) {
      expect(stmt).toContain("'2024-06-01T00:00:00.000Z', 1)");
    }
  });

  it("csvToInsertStatements applies the lookup per-URL", () => {
    const db = new Database(":memory:");
    db.exec(CREATE_TABLE);

    const lookup: EmbeddableLookup = new Map([["https://a.example", false]]);
    const statements = csvToInsertStatements(CSV, "2024-06-01T00:00:00.000Z", lookup);
    for (const stmt of statements) db.exec(stmt);

    const a = db.prepare("SELECT embeddable FROM sites WHERE url = ?").get("https://a.example") as any;
    const b = db.prepare("SELECT embeddable FROM sites WHERE url = ?").get("https://b.example") as any;
    expect(a.embeddable).toBe(0);
    expect(b.embeddable).toBe(1);
  });
});
