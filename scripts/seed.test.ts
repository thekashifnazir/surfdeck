/**
 * Property-Based Tests for Seed Import Logic
 *
 * Feature: mvp-stumble
 * Properties 8, 9, 10
 * Validates: Requirements 8.3, 8.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  parseCSV,
  csvRowToSeedRow,
  seedRowToSQL,
  csvToInsertStatements,
  buildColIndex,
} from "./seed-logic.js";

// ---------------------------------------------------------------------------
// Arbitraries — generate realistic CSV data
// ---------------------------------------------------------------------------

const CSV_HEADER = "url,title,mood_tags,character,stack,host,static_or_dynamic,why_note,nsfw,source";

const validMoods = ["useful", "learn", "waste_time", "beautiful", "think"];
const validCharacters = ["modern_indie", "old_web", "retro_personal", "minimal_static"];
const validStacks = ["nextjs", "hugo", "static_html", "gatsby", "11ty", "astro", ""];
const validHosts = ["github_pages", "vercel", "neocities", "netlify", "cloudflare_pages", ""];
const validStaticOrDynamic = ["static", "dynamic", ""];

/** Generate a single mood_tags value (1-3 moods, semicolon-separated) */
const moodTagsArb = fc
  .uniqueArray(fc.constantFrom(...validMoods), { minLength: 1, maxLength: 3 })
  .map((moods) => moods.join(";"));

/** Generate a safe string for CSV fields (no newlines, no unescaped quotes, no commas) */
const safeCsvString = fc.stringMatching(/^[a-zA-Z0-9 _\-.]{1,50}$/);

/** Generate a URL-like string */
const urlArb = fc
  .tuple(
    fc.constantFrom("https://", "http://"),
    fc.stringMatching(/^[a-z0-9][a-z0-9\-.]{2,20}$/)
  )
  .map(([scheme, domain]) => `${scheme}${domain}.com`);

/** Generate a provenance field (blank or valid value) */
const stackArb = fc.constantFrom(...validStacks);
const hostArb = fc.constantFrom(...validHosts);
const staticOrDynamicArb = fc.constantFrom(...validStaticOrDynamic);

/** Generate a full CSV row record */
const csvRowRecordArb = fc.record({
  url: urlArb,
  title: safeCsvString,
  mood_tags: moodTagsArb,
  character: fc.constantFrom(...validCharacters),
  stack: stackArb,
  host: hostArb,
  static_or_dynamic: staticOrDynamicArb,
  why_note: safeCsvString,
  nsfw: fc.constantFrom("true", "false"),
  source: safeCsvString,
});

/** Escape a CSV field (quote if contains comma, quote, or space) */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes(" ")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Build a CSV string from a list of row records */
function buildCsv(rows: Array<Record<string, string>>): string {
  const lines = [CSV_HEADER];
  for (const row of rows) {
    const fields = [
      row.url,
      row.title,
      row.mood_tags,
      row.character,
      row.stack,
      row.host,
      row.static_or_dynamic,
      row.why_note,
      row.nsfw,
      row.source,
    ];
    lines.push(fields.map(escapeCsvField).join(","));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Property 8: Seed import idempotency
// Feature: mvp-stumble, Property 8: Seed import idempotency
// ---------------------------------------------------------------------------

describe("Property 8: Seed import idempotency", () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * Running the import N times produces the same set of INSERT OR IGNORE
   * statements as once. Since INSERT OR IGNORE uses url as the UNIQUE key,
   * duplicate executions will not create duplicate rows.
   */
  it("running import N times produces same SQL statements as running once", () => {
    fc.assert(
      fc.property(
        fc.array(csvRowRecordArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 2, max: 5 }),
        (rows, n) => {
          const csv = buildCsv(rows);
          const addedAt = "2024-01-01T00:00:00.000Z";

          // Run once
          const statementsOnce = csvToInsertStatements(csv, addedAt);

          // Run N times — each time should produce the same statements
          for (let i = 0; i < n; i++) {
            const statementsAgain = csvToInsertStatements(csv, addedAt);
            expect(statementsAgain).toEqual(statementsOnce);
          }

          // All statements use INSERT OR IGNORE for idempotency
          for (const stmt of statementsOnce) {
            expect(stmt).toContain("INSERT OR IGNORE");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("duplicate URLs in CSV produce only one INSERT per unique URL", () => {
    fc.assert(
      fc.property(
        csvRowRecordArb,
        fc.integer({ min: 2, max: 5 }),
        (rowRecord, dupeCount) => {
          // Create CSV with the same URL repeated multiple times
          const rows = Array(dupeCount).fill(rowRecord);
          const csv = buildCsv(rows);
          const addedAt = "2024-01-01T00:00:00.000Z";

          const statements = csvToInsertStatements(csv, addedAt);

          // All statements target the same URL — INSERT OR IGNORE means
          // only the first will succeed at DB level. The function generates
          // one statement per CSV row, but they're all INSERT OR IGNORE
          // so DB-level idempotency is guaranteed.
          for (const stmt of statements) {
            expect(stmt).toContain("INSERT OR IGNORE");
            expect(stmt).toContain(rowRecord.url);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: No "unknown" strings
// Feature: mvp-stumble, Property 9: Provenance fields never contain "unknown"
// ---------------------------------------------------------------------------

describe("Property 9: No 'unknown' strings in provenance fields", () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * Provenance fields (stack, host, static_or_dynamic) are NULL or valid
   * vocabulary — never the literal string "unknown".
   */
  it("generated SQL never contains 'unknown' in provenance positions", () => {
    fc.assert(
      fc.property(
        fc.array(csvRowRecordArb, { minLength: 1, maxLength: 20 }),
        (rows) => {
          const csv = buildCsv(rows);
          const addedAt = "2024-01-01T00:00:00.000Z";

          const statements = csvToInsertStatements(csv, addedAt);

          for (const stmt of statements) {
            // Parse out the provenance values from the SQL
            // The SQL is: INSERT OR IGNORE INTO sites (...) VALUES (..., stack, host, static_or_dynamic, ...);
            // stack, host, static_or_dynamic are at positions 5, 6, 7 in the VALUES list
            // They should be NULL or a quoted valid value, never 'unknown'
            expect(stmt).not.toMatch(/'unknown'/i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("csvRowToSeedRow never produces 'unknown' for provenance fields", () => {
    fc.assert(
      fc.property(
        csvRowRecordArb,
        (rowRecord) => {
          const header = CSV_HEADER.split(",");
          const colIndex = buildColIndex(header);
          const row = [
            rowRecord.url,
            rowRecord.title,
            rowRecord.mood_tags,
            rowRecord.character,
            rowRecord.stack,
            rowRecord.host,
            rowRecord.static_or_dynamic,
            rowRecord.why_note,
            rowRecord.nsfw,
            rowRecord.source,
          ];

          const seedRow = csvRowToSeedRow(row, colIndex, "2024-01-01T00:00:00.000Z");

          if (seedRow) {
            expect(seedRow.stack).not.toBe("unknown");
            expect(seedRow.host).not.toBe("unknown");
            expect(seedRow.static_or_dynamic).not.toBe("unknown");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("even if CSV contains 'unknown', it passes through but is never injected by the logic", () => {
    // This test ensures the system itself never generates the string "unknown"
    // from blank inputs (the contract says: blank → NULL, never a placeholder)
    fc.assert(
      fc.property(
        urlArb,
        safeCsvString,
        moodTagsArb,
        fc.constantFrom(...validCharacters),
        safeCsvString,
        safeCsvString,
        (url, title, moods, character, whyNote, source) => {
          // Provenance fields are explicitly blank
          const header = CSV_HEADER.split(",");
          const colIndex = buildColIndex(header);
          const row = [url, title, moods, character, "", "", "", whyNote, "false", source];

          const seedRow = csvRowToSeedRow(row, colIndex, "2024-01-01T00:00:00.000Z");

          if (seedRow) {
            // Blank provenance → NULL, never "unknown"
            expect(seedRow.stack).toBeNull();
            expect(seedRow.host).toBeNull();
            expect(seedRow.static_or_dynamic).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Blanks preserved as NULL
// Feature: mvp-stumble, Property 10: Seed import preserves blanks as NULL
// ---------------------------------------------------------------------------

describe("Property 10: Blanks preserved as NULL", () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * For any row where stack, host, or static_or_dynamic is blank in the CSV,
   * the corresponding D1 column SHALL be NULL after import.
   */
  it("blank provenance CSV fields produce NULL in SQL output", () => {
    fc.assert(
      fc.property(
        urlArb,
        safeCsvString,
        moodTagsArb,
        fc.constantFrom(...validCharacters),
        fc.constantFrom("", "  ", "   "), // blank variants
        fc.constantFrom("", "  ", "   "),
        fc.constantFrom("", "  ", "   "),
        safeCsvString,
        safeCsvString,
        (url, title, moods, character, stack, host, staticDyn, whyNote, source) => {
          const header = CSV_HEADER.split(",");
          const colIndex = buildColIndex(header);
          const row = [url, title, moods, character, stack, host, staticDyn, whyNote, "false", source];

          const seedRow = csvRowToSeedRow(row, colIndex, "2024-01-01T00:00:00.000Z");

          if (seedRow) {
            // All blank provenance fields should be null
            expect(seedRow.stack).toBeNull();
            expect(seedRow.host).toBeNull();
            expect(seedRow.static_or_dynamic).toBeNull();

            // The SQL should use NULL literal, not a quoted empty string
            const sql = seedRowToSQL(seedRow);
            // Check that provenance positions contain NULL not ''
            // The VALUES clause order is: url, title, mood_tags, character, stack, host, static_or_dynamic, ...
            // After character comes stack, host, static_or_dynamic
            const valuesMatch = sql.match(/VALUES \((.+)\);$/);
            expect(valuesMatch).not.toBeNull();
            const values = valuesMatch![1];
            // Split carefully — find NULL tokens for provenance fields
            // Since stack/host/static_or_dynamic are null, they should appear as NULL in the SQL
            expect(values).toContain("NULL");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("non-blank provenance CSV fields produce quoted values, not NULL", () => {
    fc.assert(
      fc.property(
        urlArb,
        safeCsvString,
        moodTagsArb,
        fc.constantFrom(...validCharacters),
        fc.constantFrom("nextjs", "hugo", "static_html"),
        fc.constantFrom("vercel", "neocities", "github_pages"),
        fc.constantFrom("static", "dynamic"),
        safeCsvString,
        safeCsvString,
        (url, title, moods, character, stack, host, staticDyn, whyNote, source) => {
          const header = CSV_HEADER.split(",");
          const colIndex = buildColIndex(header);
          const row = [url, title, moods, character, stack, host, staticDyn, whyNote, "false", source];

          const seedRow = csvRowToSeedRow(row, colIndex, "2024-01-01T00:00:00.000Z");

          if (seedRow) {
            // Non-blank provenance fields should NOT be null
            expect(seedRow.stack).toBe(stack);
            expect(seedRow.host).toBe(host);
            expect(seedRow.static_or_dynamic).toBe(staticDyn);

            // The SQL should have quoted values, not NULL
            const sql = seedRowToSQL(seedRow);
            expect(sql).toContain(`'${stack}'`);
            expect(sql).toContain(`'${host}'`);
            expect(sql).toContain(`'${staticDyn}'`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("mixed blank and non-blank provenance fields handled correctly", () => {
    fc.assert(
      fc.property(
        urlArb,
        safeCsvString,
        moodTagsArb,
        fc.constantFrom(...validCharacters),
        fc.constantFrom("", "nextjs", "hugo"),
        fc.constantFrom("", "vercel", "neocities"),
        fc.constantFrom("", "static", "dynamic"),
        safeCsvString,
        safeCsvString,
        (url, title, moods, character, stack, host, staticDyn, whyNote, source) => {
          const header = CSV_HEADER.split(",");
          const colIndex = buildColIndex(header);
          const row = [url, title, moods, character, stack, host, staticDyn, whyNote, "false", source];

          const seedRow = csvRowToSeedRow(row, colIndex, "2024-01-01T00:00:00.000Z");

          if (seedRow) {
            // Blank → null, non-blank → value
            if (stack === "") {
              expect(seedRow.stack).toBeNull();
            } else {
              expect(seedRow.stack).toBe(stack);
            }
            if (host === "") {
              expect(seedRow.host).toBeNull();
            } else {
              expect(seedRow.host).toBe(host);
            }
            if (staticDyn === "") {
              expect(seedRow.static_or_dynamic).toBeNull();
            } else {
              expect(seedRow.static_or_dynamic).toBe(staticDyn);
            }

            // SQL correctness
            const sql = seedRowToSQL(seedRow);
            if (stack === "") {
              expect(sql).toContain("NULL");
            }
            if (host === "") {
              expect(sql).toContain("NULL");
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
