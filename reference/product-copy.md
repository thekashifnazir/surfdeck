# Product microcopy (S7)

The words the app needs. **Two states of truth:**

- 🔒 **FROZEN** — restated verbatim from `prep/tag-vocabulary.md` / `prep/kiro-spec-notes.md`.
  Changing any of these re-opens a full-corpus re-tag (288 rows). **Do not edit here — mirror only.**
- ✏️ **SUGGESTED** — drafted by this stream for the user's taste pass. Change freely.

---

## 1. Mood buttons 🔒 FROZEN

The primary selector. Copy is **frozen** — it maps 1:1 to the backend query
(`WHERE :mood IN mood_tags`). `surprise` is **not stored**; it means "ignore the mood filter."

| Query value | Button label (FROZEN) |
|---|---|
| `useful` | **Show me something useful** |
| `learn` | **Teach me something** |
| `waste_time` | **Waste my time** |
| `beautiful` | **Show me something beautiful** |
| `think` | **Make me think** |
| `surprise` (not a stored tag) | **Surprise me** |

## 2. The stumble button ✏️ SUGGESTED

The one action. Options, in preference order:

- **Stumble** — closest to the heritage, one word, verb.
- **Take me somewhere**
- **Show me the web**
- **Get lost** — cheekier; pairs well as a tagline, maybe too flip as the primary button.

Sub-label under the button (optional): "One click. One real site. New tab."

## 3. Character filter ✏️ SUGGESTED

The `character` axis is single-valued (`modern_indie | old_web | retro_personal | minimal_static`).
The **values are frozen**; these **labels are suggested** (the vocabulary defines meanings, not
button copy). Present as a secondary "corner of the web" row.

| Value 🔒 | Suggested label ✏️ | Suggested one-liner ✏️ |
|---|---|---|
| `modern_indie` | **Modern indie** | Post-2020, hand-built, no SEO. |
| `old_web` | **The old web** | Pre-2000 survivors and faithful revivals. |
| `retro_personal` | **Retro personal** | Neocities, webrings, homepages. |
| `minimal_static` | **Minimal & fast** | Text-first, no-framework, tiny. |

Row heading: ✏️ "Pick a corner of the web (optional)".

## 4. Build filter ✏️ SUGGESTED

Derived from `stack` / `host` / `static_or_dynamic` — buttons populate from values actually
present in the corpus (don't hard-code the full list). Copy pattern:

- Heading: ✏️ "Or filter by how it's built (optional)"
- Static toggle: ✏️ **"Fast & static only"**
- Stack chips: ✏️ label from the value, e.g. `nextjs` → "Next.js", `static_html` → "Plain HTML".
- Host chips: ✏️ e.g. `github_pages` → "GitHub Pages", `neocities` → "Neocities".

## 5. Provenance card ✏️ SUGGESTED (labels), 🔒 rules from spec

Renders `stack · host · static_or_dynamic`. **Rule (from `kiro-spec-notes.md` §4, treat as
frozen behaviour):** show only confident fields; **never** `unknown · unknown · unknown`;
a blank card reads as fine — never an error state.

- Card heading: ✏️ **"How this site is built"**
- Field labels: ✏️ **Stack** · **Hosted on** · **Type** (Static / Dynamic)
- When all fields are blank: ✏️ show nothing, or a single quiet line **"Hand-made on the open web."**
- Card footer line (the thesis): ✏️ **"Everyone's a builder. Learn from the sites you like."**
- Behind-Cloudflare note (spec §4): `CF-Ray` means "behind Cloudflare," ✏️ never render it as a host.

## 6. Empty / error / edge states ✏️ SUGGESTED

Keep the tone light and human — a miss is part of the wander, never a red error box.

| Situation | Copy ✏️ |
|---|---|
| A site failed to load / 404'd in the new tab | **"That one got away."** — with a **[Stumble again]** button. |
| No sites match the current filters | **"Nothing in that corner right now."** Sub: "Loosen a filter and try again." |
| Everything's been seen this session | **"You've wandered the whole neighbourhood."** Sub: "Reset history to start fresh?" |
| Slow / detecting provenance | *(No spinner in the card — it fails open to blank. Never block the next stumble.)* |
| Network offline | **"Looks like you're offline."** Sub: "The web's still out there — reconnect and stumble." |
| Submission received | **"Got it — thanks for keeping the good web alive."** |
| Submission duplicate / already listed | **"Already in the mix — good taste."** |

## 7. Thumbs / save microcopy ✏️ SUGGESTED

- Thumbs up: ✏️ tooltip **"More like this"**
- Thumbs down: ✏️ tooltip **"Fewer like this"** (biases future randomness away — spec rung 4)
- Save: ✏️ **"Keep it"** → saved view heading **"Places you kept"**
- History: ✏️ **"Where you've been"**

## 8. About-page blurb ✏️ SUGGESTED

> **The web used to be a place you wandered.**
>
> You'd click a button and land somewhere strange and wonderful — a personal homepage, a weird
> little toy, someone's obsessive corner of knowledge. StumbleUpon did that for 60 million
> people. Then it closed, search turned into an SEO arms race, and discovery became a handful of
> feeds showing everyone the same optimised stuff.
>
> The hand-made web never left. It just got unfindable.
>
> **Surfdeck** is one button that finds it again. Click, and a single real, independent website
> opens in a new tab — pulled at random from a curated corpus of the living indie web. No feed,
> no algorithm deciding what you deserve, no infinite scroll. Just the accident of finding
> something good.
>
> And because everyone's a builder now, every site can show you *how it was made* — its stack,
> its host, whether it's static — so the places you love become things you can learn from.
>
> Pick a mood. Pick a corner of the web. Get lost.

## 9. Submission-form copy ✏️ SUGGESTED

- Form heading: **"Know a site we're missing?"**
- Sub: **"The good web is crowd-kept. Add a place worth stumbling onto."**
- Field — URL: label **"Site address"**, placeholder `https://…`
- Field — mood(s): label **"What mood is it?"** (multi-select of the six)
- Field — why (optional): label **"Why's it worth it?"**, placeholder *"One line — what makes it special."*
- Submit button: **"Add it"**
- Fine print: **"We check every submission before it joins the mix."**
  *(Maps to `submissions.status` pending → approved → writes into `sites`, per spec §3.)*

## 10. Name & tagline options ✏️ — **DECIDED**

> **✅ DECIDED (2026-08-13): the name is "Surfdeck"** — the user's own pick, not one of the
> six drafted options (table kept for the record). The tagline is still open — the
> standalone candidates below remain live. Availability (domain/trademark/app-store) is
> unchecked — verify before committing to the public repo name.

The original options, for the record:

| # | Name | Tagline option | The read |
|---|---|---|---|
| 1 | **Stumble** | "The button that finds the good web." | Honest, heritage-clear; possibly too generic / hard to own. |
| 2 | **Wander** | "One button. The whole hand-made web." | Calm, evocative; leans into the serendipity. |
| 3 | **Offbeat** | "The web the algorithm buried." | Punchy; signals indie/non-mainstream. |
| 4 | **Sidequest** | "Get lost on purpose." | Playful, gamer-adjacent; memorable. |
| 5 | **Backroads** | "Skip the highway. See the real web." | Metaphor-rich; the SEO-highway vs indie-backroad framing. |
| 6 | **Cameo** *(or **Corners**)* | "Every click, a different corner of the internet." | "Corners" ties to the character axis; "Cameo" may clash with the existing app. |

Standalone tagline candidates (name-agnostic), if useful:
- "Serendipity is the product."
- "No feed. No algorithm. Just somewhere you'd never have found."
- "The accident of finding something wonderful."
- "Everyone's a builder. Come see what they built."

---

### Frozen-vs-suggested summary

- 🔒 **Frozen (mirror only):** the six mood-button labels (§1); the `character` values,
  `stack`/`host` value lists, and schema column names; the provenance render rules (§5) and the
  "never `unknown · unknown · unknown`, never an error state" behaviour.
- ✏️ **Everything else is suggested** — stumble button, filter labels, all empty/error copy,
  about blurb, submission form, and every name/tagline. The **name was the user's
  decision — decided 2026-08-13: Surfdeck** (§10); the tagline is still open.
