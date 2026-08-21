# Requirements Document: Agent Hooks — seed-data-gate & test-on-save

## Introduction

This spec adds two Kiro agent hooks that provide automated quality gates during development. The first (`seed-data-gate`) validates `data/featured-sites.csv` every time it is saved, catching schema violations, ragged rows, and provenance-convention breaches before they reach the seed pipeline. The second (`test-on-save`) reruns the full vitest suite whenever any application source file (`src/**/*.ts` or `src/**/*.tsx`) is saved, surfacing regressions at the moment of the edit. Neither hook modifies any existing source behaviour, data, or API; both are purely additive developer-experience infrastructure.

## Glossary

- **Agent_Hook**: A Kiro `.kiro/hooks/<id>.json` file that triggers a shell command or agent prompt on a specified IDE event.
- **seed-data-gate**: The hook that fires on saves to `data/featured-sites.csv` and runs the CSV validator script.
- **test-on-save**: The hook that fires on saves to `src/**/*.tsx?` files and runs `npx vitest run`.
- **Validate_Seed_Script**: The TypeScript script at `scripts/validate-seed.ts` that performs structural and semantic validation of the CSV.
- **CSV_Corpus**: The file `data/featured-sites.csv` — 12 columns, currently 349 data rows.

## Requirements

### Requirement 1: seed-data-gate Hook Registration

**User Story:** As a developer editing the site corpus, I want the agent to automatically validate the CSV every time I save it, so that schema violations are caught immediately without a manual step.

#### Acceptance Criteria

1. A hook file SHALL exist at `.kiro/hooks/seed-data-gate.json` with trigger `PostFileSave` and matcher pattern `data/featured-sites\\.csv$`.
2. The hook's command SHALL be `npx tsx scripts/validate-seed.ts`.
3. WHEN the validator exits 0, the hook SHALL forward a one-line summary (e.g. "OK: 349 rows, 12 columns, all constraints pass") to the agent context.
4. WHEN the validator exits non-zero, the hook SHALL forward the human-readable error report (per-row violations) to the agent context.
5. The hook SHALL NOT modify the CSV file in any way — the validator is strictly read-only.

### Requirement 2: CSV Validator — Structural Checks

**User Story:** As a developer, I want the validator to catch structural CSV problems (malformed quoting, wrong column count, ragged rows) so that downstream tooling never receives a broken file.

#### Acceptance Criteria

1. The validator SHALL parse `data/featured-sites.csv` using the existing `parseCSV` function from `scripts/seed-logic.ts`, which implements RFC-4180 rules (quoted fields, embedded commas, escaped quotes). No external CSV parsing library is added.
2. The validator SHALL verify that the header row contains exactly these 12 column names in order: `url`, `title`, `mood_tags`, `character`, `stack`, `host`, `static_or_dynamic`, `built_with`, `why_note`, `nsfw`, `vibecoded`, `source`.
3. The validator SHALL verify that every data row contains exactly 12 fields. Any row with fewer or more fields SHALL be reported as a "ragged row" error.
4. IF any structural error is found, THEN the validator SHALL exit with a non-zero code and print a report listing each violation with its 1-based row number and a human-readable description.

### Requirement 3: CSV Validator — Required Fields

**User Story:** As a developer, I want the validator to enforce that mandatory fields are never blank, matching the schema contract.

#### Acceptance Criteria

1. The following fields SHALL be required (non-blank): `url`, `title`, `mood_tags`, `character`, `why_note`, `nsfw`, `vibecoded`, `source`.
2. The following fields MAY be blank: `stack`, `host`, `static_or_dynamic`, `built_with`.
3. IF a required field is blank (empty string after trimming) on any data row, THEN the validator SHALL report that row and field as an error.

### Requirement 4: CSV Validator — Enum and Value Constraints

**User Story:** As a developer, I want the validator to enforce the controlled vocabularies so that an invalid tag or value never enters the corpus.

#### Acceptance Criteria

1. `character` SHALL be exactly one of: `modern_indie`, `old_web`, `retro_personal`, `minimal_static`.
2. `mood_tags` SHALL be one or more `;`-separated values, each being one of: `useful`, `learn`, `waste_time`, `beautiful`, `think`. No duplicates within a row.
3. `stack` SHALL be blank OR one of: `nextjs`, `nuxt`, `astro`, `sveltekit`, `gatsby`, `remix`, `hugo`, `jekyll`, `eleventy`, `zola`, `docusaurus`, `wordpress`, `ghost`, `react_spa`, `vue_spa`, `svelte_spa`, `static_html`.
4. `host` SHALL be blank OR one of: `github_pages`, `vercel`, `netlify`, `cloudflare_pages`, `neocities`, `surge`, `firebase`, `render`, `fly`, `aws_s3`, `aws_amplify`, `heroku`, `self`.
5. `static_or_dynamic` SHALL be blank OR one of: `static`, `dynamic`.
6. `nsfw` SHALL be exactly `true` or `false` (lowercase string).
7. `vibecoded` SHALL be exactly `0` or `1`.
8. `built_with` SHALL be blank OR one of the values currently present in the corpus: `bolt`, `claude_code`, `cloudflare_workers`, `cursor`, `fly`, `godaddy_airo`, `kiro`, `lovable`.
9. `url` SHALL start with `https://`.
10. IF any value violates its constraint, THEN the validator SHALL report the row number, column name, actual value, and allowed values.

### Requirement 5: CSV Validator — Provenance Conventions

**User Story:** As a developer, I want the validator to enforce the project's provenance conventions (blank-not-unknown, no placeholder values) so that the corpus stays clean.

#### Acceptance Criteria

1. The string `unknown` (case-insensitive) SHALL NOT appear in any `stack`, `host`, or `static_or_dynamic` field. Blank is the correct representation for unknown provenance.
2. No field in the CSV SHALL contain the literal placeholder strings `TBD`, `TODO`, `N/A`, or `n/a`.
3. IF a provenance convention is violated, THEN the validator SHALL report the row number, column, and offending value.

### Requirement 6: CSV Validator — Output Format

**User Story:** As a developer (and as the agent consuming hook output), I want a clear, actionable report so I can fix problems quickly.

#### Acceptance Criteria

1. On success (zero violations), the validator SHALL exit 0 and print exactly one line to stdout in the format: `OK: {N} rows, 12 columns, all constraints pass`.
2. On failure (one or more violations), the validator SHALL exit 1 and print to stderr a report where each line follows the format: `Row {N}: [{column}] {description}` (one line per violation).
3. The report SHALL list ALL violations found (not stop at the first).
4. The exit code SHALL be 0 only when every check passes; any violation results in exit code 1.

### Requirement 7: Validator Test Coverage

**User Story:** As a developer, I want automated tests for the validator so that changes to validation logic don't introduce false positives or false negatives.

#### Acceptance Criteria

1. A vitest test file SHALL exist at `scripts/__tests__/validate-seed.test.ts`.
2. The tests SHALL cover: the pass case (current production CSV passes cleanly); a ragged-row failure; a missing required field; an invalid enum value for each constrained column; a provenance-convention violation (`unknown` in `stack`); a duplicate mood tag; and an invalid `vibecoded` value.
3. All validator tests SHALL pass when the existing 115 project tests pass (`npx vitest run`).
4. The validator tests SHALL import validation logic as a module (not shell out to the script) so they run fast and are deterministic.

### Requirement 8: test-on-save Hook Registration

**User Story:** As a developer editing application source, I want the full test suite to run automatically on every save so that regressions surface at the moment of the edit.

#### Acceptance Criteria

1. A hook file SHALL exist at `.kiro/hooks/test-on-save.json` with trigger `PostFileSave` and matcher pattern `src/.*\\.tsx?$`.
2. The hook's command SHALL be `npx vitest run`.
3. WHEN all tests pass (exit 0), the hook SHALL forward the vitest summary to the agent context.
4. WHEN any test fails (exit non-zero), the hook SHALL forward the failure output to the agent context so the agent can suggest fixes.

### Requirement 9: Non-Interference

**User Story:** As a developer, I want these hooks to leave existing behaviour untouched so that the app, API, and all 115 existing tests remain green.

#### Acceptance Criteria

1. No file in `src/` SHALL be modified by this spec.
2. `tsc --noEmit` SHALL produce zero errors after all spec work is complete.
3. The existing 115 vitest tests SHALL continue to pass without modification.
4. The validator script SHALL be read-only over `data/featured-sites.csv` — it never writes, moves, or deletes the file.
5. The hooks SHALL not alter any Wrangler, Vite, or D1 configuration.
6. The spec SHALL NOT add `.kiro/hooks/` or any spec artifact to `.gitignore`, and SHALL NOT modify `.gitignore`.
