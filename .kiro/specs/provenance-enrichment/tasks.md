# Implementation Plan: Provenance Enrichment

## Overview

Populate the currently-blank `stack`, `host`, and `static_or_dynamic` columns for Surfdeck's 288 featured sites via an offline detector script, upgrade the seed to UPSERT, add display labels, and verify with tests. The detector emits a report for human review — it never edits the CSV directly. After approval, values are written to the CSV, reseeded into D1, and the live app's Build Filters and Provenance Card light up with real data.

## Tasks

- [x] 1. Schema migration and project setup
  - [x] 1.1 Add `vibecoded` column to `schema.sql` and provide production ALTER statement
    - Add `vibecoded INTEGER NOT NULL DEFAULT 0` after `nsfw` in the CREATE TABLE statement in `schema.sql`
    - Document the one-time production migration: `ALTER TABLE sites ADD COLUMN vibecoded INTEGER NOT NULL DEFAULT 0;` in a comment at the top of `schema.sql`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 1.2 Add `.provenance-cache/` to `.gitignore` and install `robots-parser`
    - Append `.provenance-cache/` to `.gitignore`
    - Run `npm install --save-dev --save-exact robots-parser` (pinned version)
    - Verify `package.json` has the new dependency with an exact version
    - _Requirements: 3.4_

- [x] 2. Detection rule set (pure logic, no I/O)
  - [x] 2.1 Implement `scripts/rules.ts` — the pure detection rule module
    - Export `detectProvenance(input: SignalInput): RuleResult` function
    - Implement `detectStack`: HIGH-confidence HTML fingerprints (11 rules), MEDIUM-confidence fallbacks (4 rules) in priority order per design doc
    - Implement `detectHost`: HIGH-confidence header + DNS rules (12 rules including surge via `*.surge.sh` and firebase via `*.web.app`/`*.firebaseapp.com`) with CF-Ray trap guard
    - Implement `detectStaticOrDynamic`: composite scoring with static/dynamic signal tallying and decision logic per design doc
    - Implement row-level confidence assignment (min of non-blank field confidences)
    - Export type interfaces: `SignalInput`, `RuleResult`
    - _Requirements: 4.1–4.5, 5.1–5.5, 6.1–6.5, 7.1–7.3_

  - [x] 2.2 Write detection rule tests (`scripts/rules.test.ts`)
    - Test 1: Next.js HIGH — `__NEXT_DATA__` + `/_next/static/` → stack=`nextjs`
    - Test 2: Hugo + GitHub Pages — generator meta "Hugo 0.120" + CNAME `*.github.io` + no Set-Cookie → stack=`hugo`, host=`github_pages`, sod=`static`
    - Test 3: CF-Ray trap — `CF-Ray` + `Server: cloudflare`, no `*.pages.dev` CNAME → host=blank
    - Test 4: Next.js + dynamic trap — `__NEXT_DATA__` + `Set-Cookie` + `Cache-Control: no-store` → stack=`nextjs`, sod=`dynamic`
    - Test 5: Minimal static — plain semantic HTML, no scripts → stack=`static_html`, sod=`static`
    - Test 6: Ambiguous/blank — generic nginx + CF-Ray, no markers → all blank
    - Test 7: WordPress — generator "WordPress 6.4" + `wp-content/` + Set-Cookie → stack=`wordpress`, sod=`dynamic`
    - Test 8: Netlify static — `X-Nf-Request-Id` + no Set-Cookie + `Cache-Control: public` → host=`netlify`, sod=`static`
    - Each test must fail without its corresponding rule implementation
    - _Requirements: 12.1_

- [x] 3. Detector script (I/O layer)
  - [x] 3.1 Implement `scripts/detect-provenance.ts` — fetcher + cache + report emitter
    - Read URLs from `data/featured-sites.csv` (reuse `parseCSV` + `buildColIndex` from `seed-logic.ts`)
    - For each URL: check cache (`.provenance-cache/<sha256-of-url>.json`); if cache miss:
      - Fetch and parse `robots.txt` for the origin (one fetch per domain, cached separately in `.provenance-cache/robots/<domain>.txt`); skip if path disallowed
      - Make one HEAD request (10s timeout)
      - Make one GET request for HTML (10s timeout, truncate body at 500KB)
      - Resolve DNS CNAME for the hostname via `dns.promises.resolveCname()`
      - Save response bundle to cache
    - Rate-limit: max 2 concurrent fetches, 500ms delay between initiations
    - Set `User-Agent: SurfdeckBot/0.1` on all requests
    - No retries — on failure (timeout, DNS error, non-2xx), emit all-blank row
    - The robots.txt fetch is additional to the per-URL HEAD + GET; it is not counted against the one-HEAD-one-GET limit
    - Call `detectProvenance()` from `scripts/rules.ts` with the fetched/cached signals
    - Sort results by confidence descending
    - Write `data/provenance-report.md` with summary stats + markdown table
    - _Requirements: 1.1–1.4, 2.1–2.5, 3.1–3.3, 7.4–7.5, 8.1–8.6_

- [x] 4. Seed UPSERT migration
  - [x] 4.1 Modify `scripts/seed-logic.ts` — switch `seedRowToSQL` to UPSERT pattern
    - Change `INSERT OR IGNORE` to `INSERT INTO sites (...) VALUES (...) ON CONFLICT(url) DO UPDATE SET`
    - UPDATE SET clause includes: `title`, `mood_tags`, `character`, `stack`, `host`, `static_or_dynamic`, `why_note`, `nsfw`, `source`
    - UPDATE SET clause does NOT include: `id`, `added_at`, `tier`, `vibecoded`
    - Ensure the INSERT column list includes `vibecoded` with value `0` for new rows (schema has it as NOT NULL DEFAULT 0, but explicit for clarity)
    - Wait — actually do NOT include `vibecoded` in the INSERT list; let the DEFAULT 0 handle new rows. The UPSERT's UPDATE SET also omits it. This ensures it's never touched by the seed.
    - _Requirements: 10.1–10.5_

  - [x] 4.2 Write UPSERT tests (additions to `scripts/seed-logic.test.ts`)
    - Test: UPSERT updates provenance — insert with blank stack, re-insert with stack=`nextjs` → row has `nextjs`, same `added_at`, same `id`, one row total
    - Test: UPSERT preserves `added_at` — original timestamp survives re-seed
    - Test: Idempotency — running UPSERT N times produces same DB state as once
    - _Requirements: 12.2_

- [ ] 5. Display labels
  - [ ] 5.1 Create `src/client/provenance-labels.ts` with PROVENANCE_LABELS map
    - Export `PROVENANCE_LABELS: Record<string, string>` covering all stack, host, and static_or_dynamic controlled vocabulary values with human-friendly names
    - Export `getProvenanceLabel(value: string): string` — returns label or falls through to raw value
    - _Requirements: 11.1, 11.4_

  - [ ] 5.2 Modify `ProvenanceCard.tsx` to use `getProvenanceLabel()`
    - Import `getProvenanceLabel` from `../provenance-labels`
    - Apply it to `site.stack`, `site.host`, `site.static_or_dynamic` before rendering in the `<dd>` element
    - Ensure the "Hand-made on the open web." fallback remains unchanged for all-blank
    - _Requirements: 11.2, 11.6_

  - [ ] 5.3 Modify `BuildFilter.tsx` to use `getProvenanceLabel()`
    - Import `getProvenanceLabel` from `../provenance-labels`
    - Apply it to the button text content (display only — the `value` used in filter logic and sent to API remains the raw snake_case string)
    - _Requirements: 11.3, 11.5_

  - [ ] 5.4 Write label tests (`src/client/provenance-labels.test.ts`)
    - Test: `getProvenanceLabel("nextjs")` → "Next.js"
    - Test: `getProvenanceLabel("github_pages")` → "GitHub Pages"
    - Test: `getProvenanceLabel("static")` → "Static"
    - Test: `getProvenanceLabel("some_future_value")` → "some_future_value" (passthrough)
    - Test: ProvenanceCard with all-blank still shows "Hand-made on the open web." (integration with labels)
    - _Requirements: 12.3_

- [ ] 6. Checkpoint — run full test suite
  - Run `npx tsc --noEmit` and `npm test`
  - All rule tests, UPSERT tests, and label tests must pass
  - Show command output to user

- [ ] 7. Run detector and emit report
  - [ ] 7.1 Execute `npx tsx scripts/detect-provenance.ts`
    - Run the detector against all 288 URLs
    - Show progress output (fetched count, cache hits, errors)
    - Confirm `data/provenance-report.md` is generated
    - Show summary stats (sites scanned, fields detected, all-blank count)
    - _Requirements: 1.1, 8.1_

  - [ ] 7.2 STOP — present `data/provenance-report.md` for human review
    - Show the report to the user
    - Wait for explicit approval of which values to write to the CSV
    - Do NOT proceed to CSV write until user approves
    - _Requirements: 1.4, 8.1_

- [ ] 8. Write approved values to CSV and reseed (AFTER user approval only)
  - [ ] 8.1 Write approved provenance values into `data/featured-sites.csv`
    - Only write values the user explicitly approved from the report
    - Preserve all other CSV columns unchanged
    - Blank fields remain blank (never write "unknown")
    - Never write a value the reviewer has not approved or that is below MEDIUM confidence (unless reviewer explicitly overrides)
    - Aim for coverage: several distinct stacks, several distinct hosts, both static and dynamic, at least one rare value enabling a zero-match state in the demo
    - _Requirements: 7.2, 13.1–13.6_

  - [ ] 8.2 Reseed local D1 and verify
    - Run `npx tsx scripts/seed.ts` to UPSERT enriched data into local D1
    - Run `npx tsc --noEmit` — show output
    - Run `npm test` — show output
    - Verify `/api/filters` now returns non-empty stacks/hosts arrays
    - _Requirements: 10.4, 10.5_

## Notes

- The detector runs offline on the developer's machine — it is never deployed.
- Task 7.2 is a hard STOP gate: no CSV modifications happen without explicit human approval of the report.
- The `vibecoded` column is schema-only for now — no code reads or writes it (reserved for a future cycle).
- Detection credits: rule set authored from publicly documented signals (MDN, framework docs, hosting platform docs). No Wappalyzer/GPL database used.
- `robots-parser` is the only new dependency (MIT, lightweight).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "3.1"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["6"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2"] },
    { "id": 9, "tasks": ["8.1"] },
    { "id": 10, "tasks": ["8.2"] }
  ]
}
```
