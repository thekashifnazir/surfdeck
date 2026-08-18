# featured-sites.csv — schema (FINAL v1 — S0, 2026-08-06; orchestrator owns)

The featured/quality tier: a few hundred hand-vettable sites that carry the product's taste.
Stream 1 fills rows; this file defines the columns. One row per site.

**Columns are frozen for curation.** The `stack`/`host` controlled value lists are defined
in **`prep/provenance-rules.md` §3** (landed 2026-08-06). Curators still leave those
columns blank rather than guessing. (Same *principle* as `nsfw` but a different action:
an uncertain `stack`/`host` is left blank; an uncertain `nsfw` means **exclude the row**,
since `nsfw` is required and may never be blank.) The CSV stays **blank-only** for
unknowns: `unknown` is a detector-internal value and collapses to blank on write.

| Column | Type | Required | Notes |
|---|---|---|---|
| `url` | string | yes | Canonical https URL, no tracking params. Must be reachable (HEAD 2xx/3xx). |
| `title` | string | yes | Human title of the site/page. |
| `mood_tags` | list | yes | One or more Axis-1 values, `;`-separated (e.g. `useful;beautiful`). |
| `character` | enum | yes | Exactly one Axis-2 value (`modern_indie` \| `old_web` \| `retro_personal` \| `minimal_static`). |
| `stack` | enum | no | One value from `provenance-rules.md` §3 (e.g. `nextjs`, `hugo`, `static_html`). Blank if unknown. |
| `host` | enum | no | One value from `provenance-rules.md` §3 (e.g. `github_pages`, `vercel`, `neocities`, `cloudflare_pages`, `self`). **`cloudflare_pages` = the Pages product (`*.pages.dev`)**; a bare Cloudflare *proxy* is not a host — leave blank. Blank if unknown. |
| `static_or_dynamic` | enum | no | `static` \| `dynamic` \| `` (unknown). |
| `why_note` | string | yes | One line: *why this site is here* (the "history of places" touch). This is the taste signal. |
| `nsfw` | bool | yes | `true`/`false`. Anything uncertain → exclude, don't guess. |
| `source` | string | yes | Where it came from (which awesome-list / directory / personal find). |

## Rules
- **CSV, UTF-8, header row.** Quote any field containing a comma.
- No login-walled sites, no SEO/content-farm pages, no dead links.
- `why_note` is mandatory — a row without a reason isn't "featured," it's just a link.
- Target **200–400 rows** across a balanced spread of moods and characters.
