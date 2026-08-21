# Implementation Plan: Agent Hooks — seed-data-gate & test-on-save

## Overview

Implement two Kiro agent hooks and a CSV validator script. Tasks are ordered so each is individually verifiable: dependency setup → validator logic → validator tests → hook registration → demonstration. No existing `src/` files are modified.

## Tasks

- [x] 1. Add dependency and create directory structure
  - [x] 1.1 Confirm `tsx` is already a pinned devDependency
    - Verify `tsx` appears in `package.json` devDependencies with an exact (pinned) version — do NOT downgrade or duplicate it
    - Do NOT install `csv-parse` or any other new dependency
    - _Verify:_ `npx tsx --version` runs without error; `package.json` devDependencies includes `tsx` with no caret/tilde
    - _Requirements: 2.1, 9.5_

  - [x] 1.2 Create directory scaffold
    - Create `scripts/lib/` directory
    - Create `scripts/__tests__/` directory
    - Create empty placeholder files: `scripts/validate-seed.ts`, `scripts/lib/validate-csv.ts`, `scripts/__tests__/validate-seed.test.ts`
    - _Verify:_ `ls scripts/lib/validate-csv.ts scripts/__tests__/validate-seed.test.ts scripts/validate-seed.ts` succeeds
    - _Requirements: 7.1_

- [x] 2. Implement CSV validation logic
  - [x] 2.1 Implement `scripts/lib/validate-csv.ts` — structural checks
    - Export `ValidationError`, `ValidationResult` interfaces and `validateCsv(content: string): ValidationResult` function
    - Import `parseCSV` from `'../seed-logic'` and use it for RFC-4180 parsing (pure string→string[][], no file I/O)
    - Implement header validation: exactly 12 columns in order (`url`, `title`, `mood_tags`, `character`, `stack`, `host`, `static_or_dynamic`, `built_with`, `why_note`, `nsfw`, `vibecoded`, `source`)
    - Implement ragged-row detection (any row with field count ≠ 12)
    - _Verify:_ `npx tsx -e "import { validateCsv } from './scripts/lib/validate-csv'; console.log(typeof validateCsv)"` prints `function`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Implement `scripts/lib/validate-csv.ts` — required fields and URL format
    - Required non-blank fields: `url`, `title`, `mood_tags`, `character`, `why_note`, `nsfw`, `vibecoded`, `source`
    - Optional (blank allowed): `stack`, `host`, `static_or_dynamic`, `built_with`
    - URL must start with `https://`
    - _Verify:_ Manually craft a 1-row CSV string with blank `title`, call `validateCsv()`, confirm error references `[title]`
    - _Requirements: 3.1, 3.2, 3.3, 4.9_

  - [x] 2.3 Implement `scripts/lib/validate-csv.ts` — enum constraints
    - `character`: `modern_indie | old_web | retro_personal | minimal_static`
    - `mood_tags`: `;`-separated, each in `useful | learn | waste_time | beautiful | think`, no duplicates
    - `stack`: blank or one of 17 values (nextjs, nuxt, astro, sveltekit, gatsby, remix, hugo, jekyll, eleventy, zola, docusaurus, wordpress, ghost, react_spa, vue_spa, svelte_spa, static_html)
    - `host`: blank or one of 13 values (github_pages, vercel, netlify, cloudflare_pages, neocities, surge, firebase, render, fly, aws_s3, aws_amplify, heroku, self)
    - `static_or_dynamic`: blank or `static | dynamic`
    - `nsfw`: exactly `true` or `false`
    - `vibecoded`: exactly `0` or `1`
    - `built_with`: blank or one of 8 values (bolt, claude_code, cloudflare_workers, cursor, fly, godaddy_airo, kiro, lovable)
    - _Verify:_ Call `validateCsv()` with a row containing `character = "funky"`, confirm error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.10_

  - [x] 2.4 Implement `scripts/lib/validate-csv.ts` — provenance conventions
    - Reject `unknown` (case-insensitive) in `stack`, `host`, `static_or_dynamic`
    - Reject literal `TBD`, `TODO`, `N/A`, `n/a` in ANY field
    - _Verify:_ Call `validateCsv()` with `stack = "Unknown"`, confirm error
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Implement CLI entry point
  - [x] 3.1 Implement `scripts/validate-seed.ts`
    - Read `data/featured-sites.csv` (resolve path relative to project root)
    - Call `validateCsv(content)`
    - On success: write one-line summary to stdout, exit 0
    - On failure: write per-row errors to stderr, exit 1
    - _Verify:_ Run `npx tsx scripts/validate-seed.ts` against the current production CSV; expect exit 0 and `OK: 349 rows, 12 columns, all constraints pass`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Implement validator tests
  - [x] 4.1 Write pass-case test
    - Import `validateCsv` from `../lib/validate-csv`
    - Read actual `data/featured-sites.csv`, pass to `validateCsv`
    - Assert `ok === true` and `rowCount === 349`
    - _Verify:_ `npx vitest run scripts/__tests__/validate-seed.test.ts` passes
    - _Requirements: 7.2_

  - [x] 4.2 Write structural failure tests
    - Test: ragged row (remove last field from a cloned row) → error mentioning "ragged" or "12 fields"
    - Test: wrong header (swap two column names) → error mentioning header
    - _Verify:_ `npx vitest run scripts/__tests__/validate-seed.test.ts` passes
    - _Requirements: 7.2_

  - [x] 4.3 Write required-field and URL tests
    - Test: blank `title` → error on `[title]`
    - Test: blank `source` → error on `[source]`
    - Test: `url` starting with `http://` → error on `[url]`
    - _Verify:_ `npx vitest run scripts/__tests__/validate-seed.test.ts` passes
    - _Requirements: 7.2_

  - [x] 4.4 Write enum constraint tests
    - Test: invalid `character` ("funky") → error listing allowed values
    - Test: invalid `mood_tags` ("useful;party") → error on `party`
    - Test: duplicate `mood_tags` ("useful;useful") → error on duplicate
    - Test: invalid `stack` ("angular") → error listing allowed values
    - Test: invalid `host` ("aws") → error listing allowed values
    - Test: invalid `static_or_dynamic` ("hybrid") → error
    - Test: invalid `nsfw` ("yes") → error
    - Test: invalid `vibecoded` ("2") → error
    - Test: invalid `built_with` ("chatgpt") → error
    - _Verify:_ `npx vitest run scripts/__tests__/validate-seed.test.ts` passes
    - _Requirements: 7.2_

  - [x] 4.5 Write provenance convention tests
    - Test: `stack = "unknown"` → error about `unknown` not allowed
    - Test: `why_note = "TBD"` → error about placeholder
    - Test: multiple violations in one row → all reported (not short-circuit)
    - _Verify:_ `npx vitest run scripts/__tests__/validate-seed.test.ts` passes
    - _Requirements: 7.2_

- [x] 5. Verify full test suite still passes
  - [x] 5.1 Run `tsc --noEmit` — expect zero errors
    - _Verify:_ Exit code 0, no output
    - _Requirements: 9.2_

  - [x] 5.2 Run `npx vitest run` — all tests pass (original 115 + new validator tests)
    - _Verify:_ Exit code 0, all tests green
    - _Requirements: 7.3, 9.3_

- [x] 6. Register hooks
  - [x] 6.1 Create `.kiro/hooks/seed-data-gate.json`
    - Use `createHook` tool with: id `seed-data-gate`, name `Validate CSV on save`, trigger `PostFileSave`, matcher `data/featured-sites\\.csv$`, actionType `command`, command `npx tsx scripts/validate-seed.ts`
    - _Verify:_ File exists at `.kiro/hooks/seed-data-gate.json` with correct content
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 6.2 Create `.kiro/hooks/test-on-save.json`
    - Use `createHook` tool with: id `test-on-save`, name `Run tests on source save`, trigger `PostFileSave`, matcher `src/.*\\.tsx?$`, actionType `command`, command `npx vitest run`
    - _Verify:_ File exists at `.kiro/hooks/test-on-save.json` with correct content
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Demonstration — seed-data-gate catches a broken row
  - [x] 7.1 Introduce a deliberate CSV error
    - Edit `data/featured-sites.csv`: on row 5, change `character` from `minimal_static` to `funky_invalid`
    - Run `npx tsx scripts/validate-seed.ts`
    - _Verify:_ Exit code 1, stderr contains `Row 5: [character] "funky_invalid" is not a valid character`
    - _Requirements: 4.1, 4.10, 6.2_

  - [x] 7.2 Revert the CSV to its original state
    - Run `git checkout -- data/featured-sites.csv`
    - Run `npx tsx scripts/validate-seed.ts`
    - _Verify:_ Exit code 0, stdout contains `OK: 349 rows, 12 columns, all constraints pass`
    - _Requirements: 6.1, 9.4_

  - [x] 7.3 Final verification
    - Run `tsc --noEmit` — zero errors
    - Run `npx vitest run` — all tests pass (115 original + validator tests)
    - _Verify:_ Both commands exit 0
    - _Requirements: 9.2, 9.3_
