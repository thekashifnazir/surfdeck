---
inclusion: fileMatch
fileMatchPattern: "**/vibecoded*,**/corner*,**/ouroboros*,**/discover*,**/built_with*"
---

# Vibecoded Taxonomy — Tier Definitions & Vocabulary

## Concept

A "vibecoded" site is one genuinely built by AI — spanning a ladder from no-code AI builders
to developer-cloud deployments where an AI coding assistant wrote the code. Surfdeck itself
(built end-to-end in Kiro, deployed to Cloudflare Workers) is Tier 4 and Exhibit #1 in its
own Vibecoded Corner.

## Curation Rule

> We vouch each site is vibecoded per-site; builder badges are removable, so any
> auto-detection is a hint, never proof. A site enters the corner only after human
> review confirms the AI-build signal. A false "vibecoded" label is worse than
> omitting a site.

## The 4-Tier Ladder

| Tier | Label | Description | Example builders |
|------|-------|-------------|-----------------|
| 1 | No-code AI builder | AI generates the site inside a hosted page-builder; user never touches code | Squarespace AI, Wix ADI, Framer AI, GoDaddy Airo |
| 2 | AI app-builder | AI writes and deploys a full app from a prompt; user edits in a visual IDE or chat | Lovable, v0, Bolt, Replit |
| 3 | AI-assisted + hosted | Developer uses an AI coding assistant, deploys to a managed host | Claude Code, Cursor, Kiro → Vercel, Netlify, GitHub Pages |
| 4 | Developer cloud | AI writes the code, deployed to raw cloud infra (Workers, Fly, etc.) | Kiro / Claude Code / Cursor → Cloudflare Workers/Pages, Fly.io |

Tier is **derived at render time** from the `built_with` value — it is never stored in the
DB or CSV. The mapping lives in `src/client/vibecoded-labels.ts`.

## `built_with` Vocabulary (snake_case IDs)

All values are lowercase_snake_case. The CSV and DB store exactly one of these (or NULL for
hand-made sites). Unknown = NULL, never the string "unknown".

### Tier 1 — No-code AI builders

| ID | Display label |
|----|---------------|
| `squarespace_ai` | Squarespace AI |
| `wix_adi` | Wix ADI |
| `framer_ai` | Framer AI |
| `godaddy_airo` | GoDaddy Airo |

### Tier 2 — AI app-builders

| ID | Display label |
|----|---------------|
| `lovable` | Lovable |
| `v0` | v0 |
| `bolt` | Bolt |
| `replit` | Replit |

### Tier 3 — AI-assisted + hosted

| ID | Display label |
|----|---------------|
| `claude_code` | Claude Code |
| `cursor` | Cursor |
| `kiro` | Kiro |
| `github_copilot` | GitHub Copilot |

### Tier 4 — Developer cloud

| ID | Display label |
|----|---------------|
| `cloudflare_workers` | Cloudflare Workers |
| `fly` | Fly.io |

Note: Tier 4 IDs overlap with the existing `host` vocabulary — that's intentional. The
`built_with` column identifies the AI tool/platform used to *create* the site; `host`
identifies where it *runs*. A site can be `built_with = kiro` AND `host = cloudflare_pages`.

## Schema Integration

- Column: `built_with TEXT` (nullable, added to `sites` table after `static_or_dynamic`)
- Column: `vibecoded INTEGER NOT NULL DEFAULT 0` (already exists — flipped to 1 for corner sites)
- CSV gains two new columns: `built_with` and `vibecoded`
- The seed UPSERT writes `built_with` and `vibecoded` as content columns
- `id`, `added_at`, `tier` remain outside the UPDATE SET (never churn on reseed)

## Surf Behaviour

- **Default surf** (open web): returns rows where `vibecoded = 0` — excludes corner sites
- **Vibecoded Corner**: returns rows where `vibecoded = 1` only
- **Tier filter** (corner-only): further restricts to rows whose `built_with` maps to the
  selected tier(s); no tier selected = all vibecoded sites

## Discovery Signals (hints, never proof)

Domain patterns that *suggest* a tier (used by the sampler script, never trusted blindly):

- `*.lovable.app` → T2 lovable
- `*.bolt.host` → T2 bolt
- `*.vercel.app` → T3 (tool unknown — could be any AI assistant)
- `*.netlify.app` → T3 (tool unknown)
- `*.pages.dev` → T4 cloudflare_workers
- `*.fly.dev` → T4 fly

These are discovery hints for the candidate report. Human review assigns the final
`built_with` value.
