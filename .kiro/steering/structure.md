# Surfdeck — Project Structure

```
SurfDeck/
├── .kiro/                  # Kiro IDE configuration (steering, hooks, specs)
│   └── steering/           # Always-included context for the AI assistant
├── data/
│   └── featured-sites.csv  # The curated corpus (288 sites, 10 columns)
├── docs/
│   ├── kiro-process.md     # Process log with dated screenshots
│   └── screenshots/        # Visual evidence of the build process
├── reference/              # Frozen specs and rules — DO NOT EDIT without re-tagging
│   ├── idea.md             # Product vision and principles
│   ├── product-copy.md     # All UI microcopy (frozen labels + suggested copy)
│   ├── provenance-rules.md # Detection logic for stack/host/static_or_dynamic
│   ├── tag-vocabulary.md   # The 6 moods, 4 characters, and Axis-3 build filters
│   └── featured-sites.schema.md  # CSV column definitions and rules
└── .gitignore
```

## Folder Roles

| Folder | Purpose | Mutability |
|--------|---------|------------|
| `data/` | Runtime data — the site corpus | Append-only (add rows, don't restructure) |
| `reference/` | Design contracts and frozen vocabulary | Read-only unless a full re-tag is triggered |
| `docs/` | Process documentation and screenshots | Append-only log |
| `.kiro/` | AI assistant configuration | Editable |

## Key Rules

- `reference/` files define frozen contracts. Changing a mood tag or character value requires re-tagging all 288 rows.
- `data/featured-sites.csv` schema is defined in `reference/featured-sites.schema.md` — columns are frozen.
- Source code (workers, frontend, scripts) will live at the repo root or in `src/` when created.
- No `src/`, `public/`, or application code exists yet — the project is in pre-implementation (design/data phase).
