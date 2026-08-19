# Surfdeck — Tech Stack & Build

## Stack

- **Frontend:** Vite + React + TypeScript SPA
- **API:** Hono app running on a single Cloudflare Worker (serves both the SPA static assets and the API)
- **Database:** Cloudflare D1 (SQLite at edge)
- **Data source:** `data/featured-sites.csv` — 288 hand-curated sites imported into D1
- **Client state:** localStorage for thumbs, save, and history (local-first — no accounts, no auth, no server-side user state in v1)
- **Deploy:** Wrangler to workers.dev

## Dependencies

Minimal and pinned. Use exact versions, not ranges.

## Conventions

- All data values use `lowercase_snake_case`.
- CSV is UTF-8, header row, fields with commas are quoted.
- Mood tags are `;`-separated within the `mood_tags` column.
- Provenance columns (`stack`, `host`, `static_or_dynamic`) are left **blank** when unknown — never write the string "unknown" to storage.
- `nsfw` is a required boolean; uncertain = exclude the row entirely.

## CSV-to-D1 Seed Import

- Adds `tier` and `added_at` columns at ingest (not present in the source CSV).
- Preserves blanks for unknown provenance — never fills with "unknown" or placeholder values.

## Key Data Files

- `data/featured-sites.csv` — the curated corpus (source of truth for the featured tier)
- `reference/` — frozen specs, vocabulary, and rules (read-only reference material, not runtime code)

## Commands

- `npm install` — install dependencies
- `npx wrangler dev` — local dev server (Worker + D1 local)
- `npx wrangler deploy` — deploy to workers.dev
- Seed script (TBD) — import CSV into D1, adding `tier` and `added_at`

## Notes

- `.gitignore` excludes: `.env`, `node_modules/`, `dist/`, `.wrangler/`
- Environment secrets go in `.env` files (gitignored); use `.env.example` as a template.
