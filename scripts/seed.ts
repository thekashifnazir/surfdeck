/**
 * CSV-to-D1 Seed Import Script
 *
 * Reads data/featured-sites.csv and inserts all rows into the local (or remote)
 * D1 database via `wrangler d1 execute`.
 *
 * Usage:
 *   npx tsx scripts/seed.ts          # seed local D1
 *   npx tsx scripts/seed.ts --remote  # seed remote (production) D1
 */

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// RFC 4180 CSV Parser (handles quoted fields, embedded commas, escaped quotes)
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
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

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote");

  // Read CSV
  const csvPath = resolve(PROJECT_ROOT, "data", "featured-sites.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  // Parse header
  const header = rows[0];
  const colIndex = new Map<string, number>();
  header.forEach((col, idx) => colIndex.set(col.trim(), idx));

  // Validate expected columns exist
  const requiredCols = ["url", "title", "mood_tags", "character", "stack", "host", "static_or_dynamic", "why_note", "nsfw", "source"];
  for (const col of requiredCols) {
    if (!colIndex.has(col)) {
      console.error(`Missing required CSV column: ${col}`);
      process.exit(1);
    }
  }

  const addedAt = new Date().toISOString();
  const sqlStatements: string[] = [];

  // Ensure schema exists
  sqlStatements.push(
    `CREATE TABLE IF NOT EXISTS sites (
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
  source TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  added_at TEXT NOT NULL
);`
  );

  let skipped = 0;
  let inserted = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];

    // Skip empty rows (trailing newline can produce an empty last row)
    if (row.length === 1 && row[0].trim() === "") continue;

    const get = (col: string): string => {
      const idx = colIndex.get(col)!;
      return idx < row.length ? row[idx].trim() : "";
    };

    const url = get("url");

    // Skip rows with empty url
    if (!url) {
      skipped++;
      console.warn(`Warning: Skipping row ${r + 1} — empty url`);
      continue;
    }

    const title = get("title");
    const moodTags = get("mood_tags");
    const character = get("character");
    const stack = get("stack");
    const host = get("host");
    const staticOrDynamic = get("static_or_dynamic");
    const whyNote = get("why_note");
    const nsfwRaw = get("nsfw").toLowerCase();
    const source = get("source");

    // Map nsfw: 'true' → 1, anything else → 0
    const nsfw = nsfwRaw === "true" ? 1 : 0;

    // Map blank provenance → NULL
    const stackVal = stack ? `'${sqlEscape(stack)}'` : "NULL";
    const hostVal = host ? `'${sqlEscape(host)}'` : "NULL";
    const staticOrDynamicVal = staticOrDynamic ? `'${sqlEscape(staticOrDynamic)}'` : "NULL";

    const sql = `INSERT OR IGNORE INTO sites (url, title, mood_tags, character, stack, host, static_or_dynamic, why_note, nsfw, source, tier, added_at) VALUES ('${sqlEscape(url)}', '${sqlEscape(title)}', '${sqlEscape(moodTags)}', '${sqlEscape(character)}', ${stackVal}, ${hostVal}, ${staticOrDynamicVal}, '${sqlEscape(whyNote)}', ${nsfw}, '${sqlEscape(source)}', 'featured', '${addedAt}');`;

    sqlStatements.push(sql);
    inserted++;
  }

  console.log(`Parsed ${inserted} rows from CSV (${skipped} skipped).`);

  // Write SQL to temp file
  const tmpFile = resolve(PROJECT_ROOT, ".seed-import.sql");
  writeFileSync(tmpFile, sqlStatements.join("\n"), "utf-8");

  // Execute via wrangler d1 execute
  const dbName = "surfdeck-db";
  const localFlag = isRemote ? "--remote" : "--local";

  const cmd = `npx wrangler d1 execute ${dbName} ${localFlag} --file="${tmpFile}"`;
  console.log(`Executing: ${cmd}`);

  try {
    execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit" });
    console.log(`Seed import complete. ${inserted} rows processed (INSERT OR IGNORE).`);
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

main();
