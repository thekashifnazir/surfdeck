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
