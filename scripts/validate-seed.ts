/**
 * CSV Validator CLI — validate data/featured-sites.csv against all corpus rules.
 *
 * Usage:
 *   npx tsx scripts/validate-seed.ts
 *
 * Exit 0 + stdout summary on success; exit 1 + stderr per-row errors on failure.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCsv } from './lib/validate-csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const csvPath = resolve(PROJECT_ROOT, 'data/featured-sites.csv');
const content = readFileSync(csvPath, 'utf-8');
const result = validateCsv(content);

if (result.ok) {
  process.stdout.write(`OK: ${result.rowCount} rows, 12 columns, all constraints pass\n`);
  process.exit(0);
} else {
  for (const err of result.errors) {
    process.stderr.write(`Row ${err.row}: [${err.column}] ${err.message}\n`);
  }
  process.exit(1);
}
