# Surfdeck — Product Summary

Surfdeck is a modern web discovery tool inspired by StumbleUpon. One click opens a single real, independent website in a new tab — picked at random from a curated corpus of the living indie web.

## Core Concept

- **Serendipity is the product.** No feed, no ranked list, no infinite scroll.
- Users pick an optional mood and/or filters, then hit "Stumble" to land on a random matching site.
- A provenance card shows how each site was built (stack, host, static/dynamic) — because "everyone's a builder now."

## Mood Buttons (FROZEN copy — use verbatim)

| Query value | Button label |
|---|---|
| `useful` | **Show me something useful** |
| `learn` | **Teach me something** |
| `waste_time` | **Waste my time** |
| `beautiful` | **Show me something beautiful** |
| `think` | **Make me think** |
| `surprise` | **Surprise me** |

`surprise` is **NOT a stored tag** — it means "ignore the mood filter." It never appears in the data.

## Key Interactions

1. Pick a **mood** (optional): one of the six buttons above.
2. Narrow by **character** (optional, single-valued — exactly one per site): modern_indie, old_web, retro_personal, minimal_static.
3. Narrow by **build filters** (optional): derived from stack/host/static_or_dynamic values in the corpus.
4. Hit **Stumble** → one random site, new tab.

## Design Principles

- Never a feed, never a list, never infinite scroll.
- A blank provenance card reads as fine; `unknown · unknown · unknown` is forbidden.
- Nothing blocks the next stumble.
- Local-first; there is no login.
- The corpus is curated, not scraped; quality over volume.
- A miss is part of the wander — nothing is ever an error state.

## MVP Scope

**In:** stumble + mood routing, provenance card (precomputed, blank-not-error), character + build filters.
**Stretch:** thumbs up/down biasing, save/history (local-first).
**Out of v1:** accounts/auth, submissions, bulk ingest, live provenance detection.
