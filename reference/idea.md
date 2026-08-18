# Surfdeck — the idea

*(This file is written to be read by Kiro as project source material. It distills research
prepared before the competition period; all specs, steering, and code are created fresh in
Kiro from it.)*

## The problem

The web used to be a place you wandered. StumbleUpon sent 60 million people to sites
they'd never have searched for. Then it closed, search became an SEO arms race, and
discovery collapsed into a handful of algorithmic feeds showing everyone the same
optimised content. The hand-made web — personal sites, digital gardens, weird little
toys, obsessive corners of knowledge — never left. It just became unfindable.

## The product

**Surfdeck** is one button that finds it again. Click **Stumble** and a single real,
independent website opens in a new tab, picked at random from a curated corpus of the
living indie web. No feed, no ranked list, no infinite scroll — **serendipity is the
product.** A miss is part of the wander; nothing is ever an error state.

The personality layer is **provenance**: every result can carry a small card showing how
the site was built — `stack · host · static-or-dynamic` — because everyone's a builder
now, and the sites you love should be things you can learn from.

## The one interaction

1. Optionally pick a **mood** — the five stored moods and one bypass, with frozen button
   copy (see `tag-vocabulary.md`): useful / learn / waste_time / beautiful / think, plus
   **surprise**, which is NOT a stored tag — it means "ignore the mood filter."
2. Optionally narrow by **character** (single-valued: modern_indie / old_web /
   retro_personal / minimal_static) or by **how it's built** (filters derived from the
   corpus's stack/host/static values — never hard-coded).
3. Hit **Stumble** → one random matching site, new tab. Repeat forever.

## The data

`data/featured-sites.csv` — 288 hand-curated, individually verified sites, tagged against
the frozen vocabulary. Schema: the ten columns in `featured-sites.schema.md`, plus `tier`
and `added_at` added at import. Unknown provenance is stored **blank — never "unknown."**

## MVP boundary (hackathon scope)

**In:** stumble + mood routing · provenance card (precomputed for the featured tier,
rendered blank-not-error) · character + build filters. **Stretch, in order:** thumbs
up/down biasing randomness, then save/history ("Keep it" / "Where you've been") — both
local-first. **Out of v1:** accounts/auth (nothing to log into — deliberate),
submissions, bulk ingest, live provenance detection.

## Roadmap (post-hackathon, named so the vision reads bigger than the demo)

- **Submissions** — "Know a site we're missing?" pending → approved → corpus.
- **Bulk tier** — tens of thousands of auto-vetted sites from the researched source
  catalogue, with lazy cached provenance detection.
- **The vibecoded corner** — everyone's a builder now *includes AI-assisted builders*:
  a stumble mode for the wave of vibecoded personal sites. They even carry their own
  provenance signals ("Built with Lovable/v0/Bolt" badges, host patterns) — a natural
  extension of the detection layer. Surfdeck itself, built in Kiro, belongs in this
  corner of its own corpus.

## Principles (hold these against every design decision)

- Never a feed, never a list, never infinite scroll.
- A blank provenance card reads as fine; `unknown · unknown · unknown` is forbidden.
- Nothing blocks the next stumble.
- Local-first; the product works logged-out because there is no logging in.
- The corpus is curated, not scraped-and-dumped; quality over volume.
