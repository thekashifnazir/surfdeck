# Design Document: Agent Hooks — seed-data-gate & test-on-save

## Overview

This design covers two Kiro agent hooks and the validator script that powers one of them. The hooks use Kiro's `PostFileSave` trigger with a `command` action type to run shell commands when specific files are saved. The seed-data-gate hook runs a custom TypeScript validator against the CSV corpus; the test-on-save hook runs the existing vitest suite. Neither hook alters application behaviour — they are purely developer-experience infrastructure that feeds results back into the agent context.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Kiro IDE                                                        │
│                                                                   │
│  User saves file ──► PostFileSave event                          │
│                           │                                       │
│           ┌───────────────┼───────────────┐                      │
│           ▼                               ▼                      │
│  matcher: data/featured-   matcher: src/.*\.tsx?$                 │
│  sites\.csv$                                                     │
│           │                               │                      │
│           ▼                               ▼                      │
│  seed-data-gate.json          test-on-save.json                  │
│  cmd: npx tsx                 cmd: npx vitest run                │
│       scripts/validate-                                          │
│       seed.ts                                                    │
│           │                               │                      │
│           ▼                               ▼                      │
│  exit 0 → stdout to agent    exit 0 → stdout to agent           │
│  exit 1 → stderr to agent    exit 1 → stderr to agent           │
└─────────────────────────────────────────────────────────────────┘
```

## Hook Registration Format

Kiro hooks are JSON files stored at `.kiro/hooks/<id>.json`. Each file follows this schema:

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "<Human-readable name>",
      "trigger": "PostFileSave",
      "matcher": "<regex tested against saved file path>",
      "action": {
        "type": "command",
        "command": "<shell command>"
      }
    }
  ]
}
```

### seed-data-gate.json

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Validate CSV on save",
      "trigger": "PostFileSave",
      "matcher": "data/featured-sites\\.csv$",
      "action": {
        "type": "command",
        "command": "npx tsx scripts/validate-seed.ts"
      }
    }
  ]
}
```

### test-on-save.json

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Run tests on source save",
      "trigger": "PostFileSave",
      "matcher": "src/.*\\.tsx?$",
      "action": {
        "type": "command",
        "command": "npx vitest run"
      }
    }
  ]
}
```

## Validator Script Design

### File Location

`scripts/validate-seed.ts` — a standalone TypeScript script executed via `npx tsx`. It imports a core validation module from `scripts/lib/validate-csv.ts` so that vitest tests can import the same logic without shelling out.

### Module Structure

```
scripts/
├── validate-seed.ts              # CLI entry point (reads file, calls validator, formats output)
├── lib/
│   └── validate-csv.ts           # Pure validation logic (exported functions)
└── __tests__/
    └── validate-seed.test.ts     # Vitest tests for the validator
```

### validate-csv.ts — Exported Interface

```typescript
import { parseCSV } from '../seed-logic';

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

/**
 * Validate CSV content string against all corpus rules.
 * Pure function — no file I/O. Uses parseCSV from seed-logic for RFC-4180 parsing.
 */
export function validateCsv(content: string): ValidationResult;
```

### Validation Pipeline (ordered)

The validator runs checks in this order, accumulating all errors (never short-circuits):

1. **RFC-4180 parse** — Reuse the project's existing `parseCSV(text: string): string[][]` function exported from `scripts/seed-logic.ts`. This is the same parser the seed pipeline uses (handles quoted fields, embedded commas, escaped quotes), so a validator pass guarantees the seed can also parse the file. If parsing fails entirely (unclosed quote), report a single structural error and stop (remaining checks depend on parsed rows). No external CSV library is added.

2. **Header check** — Verify the first row is exactly:
   ```
   url,title,mood_tags,character,stack,host,static_or_dynamic,built_with,why_note,nsfw,vibecoded,source
   ```

3. **Column count (ragged row)** — Every data row must have exactly 12 fields.

4. **Required fields** — These columns must be non-blank (after trim): `url`, `title`, `mood_tags`, `character`, `why_note`, `nsfw`, `vibecoded`, `source`.

5. **URL format** — `url` must start with `https://`.

6. **Enum: character** — Must be one of: `modern_indie`, `old_web`, `retro_personal`, `minimal_static`.

7. **Enum: mood_tags** — Split on `;`, each token must be one of: `useful`, `learn`, `waste_time`, `beautiful`, `think`. No duplicates within a row. At least one value required.

8. **Enum: stack** — Blank or one of: `nextjs`, `nuxt`, `astro`, `sveltekit`, `gatsby`, `remix`, `hugo`, `jekyll`, `eleventy`, `zola`, `docusaurus`, `wordpress`, `ghost`, `react_spa`, `vue_spa`, `svelte_spa`, `static_html`.

9. **Enum: host** — Blank or one of: `github_pages`, `vercel`, `netlify`, `cloudflare_pages`, `neocities`, `surge`, `firebase`, `render`, `fly`, `aws_s3`, `aws_amplify`, `heroku`, `self`.

10. **Enum: static_or_dynamic** — Blank or one of: `static`, `dynamic`.

11. **Enum: nsfw** — Exactly `true` or `false` (lowercase).

12. **Enum: vibecoded** — Exactly `0` or `1`.

13. **Enum: built_with** — Blank or one of: `bolt`, `claude_code`, `cloudflare_workers`, `cursor`, `fly`, `godaddy_airo`, `kiro`, `lovable`.

14. **Provenance conventions** — No `stack`/`host`/`static_or_dynamic` field contains the string `unknown` (case-insensitive). No field anywhere contains `TBD`, `TODO`, `N/A`, or `n/a`.

### validate-seed.ts — CLI Entry Point

```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCsv } from './lib/validate-csv.js';

const csvPath = resolve(__dirname, '../data/featured-sites.csv');
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
```

### Dependencies

No new dependencies are added. The validator reuses `parseCSV` from the existing `scripts/seed-logic.ts`. `tsx` is already a pinned devDependency in `package.json`.

### Test Design

`scripts/__tests__/validate-seed.test.ts` imports `validateCsv` directly.

| Test case | Input | Expected |
|-----------|-------|----------|
| Production CSV passes | Read actual `data/featured-sites.csv` | `ok: true`, `rowCount: 349` |
| Ragged row | Remove one field from a row | Error on that row mentioning "ragged" |
| Missing required field | Blank `title` | Error: `[title] required field is blank` |
| Invalid character | `character = "funky"` | Error listing allowed values |
| Invalid mood_tags | `mood_tags = "useful;party"` | Error: `party` not in vocabulary |
| Duplicate mood_tag | `mood_tags = "useful;useful"` | Error: duplicate mood tag |
| Invalid stack | `stack = "angular"` | Error listing allowed values |
| Invalid host | `host = "aws"` | Error listing allowed values |
| Invalid static_or_dynamic | `static_or_dynamic = "hybrid"` | Error listing allowed values |
| Invalid nsfw | `nsfw = "yes"` | Error: must be `true` or `false` |
| Invalid vibecoded | `vibecoded = "2"` | Error: must be `0` or `1` |
| Invalid built_with | `built_with = "chatgpt"` | Error listing allowed values |
| Provenance: unknown | `stack = "unknown"` | Error: `unknown` not allowed |
| Provenance: placeholder | `why_note = "TBD"` | Error: placeholder string |
| URL without https | `url = "http://example.com"` | Error: must start with `https://` |
| Multiple errors in one row | Several violations | All reported (no short-circuit) |

Tests use helper functions that take the production CSV content and inject a single bad row or mutate one field, ensuring isolation.

## Exit Code Semantics

| Scenario | Exit code | Output channel |
|----------|-----------|----------------|
| All checks pass | 0 | stdout: one-line summary |
| One or more violations | 1 | stderr: per-row error report |

Kiro's `PostFileSave` hook with a `command` action forwards stdout on exit 0 and stderr on non-zero exit to the agent context. This matches the validator's output strategy exactly.

## Non-Interference Guarantees

- The validator only reads `data/featured-sites.csv` via `readFileSync` — no writes, no renames.
- Hook files are committed under `.kiro/hooks/` (NOT gitignored) and don't affect builds or deploys.
- The spec does not modify `.gitignore`.
- The new `scripts/lib/` and `scripts/__tests__/` paths don't overlap with `src/`.
- No new dependencies are added; nothing changes in the Worker bundle.
- `tsc --noEmit` coverage: the new script files are under `scripts/` and included via the project tsconfig (or a dedicated `tsconfig.scripts.json` if the project separates them). Either way, they compile cleanly.
