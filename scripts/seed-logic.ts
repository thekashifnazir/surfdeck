/**
 * Seed Import Logic — testable, pure functions extracted from seed.ts
 *
 * This module contains the CSV parsing and SQL generation logic used by
 * the seed import script. Extracted for property-based testing.
 */

// ---------------------------------------------------------------------------
// RFC 4180 CSV Parser (handles quoted fields, embedded commas, escaped quotes)
// ---------------------------------------------------------------------------

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;

  while (i < text.length) {
    const row: string[] = [];
    // Parse one row
    while (i < text.length) {
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = "";
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              // Escaped quote
              field += '"';
              i += 2;
            } else {
              // End of quoted field
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
      } else {
        // Unquoted field
        let field = "";
        while (i < text.length && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i++;
        }
        row.push(field);
      }

      // After field: expect comma, newline, or end
      if (i < text.length && text[i] === ",") {
        i++; // skip comma, continue to next field
      } else {
        // End of row
        break;
      }
    }

    // Skip line endings
    if (i < text.length && text[i] === "\r") i++;
    if (i < text.length && text[i] === "\n") i++;

    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// SQL escaping (single quotes)
// ---------------------------------------------------------------------------

export function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

// ---------------------------------------------------------------------------
// Row-to-SQL statement generation
// ---------------------------------------------------------------------------

export interface SeedRow {
  url: string;
  title: string;
  mood_tags: string;
  character: string;
  stack: string | null;
  host: string | null;
  static_or_dynamic: string | null;
  built_with: string | null;
  why_note: string;
  nsfw: number;
  vibecoded: number;
  source: string;
  tier: string;
  added_at: string;
}

/**
 * Converts a parsed CSV data row into a SeedRow object.
 * Returns null if the row should be skipped (empty url).
 */
export function csvRowToSeedRow(
  row: string[],
  colIndex: Map<string, number>,
  addedAt: string
): SeedRow | null {
  const get = (col: string): string => {
    const idx = colIndex.get(col);
    if (idx === undefined) return "";
    return idx < row.length ? row[idx].trim() : "";
  };

  const url = get("url");

  // Skip rows with empty url
  if (!url) return null;

  const title = get("title");
  const moodTags = get("mood_tags");
  const character = get("character");
  const stack = get("stack") || null;
  const host = get("host") || null;
  const staticOrDynamic = get("static_or_dynamic") || null;
  const builtWith = get("built_with") || null;
  const whyNote = get("why_note");
  const nsfwRaw = get("nsfw").toLowerCase();
  const vibecodedRaw = get("vibecoded");
  const source = get("source");

  // Map nsfw: 'true' → 1, anything else → 0
  const nsfw = nsfwRaw === "true" ? 1 : 0;

  // Map vibecoded: '1' → 1, anything else (blank, '0', etc.) → 0
  const vibecoded = vibecodedRaw === "1" ? 1 : 0;

  return {
    url,
    title,
    mood_tags: moodTags,
    character,
    stack,
    host,
    static_or_dynamic: staticOrDynamic,
    built_with: builtWith,
    why_note: whyNote,
    nsfw,
    vibecoded,
    source,
    tier: "featured",
    added_at: addedAt,
  };
}

/**
 * Converts a SeedRow into a SQL UPSERT statement.
 * On conflict (same URL), updates content columns while preserving
 * id, added_at, and tier.
 */
export function seedRowToSQL(row: SeedRow): string {
  const stackVal = row.stack ? `'${sqlEscape(row.stack)}'` : "NULL";
  const hostVal = row.host ? `'${sqlEscape(row.host)}'` : "NULL";
  const staticOrDynamicVal = row.static_or_dynamic
    ? `'${sqlEscape(row.static_or_dynamic)}'`
    : "NULL";
  const builtWithVal = row.built_with
    ? `'${sqlEscape(row.built_with)}'`
    : "NULL";

  return `INSERT INTO sites (url, title, mood_tags, character, stack, host, static_or_dynamic, built_with, why_note, nsfw, vibecoded, source, tier, added_at) VALUES ('${sqlEscape(row.url)}', '${sqlEscape(row.title)}', '${sqlEscape(row.mood_tags)}', '${sqlEscape(row.character)}', ${stackVal}, ${hostVal}, ${staticOrDynamicVal}, ${builtWithVal}, '${sqlEscape(row.why_note)}', ${row.nsfw}, ${row.vibecoded}, '${sqlEscape(row.source)}', '${sqlEscape(row.tier)}', '${sqlEscape(row.added_at)}') ON CONFLICT(url) DO UPDATE SET title = excluded.title, mood_tags = excluded.mood_tags, character = excluded.character, stack = excluded.stack, host = excluded.host, static_or_dynamic = excluded.static_or_dynamic, built_with = excluded.built_with, why_note = excluded.why_note, nsfw = excluded.nsfw, vibecoded = excluded.vibecoded, source = excluded.source;`;
}

/**
 * Parses header row and returns column index map.
 */
export function buildColIndex(header: string[]): Map<string, number> {
  const colIndex = new Map<string, number>();
  header.forEach((col, idx) => colIndex.set(col.trim(), idx));
  return colIndex;
}

/**
 * Processes full CSV text into an array of SQL INSERT statements.
 * Returns the SQL statements (excluding the CREATE TABLE) for data rows.
 */
export function csvToInsertStatements(csvText: string, addedAt: string): string[] {
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const header = rows[0];
  const colIndex = buildColIndex(header);

  const statements: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];

    // Skip empty rows (trailing newline can produce an empty last row)
    if (row.length === 1 && row[0].trim() === "") continue;

    const seedRow = csvRowToSeedRow(row, colIndex, addedAt);
    if (seedRow) {
      statements.push(seedRowToSQL(seedRow));
    }
  }

  return statements;
}
