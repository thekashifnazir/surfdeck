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
import { csvToInsertStatements } from "./seed-logic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote");

  // Read CSV
  const csvPath = resolve(PROJECT_ROOT, "data", "featured-sites.csv");
  const csvText = readFileSync(csvPath, "utf-8");

  const addedAt = new Date().toISOString();
  const insertStatements = csvToInsertStatements(csvText, addedAt);

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
  added_at TEXT NOT NULL
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
