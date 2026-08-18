# Tag vocabulary — the discovery axes (FINAL v1 — S0, 2026-08-06)

This is the **shared contract**. Every curated site (`featured-sites.csv`) tags against it,
and it maps 1:1 to the backend query (`SELECT random WHERE ? IN mood_tags AND character=? AND stack=?` —
a site matches a mood when that mood appears anywhere in its `mood_tags` list).
Axes 1 and 2 are **frozen for curation**: changing a tag after curation means re-tagging
every row, so any change now requires the orchestrator to re-open S0 and re-tag.

## Axis 1 — Mood / intent (primary selector; "why you're bored")

| Tag (value) | Button copy | Surfaces |
|---|---|---|
| `useful` | "Show me something useful" | Tools, calculators, converters, references, single-purpose utilities |
| `learn` | "Teach me something" | Explainers, interactive essays, tutorials, digital gardens |
| `waste_time` | "Waste my time" | Games, toys, novelty, generative nonsense |
| `beautiful` | "Show me something beautiful" | Design showcases, generative art, photography, award-style sites |
| `think` | "Make me think" | Essays, provocations, weird ideas, personal manifestos |
| `surprise` | "Surprise me" | Pure random across everything |

A site may carry **multiple** mood tags (`mood_tags` is a list). `surprise` is not stored —
it's "ignore the mood filter."

## Axis 2 — Character (what corner of the web; single value)

| Tag (value) | Meaning | Reference point |
|---|---|---|
| `modern_indie` | Post-2020 hand-built sites, often static, no SEO | the core thesis |
| `old_web` | Pre-2000 surviving pages, GeoCities-era | Wiby.me |
| `retro_personal` | Neocities, webrings, hobbyist homepages | Neocities |
| `minimal_static` | Text-first, fast, no-framework, brutalist | 512KB/1MB club |

## Axis 3 — Build filter (derived, NOT hand-tagged)

Not a hand-tagged vocabulary — filters are **derived** from the schema's `stack` / `host` /
`static_or_dynamic` columns. The canonical value lists are defined in
**`prep/provenance-rules.md` §3** (confirmed at integration, 2026-08-06): 18 `stack` values
(`nextjs` … `static_html`, `unknown`), 14 `host` values (`github_pages` … `self`,
`unknown`), all lowercase snake_case. Blank is always legal and preferred over a guess;
`unknown` is detector-internal and collapses to blank in the CSV. Filter buttons populate
from the distinct values actually present in the corpus — no separate Axis-3 list to
maintain.

## Decisions (S0, 2026-08-06)
- The **6 moods and 4 characters above are final** for the curation round. They were seeded
  from the project taxonomy plan and map 1:1 to the planned query shape; no additions or
  removals before Stream 1 completes.
- Axis 3 seam **closed at Stream 3 integration (2026-08-06)**: the controlled
  `stack`/`host` lists live in `prep/provenance-rules.md` §3 and are mirrored into the
  schema. Stream 1 still leaves those columns blank when unknown.
- "Real life near me" special mode stays **out of scope** — stretch feature, not part of
  this vocabulary.
