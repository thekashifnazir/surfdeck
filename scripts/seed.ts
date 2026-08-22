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

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { csvToInsertStatements, EmbeddableLookup } from "./seed-logic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const EMBEDDABLE_CACHE_DIR = resolve(PROJECT_ROOT, ".embeddable-cache");

interface EmbeddableCacheEntry {
  url: string;
  embeddable: boolean;
  checked_at: string;
}

/**
 * Loads the precomputed embeddable results written by scripts/check-embeddable.ts.
 * Reads every JSON file in .embeddable-cache/ and indexes by its `url` field.
 *
 * Graceful degradation: if the cache dir doesn't exist or is empty, returns an
 * empty lookup — every row then defaults to embeddable = 1. No errors thrown.
 */
function loadEmbeddableLookup(): EmbeddableLookup {
  const lookup: EmbeddableLookup = new Map();

  if (!existsSync(EMBEDDABLE_CACHE_DIR)) {
    console.log("No .embeddable-cache/ found — all rows default to embeddable = 1.");
    return lookup;
  }

  let files: string[];
  try {
    files = readdirSync(EMBEDDABLE_CACHE_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return lookup;
  }

  for (const file of files) {
    try {
      const raw = readFileSync(resolve(EMBEDDABLE_CACHE_DIR, file), "utf-8");
      const entry = JSON.parse(raw) as EmbeddableCacheEntry;
      if (entry && typeof entry.url === "string" && typeof entry.embeddable === "boolean") {
        lookup.set(entry.url, entry.embeddable);
      }
    } catch {
      // Skip unreadable/malformed cache files — treat as absent (embeddable = 1).
    }
  }

  console.log(`Loaded ${lookup.size} embeddable cache entries.`);
  return lookup;
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

  const embeddableLookup = loadEmbeddableLookup();

  const addedAt = new Date().toISOString();
  const insertStatements = csvToInsertStatements(csvText, addedAt, embeddableLookup);

  console.log(`Parsed ${insertStatements.length} rows from CSV.`);

  // Build full SQL with schema creation
  const sqlStatements: string[] = [
    `CREATE TABLE IF NOT EXISTS sites (
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
);`,
    ...insertStatements,
  ];

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
    console.log(`Seed import complete. ${insertStatements.length} rows processed (INSERT OR IGNORE).`);
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
