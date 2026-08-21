/**
 * CSV Validation Logic — pure functions for validating the featured-sites corpus.
 *
 * Reuses parseCSV from seed-logic for RFC-4180 parsing. No file I/O.
 */

import { parseCSV } from '../seed-logic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationError {
  row: number;        // 1-based row number (header = row 1, first data row = row 2)
  column: string;     // column name
  message: string;    // human-readable description
}

export interface ValidationResult {
  ok: boolean;
  rowCount: number;   // number of data rows (excludes header)
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPECTED_HEADER = [
  'url',
  'title',
  'mood_tags',
  'character',
  'stack',
  'host',
  'static_or_dynamic',
  'built_with',
  'why_note',
  'nsfw',
  'vibecoded',
  'source',
];

const EXPECTED_COLUMN_COUNT = EXPECTED_HEADER.length; // 12

/** Fields that must be non-blank (after trimming) on every data row. */
const REQUIRED_FIELDS: readonly string[] = [
  'url',
  'title',
  'mood_tags',
  'character',
  'why_note',
  'nsfw',
  'vibecoded',
  'source',
];

/** Allowed values for the `character` column. */
const VALID_CHARACTER: readonly string[] = [
  'modern_indie',
  'old_web',
  'retro_personal',
  'minimal_static',
];

/** Allowed values for individual mood tags (`;`-separated in `mood_tags`). */
const VALID_MOOD_TAGS: readonly string[] = [
  'useful',
  'learn',
  'waste_time',
  'beautiful',
  'think',
];

/** Allowed values for the `stack` column (blank also permitted). */
const VALID_STACK: readonly string[] = [
  'nextjs',
  'nuxt',
  'astro',
  'sveltekit',
  'gatsby',
  'remix',
  'hugo',
  'jekyll',
  'eleventy',
  'zola',
  'docusaurus',
  'wordpress',
  'ghost',
  'react_spa',
  'vue_spa',
  'svelte_spa',
  'static_html',
];

/** Allowed values for the `host` column (blank also permitted). */
const VALID_HOST: readonly string[] = [
  'github_pages',
  'vercel',
  'netlify',
  'cloudflare_pages',
  'neocities',
  'surge',
  'firebase',
  'render',
  'fly',
  'aws_s3',
  'aws_amplify',
  'heroku',
  'self',
];

/** Allowed values for the `static_or_dynamic` column (blank also permitted). */
const VALID_STATIC_OR_DYNAMIC: readonly string[] = ['static', 'dynamic'];

/** Allowed values for the `nsfw` column. */
const VALID_NSFW: readonly string[] = ['true', 'false'];

/** Allowed values for the `vibecoded` column. */
const VALID_VIBECODED: readonly string[] = ['0', '1'];

/** Allowed values for the `built_with` column (blank also permitted). */
const VALID_BUILT_WITH: readonly string[] = [
  'bolt',
  'claude_code',
  'cloudflare_workers',
  'cursor',
  'fly',
  'godaddy_airo',
  'kiro',
  'lovable',
];

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate CSV content string against all corpus rules.
 * Pure function — no file I/O. Uses parseCSV from seed-logic for RFC-4180 parsing.
 *
 * Checks run in order, accumulating all errors (never short-circuits),
 * except: if parsing fails entirely, only a structural error is reported.
 */
export function validateCsv(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. RFC-4180 parse
  let rows: string[][];
  try {
    rows = parseCSV(content);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown parse error';
    errors.push({ row: 0, column: '', message: `CSV parse failed: ${msg}` });
    return { ok: false, rowCount: 0, errors };
  }

  // Filter out trailing empty rows (a trailing newline produces an empty last row)
  while (
    rows.length > 0 &&
    rows[rows.length - 1].length === 1 &&
    rows[rows.length - 1][0].trim() === ''
  ) {
    rows.pop();
  }

  if (rows.length === 0) {
    errors.push({ row: 0, column: '', message: 'CSV is empty — no header row found' });
    return { ok: false, rowCount: 0, errors };
  }

  // 2. Header check
  const header = rows[0];
  if (header.length !== EXPECTED_COLUMN_COUNT) {
    errors.push({
      row: 1,
      column: '',
      message: `Header has ${header.length} columns, expected ${EXPECTED_COLUMN_COUNT}: ${EXPECTED_HEADER.join(', ')}`,
    });
  } else {
    for (let i = 0; i < EXPECTED_COLUMN_COUNT; i++) {
      if (header[i].trim() !== EXPECTED_HEADER[i]) {
        errors.push({
          row: 1,
          column: EXPECTED_HEADER[i],
          message: `Header column ${i + 1} is "${header[i].trim()}", expected "${EXPECTED_HEADER[i]}"`,
        });
      }
    }
  }

  // 3. Ragged-row detection (every data row must have exactly 12 fields)
  const dataRows = rows.slice(1);
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) {
      errors.push({
        row: i + 2, // 1-based, header is row 1, first data row is row 2
        column: '',
        message: `Row has ${row.length} fields, expected ${EXPECTED_COLUMN_COUNT} (ragged row)`,
      });
    }
  }

  // 4. Required fields check — skip ragged rows (field-level checks only on well-formed rows)
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue; // skip ragged rows

    for (const field of REQUIRED_FIELDS) {
      const colIdx = EXPECTED_HEADER.indexOf(field);
      if (colIdx === -1) continue; // defensive — should never happen
      if (row[colIdx].trim() === '') {
        errors.push({
          row: i + 2,
          column: field,
          message: `required field is blank`,
        });
      }
    }
  }

  // 5. URL format check — url must start with "https://" or "/" (internal routes)
  const urlIdx = EXPECTED_HEADER.indexOf('url');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue; // skip ragged rows

    const url = row[urlIdx].trim();
    if (url !== '' && !url.startsWith('https://') && !url.startsWith('/')) {
      errors.push({
        row: i + 2,
        column: 'url',
        message: `URL must start with "https://" or "/" (internal route)`,
      });
    }
  }

  // 6. Enum: character
  const characterIdx = EXPECTED_HEADER.indexOf('character');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[characterIdx].trim();
    if (value !== '' && !VALID_CHARACTER.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'character',
        message: `"${value}" is not a valid character; allowed: ${VALID_CHARACTER.join(', ')}`,
      });
    }
  }

  // 7. Enum: mood_tags (`;`-separated, each must be valid, no duplicates)
  const moodTagsIdx = EXPECTED_HEADER.indexOf('mood_tags');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const raw = row[moodTagsIdx].trim();
    if (raw === '') continue; // blank handled by required-fields check

    const tags = raw.split(';').map((t) => t.trim());
    const seen = new Set<string>();
    for (const tag of tags) {
      if (!VALID_MOOD_TAGS.includes(tag)) {
        errors.push({
          row: i + 2,
          column: 'mood_tags',
          message: `"${tag}" is not a valid mood tag; allowed: ${VALID_MOOD_TAGS.join(', ')}`,
        });
      }
      if (seen.has(tag)) {
        errors.push({
          row: i + 2,
          column: 'mood_tags',
          message: `duplicate mood tag "${tag}"`,
        });
      }
      seen.add(tag);
    }
  }

  // 8. Enum: stack (blank allowed)
  const stackIdx = EXPECTED_HEADER.indexOf('stack');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[stackIdx].trim();
    if (value !== '' && !VALID_STACK.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'stack',
        message: `"${value}" is not a valid stack; allowed: ${VALID_STACK.join(', ')}`,
      });
    }
  }

  // 9. Enum: host (blank allowed)
  const hostIdx = EXPECTED_HEADER.indexOf('host');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[hostIdx].trim();
    if (value !== '' && !VALID_HOST.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'host',
        message: `"${value}" is not a valid host; allowed: ${VALID_HOST.join(', ')}`,
      });
    }
  }

  // 10. Enum: static_or_dynamic (blank allowed)
  const sodIdx = EXPECTED_HEADER.indexOf('static_or_dynamic');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[sodIdx].trim();
    if (value !== '' && !VALID_STATIC_OR_DYNAMIC.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'static_or_dynamic',
        message: `"${value}" is not a valid static_or_dynamic; allowed: ${VALID_STATIC_OR_DYNAMIC.join(', ')}`,
      });
    }
  }

  // 11. Enum: nsfw (exactly "true" or "false")
  const nsfwIdx = EXPECTED_HEADER.indexOf('nsfw');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[nsfwIdx].trim();
    if (value !== '' && !VALID_NSFW.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'nsfw',
        message: `"${value}" is not a valid nsfw value; must be true or false`,
      });
    }
  }

  // 12. Enum: vibecoded (exactly "0" or "1")
  const vibecodedIdx = EXPECTED_HEADER.indexOf('vibecoded');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[vibecodedIdx].trim();
    if (value !== '' && !VALID_VIBECODED.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'vibecoded',
        message: `"${value}" is not a valid vibecoded value; must be 0 or 1`,
      });
    }
  }

  // 13. Enum: built_with (blank allowed)
  const builtWithIdx = EXPECTED_HEADER.indexOf('built_with');
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    const value = row[builtWithIdx].trim();
    if (value !== '' && !VALID_BUILT_WITH.includes(value)) {
      errors.push({
        row: i + 2,
        column: 'built_with',
        message: `"${value}" is not a valid built_with; allowed: ${VALID_BUILT_WITH.join(', ')}`,
      });
    }
  }

  // 14. Provenance convention: reject "unknown" (case-insensitive) in stack/host/static_or_dynamic
  const provenanceFields = [
    { name: 'stack', idx: stackIdx },
    { name: 'host', idx: hostIdx },
    { name: 'static_or_dynamic', idx: sodIdx },
  ];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    for (const { name, idx } of provenanceFields) {
      const value = row[idx].trim();
      if (value.toLowerCase() === 'unknown') {
        errors.push({
          row: i + 2,
          column: name,
          message: `"${value}" is not allowed — use blank for unknown provenance`,
        });
      }
    }
  }

  // 15. Provenance convention: reject placeholder strings in ANY field
  const PLACEHOLDER_STRINGS = ['TBD', 'TODO', 'N/A', 'n/a'];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length !== EXPECTED_COLUMN_COUNT) continue;

    for (let colIdx = 0; colIdx < EXPECTED_COLUMN_COUNT; colIdx++) {
      const value = row[colIdx].trim();
      if (PLACEHOLDER_STRINGS.includes(value)) {
        errors.push({
          row: i + 2,
          column: EXPECTED_HEADER[colIdx],
          message: `"${value}" is a placeholder — not allowed in the corpus`,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    rowCount: dataRows.length,
    errors,
  };
}
