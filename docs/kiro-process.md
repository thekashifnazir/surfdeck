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
