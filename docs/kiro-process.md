# Kiro process log

Dated screenshots and notes of Kiro authoring this project: steering, specs, tasks, hooks.

## 2026-08-19 — Day 1

**01 · Fresh workspace, first open.** SurfDeck folder open in Kiro for the first time: `reference/` and `data/` present, no `.kiro/` yet, new chat session before any message sent.

![Fresh Kiro workspace, first open](screenshots/2026-08-19-01-fresh-workspace-first-open.png)

**02 · Ingestion play-back.** First message asked Kiro to read `reference/` and explain the project back without implementing. Its play-back matched the frozen contract on the first pass (stumble-not-feed, surprise-as-bypass, single-valued character, derived build filters, blank-not-error provenance); its one wrong assumption ("no database required") was corrected to the decided D1 stack in the follow-up.

![Kiro ingestion play-back](screenshots/2026-08-19-02-ingestion-playback.png)

**03–04 · Steering generated, then corrected through chat.** "Project steering files" generated `product.md`/`tech.md`/`structure.md`. Review caught two gaps: product.md lacked the frozen mood-button copy, and tech.md claimed the frontend was undecided (it is: Vite + React + TS SPA + Hono on one Worker). Both corrected via chat and re-accepted — Kiro authored every line.

![Correcting product.md](screenshots/2026-08-19-03-steering-correction-product.png)
![Correcting tech.md](screenshots/2026-08-19-04-steering-correction-tech.png)

**05–06 · Requirements phase.** Spec `mvp-stumble` created (Requirements-First). First draft reviewed against the frozen contract: caught an internal contradiction (repeats permitted vs last-3 no-repeat) and replaced both with the decided session seen-list rule; added the exhausted state, NSFW guard, and frozen empty-state copy. Then ran Kiro's Analyze Requirements: answered 12 clarifying questions (rejecting speculative scope like component-failure fallbacks), and accepted 4 incorporated clarifications (popup-blocker notice, network-timeout abort, atomic seed rows, API 5xx-as-JSON). Final doc: 12 requirements in EARS form.

![Analyze Requirements Q&A](screenshots/2026-08-19-05-analyze-requirements-qa.png)
![Clarifications incorporated](screenshots/2026-08-19-06-analysis-clarifications.png)

**07–08 · Design phase.** Generated `design.md`: single Worker (Hono + Workers Assets), D1 schema mapped from the CSV contract, distinct `no_match`/`exhausted` API statuses, 11 correctness properties traced to requirement numbers, fast-check PBT strategy. Review caught two real flaws: seen-list exclusion via `NOT IN (?,...)` would exceed D1's 100-bound-parameter limit at full corpus size (fixed: validated-integer temp-table + subquery, Decision #8), and `window.open` after an awaited fetch would be popup-blocked on Safari (fixed: open-then-navigate within the click gesture, Decision #9; Requirements 1.2/1.6/1.7 updated). Also dropped five pointless indexes and corrected transaction wording to D1 batch semantics.

![Design challenge corrections](screenshots/2026-08-19-07-design-challenge-corrections.png)
![Design fixes summary](screenshots/2026-08-19-08-design-fixes-summary.png)

**09–10 · Task plan, and the day-one trail complete.** Generated `tasks.md`: 12 top-level tasks in dependency waves with checkpoints, each traced to requirement numbers. Review added the missing production-deployment task (12.1–12.4: prod D1, seed, wrangler deploy, logged-out verification) and made the seed-import/engine property tests (2.2, 4.2) required rather than optional; UI/integration tests stay time-pressure-skippable. Day one ends with the full trail committed before any application code: reference → steering → requirements → design → tasks. All authored by Kiro; ~26 credits spent.

![Task list corrections](screenshots/2026-08-19-09-tasks-corrections-applied.png)
![Spec trail complete](screenshots/2026-08-19-10-spec-trail-complete.png)

## 2026-08-19 — Task execution

**11 · Fresh session, task list view.** New Kiro session for execution — the day-one chat thread deliberately discarded; steering + spec auto-load into every task run. Task list open at task 1.1, Autopilot off, tasks run one at a time via each task's own "Start task" link (never "Run all tasks").

![Fresh session, task list](screenshots/2026-08-19-11-fresh-session-task-list.png)

**12 · Task 1.1 started — approval gates.** Kiro delegated to its spec-task-execution subagent, which paused at an approval gate for every side effect: URL fetch, file writes, `mkdir -p` for the directory skeleton, in-file replaces. Each was reviewed and allowed individually — with Autopilot off, nothing lands without a human click.

![Approval gate: mkdir](screenshots/2026-08-19-12-approval-gate-mkdir.png)

**13 · Review panel before accepting.** Kiro's end-of-task review listed 4 pending changes (`package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`). Before accepting, the diff was independently reviewed from disk against the task spec: all ten required dependencies exact-pinned (no ranges), strict-mode tsconfig, React + Cloudflare Vite plugins, `wrangler.jsonc` with the `DB` binding / `src/worker/index.ts` main / SPA fallback, all six directories present, no scope creep into task 1.2. `npm install` verified clean (94 packages); `tsc --noEmit` reports TS18003 "no inputs" as expected for an empty scaffold. One item deferred to task 2.1: the `seed` script references `tsx`, which isn't yet a pinned devDependency.

![Review changes pending](screenshots/2026-08-19-13-task-1-1-review-changes.png)

**14 · Task 1.1 complete.** Marked `[x]` in the task list. Est. 8.46 credits, 16m52s elapsed.

![Task 1.1 complete](screenshots/2026-08-19-14-task-1-1-complete.png)

**15–16 · Task 1.2 — D1 schema, and a validation claim worth double-checking.** Same session, next task. Kiro wrote `schema.sql` exactly to spec — 13 columns, `url TEXT NOT NULL UNIQUE`, nullable `stack`/`host`/`static_or_dynamic`, `nsfw INTEGER NOT NULL DEFAULT 0`, no indexes (per the design review), plus design-doc `NOT NULL` constraints on the always-populated columns. Its self-validation command, though, ended in `|| true` — an exit-code mask that makes "validated, parses cleanly" unverifiable from the transcript. Re-verified independently: `wrangler d1 execute --local --file=schema.sql` exits 0, and a CSV audit confirmed all 288 corpus rows satisfy every `NOT NULL` constraint (zero blanks, no duplicate URLs), so the stricter schema is safe for the seed import. 1.63 credits, 2m1s. This closed parent task 1.

![Task 1.2 validation gate](screenshots/2026-08-19-15-task-1-2-validation-gate.png)
![Task 1.2 complete](screenshots/2026-08-19-16-task-1-2-complete.png)

**17–18 · Task 2.1 — CSV-to-D1 seed script.** Kiro read the CSV first, then wrote `scripts/seed.ts`: a hand-rolled RFC 4180 parser (quoted fields, escaped quotes, CRLF), blank provenance → SQL `NULL`, `nsfw` false→0, `tier='featured'` + ISO 8601 `added_at`, `INSERT OR IGNORE` on `url`, executed as one `wrangler d1 execute` call with a `--remote` flag ready for the production seed (task 12.2). Unprompted, it also fixed the pinning gap flagged at task 1.1: `tsx 4.19.4` and `@types/node` added as exact-pinned devDependencies, and the temp SQL file gitignored. Verified independently after its own checks: `tsc --noEmit` clean; seed run twice more from disk — 288 rows before, after run 1, and after run 2 (idempotent); all NULL/no-"unknown"/no-empty-string invariants hold in D1. One corpus fact surfaced by the audit: all 288 rows ship with blank `stack`/`host`/`static_or_dynamic` — the seed handles this correctly (NULLs), noted as a product consideration for the build-filter UI. 7.07 credits, 11m13s. Kiro's offer to continue into the next wave was declined — one task per review.

![Task 2.1 seed run](screenshots/2026-08-19-17-task-2-1-seed-run.png)
![Task 2.1 complete](screenshots/2026-08-19-18-task-2-1-complete.png)

**19–20 · Task 2.2 — property tests, and a good refactor.** Kiro extracted the seed's pure logic into `scripts/seed-logic.ts` (CSV parse → row map → SQL generation) so fast-check can drive it directly — the right testability seam, chosen unprompted over shelling out to wrangler per case. Eight property tests (100 runs each) cover Properties 8/9/10 with generated corpora: idempotent statement generation, no `'unknown'` ever emitted, blank-vs-value NULL mapping including whitespace-only blanks. It hit a real snag — the Cloudflare Vite plugin breaks vitest startup — and fixed it with a standalone `vitest.config.ts`. It also created a clearly-labeled 16-line `src/worker/index.ts` stub (health route only, "full implementation in task 5.3") because the plugin requires wrangler's `main` to exist; accepted as pragmatic, noted as early scaffolding for 5.3. Caveat logged: Property 8 is tested at the SQL-generation level (deterministic statements + `INSERT OR IGNORE`), a proxy for true DB-level idempotency — which was verified manually against local D1 (288 rows across repeated imports) and remains covered by integration task 10.3. Verified fresh: `tsc` clean, 8/8 tests pass, seed re-run post-refactor still yields 288 rows. 5.73 credits, 6m45s. Parent task 2 auto-closed.

![Task 2.2 vitest snag](screenshots/2026-08-19-19-task-2-2-vitest-snag.png)
![Task 2.2 complete](screenshots/2026-08-19-20-task-2-2-complete.png)

**21 · Checkpoint 3 — seed import working.** Kiro ran the full suite itself (8/8 pass) and marked the checkpoint. 0.67 credits, 35s.

![Checkpoint 3 complete](screenshots/2026-08-19-21-checkpoint-3-complete.png)

**22–24 · Task 4.1 — the Stumble Engine, and the day's biggest catch.** Kiro implemented `src/worker/engine/stumble.ts` to spec: `StumbleParams`/`SiteRow`/`StumbleResult` types, NSFW always excluded, boundary-anchored 4-pattern mood `LIKE`s (no substring false positives), `surprise` = no filter, OR-within/AND-across build filters as bound params, validated positive-integer seen IDs, and the zero-match/exhausted distinction via pool-count-first. It hit and self-fixed 3 TypeScript errors mid-task. 2.11 credits, 2m18s — `tsc` clean, all tests green.

Then the independent review caught what green tests couldn't: the design's temp-table pattern (Decision #8) **doesn't work on D1 at all** — `CREATE TEMP TABLE` is rejected by D1's SQLite authorizer with `not authorized: SQLITE_AUTH`, verified against local D1 in isolation. Every stumble request carrying a seen-list would have thrown in production; nothing surfaced it because no test exercised the batch path yet. The correction went back through Kiro chat with the verified evidence and the fix shape: since `validateSeenIds()` already guarantees deduplicated positive integers (and the code already inlined them as literals for the temp-table INSERT), the seen-list is inlined directly as `id NOT IN (1,2,3,...)` literals — no bound params, so the 100-binding limit doesn't apply; filter values stay parameterized. Kiro applied the fix to both `stumble.ts` and `design.md` (Decision #8 rewritten to record why). Re-verified: `tsc` clean, 8/8 tests, and the exact fixed SQL shape runs against local D1 (283-row pool after excluding 5 seen IDs). A design decision falsified by a platform check before it shipped — the clearest demonstration yet of why the review gate runs real commands instead of trusting a green suite.

![Task 4.1 complete](screenshots/2026-08-19-22-task-4-1-complete.png)
![Temp-table correction sent to Kiro](screenshots/2026-08-19-23-task-4-1-temp-table-correction.png)
![Fix review: stumble.ts + design.md](screenshots/2026-08-19-24-task-4-1-fix-review.png)

**25–26 · Task 4.2 — engine property tests, and an honest look at the mock.** Kiro read the engine implementation first, then wrote 13 property tests for Properties 1–7 against a hand-built mock D1 — a "specification oracle" that intercepts the engine's *actual* generated SQL and bindings, sniffs which conditions are present, regex-extracts the inlined seen-list, and applies the spec's intended semantics in JS. A first run failed 13/13 (mock/binding mismatch); Kiro fixed it and landed 21/21 green (8 seed + 13 engine). The design is stronger than a canned-rows mock — an omitted filter condition or wrong binding order genuinely fails Property 1 — but it has one blind spot, called out honestly: the mock never *executes* the engine's LIKE patterns (it uses idealized `tags.includes()` semantics), so Property 4's substring-false-positive claim was resting on the ideal, not on SQLite. That gap was closed by independent verification instead of more test code: the engine's exact 4-pattern WHERE clause was run against real SQLite with ten adversarial tag layouts (`reuseful`, `usefulness`, every position) — all four legitimate positions match, all six collisions rejected. Real-D1 end-to-end coverage still lands at tasks 10.3/12.4.

![Task 4.2 first run failing](screenshots/2026-08-19-25-task-4-2-failing-run.png)
![Task 4.2 green, review pending](screenshots/2026-08-19-26-task-4-2-green-review.png)

**27 · Task 5.1 — `/api/stumble` route.** Kiro read the engine interface first, then implemented the route as a faithful transcription of the design contract: vocabulary-validated mood/character/static_or_dynamic (invalid values silently treated as absent, per Requirement 5.4), comma-separated stack/host/seen parsing with positive-integer validation, the three response statuses, and JSON `{ error }` 500 on D1 failures. The response transformation (mood_tags split to an array, provenance nulls included, internal columns omitted) matches the design's example byte-for-byte — checked against `design.md` before accepting, since "returns mood_tags as an array" could equally have been an invention. Unprompted but welcome: 18 route unit tests covering param validation and response shapes. Full suite now 39/39 green. 5.58 credits, 4m52s.

![Task 5.1 complete](screenshots/2026-08-19-27-task-5-1-complete.png)
