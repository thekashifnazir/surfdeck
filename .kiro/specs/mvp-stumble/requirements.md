# Requirements Document

## Introduction

Surfdeck is a web discovery tool that opens a single random independent website in a new tab from a curated corpus of 288 hand-vetted sites. The MVP delivers the core stumble interaction: optional mood selection, optional character and build filters, a stumble button that picks one random matching site, and a provenance card showing how the site was built. There is no feed, no list, no infinite scroll, no login, and no server-side user state.

## Glossary

- **Stumble_Engine**: The backend API component that receives filter parameters and returns one random matching site from the corpus.
- **Site_Corpus**: The 288 hand-curated sites stored in D1, imported from `data/featured-sites.csv` with precomputed provenance columns.
- **Mood_Selector**: The UI component presenting six mood buttons for the user to optionally pick a mood before stumbling.
- **Character_Filter**: The UI component allowing the user to optionally narrow results to one of the four character values.
- **Build_Filter**: The UI component allowing the user to optionally narrow results by stack, host, or static_or_dynamic values derived from the corpus.
- **Provenance_Card**: The UI component displaying how a site was built (stack, host, static/dynamic) after a stumble.
- **SPA_Shell**: The Vite + React + TypeScript single-page application served by the Worker.

## Requirements

### Requirement 1: Stumble Action

**User Story:** As a visitor, I want to press a single button and have a random independent website open in a new browser tab, so that I can discover sites I would never have searched for.

#### Acceptance Criteria

1. WHEN the user activates the Stumble button, THE Stumble_Engine SHALL select one site uniformly at random from all sites in the Site_Corpus matching every currently active filter and return its URL to the SPA_Shell within 2 seconds.
2. WHEN the SPA_Shell receives a site URL from the Stumble_Engine, THE SPA_Shell SHALL open that URL in a new browser tab.
3. WHEN the user activates the Stumble button with no filters selected, THE Stumble_Engine SHALL select one site uniformly at random from the entire Site_Corpus.
4. IF the active filter combination matches zero sites in the Site_Corpus, THEN THE Stumble_Engine SHALL return an empty-result indicator and THE SPA_Shell SHALL display the heading "Nothing in that corner right now." with sub-line "Loosen a filter and try again." and keep the Stumble button enabled.
5. IF the Stumble_Engine returns a network error, THEN THE SPA_Shell SHALL remain interactive, keep the Stumble button enabled, and allow the user to stumble again without displaying a modal or blocking overlay.
6. IF the browser blocks the new tab due to popup blockers or security policies, THEN THE SPA_Shell SHALL display a message informing the user that the tab was blocked and SHALL keep the current tab unchanged.

### Requirement 2: Mood Selection

**User Story:** As a visitor, I want to optionally select a mood before stumbling, so that the random site matches my current intent.

#### Acceptance Criteria

1. THE Mood_Selector SHALL present exactly six buttons with the following labels in order: "Show me something useful", "Teach me something", "Waste my time", "Show me something beautiful", "Make me think", "Surprise me", with at most one mood button in a selected state at any time.
2. WHEN the user selects a mood button other than "Surprise me", THE Stumble_Engine SHALL return only sites whose `mood_tags` column contains the corresponding query value (`useful`, `learn`, `waste_time`, `beautiful`, `think`).
3. WHEN the user selects "Surprise me", THE Stumble_Engine SHALL ignore the mood filter and select from all sites matching other active filters.
4. IF no mood button is selected, THEN THE Stumble_Engine SHALL treat the request identically to "Surprise me" (no mood filter applied).
5. WHEN the user taps a mood button that is already in the selected state, THE Mood_Selector SHALL deselect that button and return to the unfiltered state.
6. WHILE a mood is selected, THE Mood_Selector SHALL visually distinguish the selected button from unselected buttons so the active mood is identifiable at a glance.
7. WHILE a mood is selected, THE Mood_Selector SHALL persist that selection across consecutive stumbles until the user explicitly selects a different mood or deselects the current one.

### Requirement 3: Character Filter

**User Story:** As a visitor, I want to optionally narrow results by the character of the web (modern indie, old web, retro personal, minimal & fast), so that I land in a specific corner of the internet.

#### Acceptance Criteria

1. THE Character_Filter SHALL present four selectable options corresponding to the values `modern_indie`, `old_web`, `retro_personal`, and `minimal_static`, with no option selected by default.
2. WHEN the user selects a character option, THE Stumble_Engine SHALL constrain the random selection to only sites whose `character` column matches the selected value, applied as an AND condition with any active mood or build filters.
3. WHEN the user selects a character option while a different character option is already active, THE Character_Filter SHALL deselect the previously active option and activate the newly selected one so that at most one character value is active at a time.
4. WHEN the user deselects the active character option, THE Character_Filter SHALL remove the character constraint from the query so that all character values are eligible.
5. IF the combination of active filters (including the selected character) matches zero sites in the corpus, THEN THE SPA_Shell SHALL display the heading "Nothing in that corner right now." with sub-line "Loosen a filter and try again." without triggering navigation to a new tab.
6. WHILE a character option is selected, THE Character_Filter SHALL retain that selection across consecutive stumble actions until the user explicitly deselects it or selects a different option.

### Requirement 4: Build Filters

**User Story:** As a visitor, I want to optionally narrow results by how a site was built (stack, host, static/dynamic), so that I can discover sites using technology I am interested in.

#### Acceptance Criteria

1. THE Build_Filter SHALL populate its available filter values from the distinct non-blank values of `stack`, `host`, and `static_or_dynamic` that are actually present in the Site_Corpus, grouped into three separate filter dimensions.
2. WHEN the user selects one or more build filter values within the same dimension, THE Stumble_Engine SHALL treat those selections as OR (match any selected value within that dimension) and combine across dimensions with AND (a site must satisfy every dimension that has an active selection).
3. WHEN the user selects one or more build filter values alongside an active mood or character selection, THE Stumble_Engine SHALL return only sites that satisfy all active constraints across all axes (mood, character, and each build filter dimension combined with AND).
4. THE Build_Filter SHALL allow the user to deselect any active build filter value, removing that constraint from the query; WHEN all build filter values are deselected, THE Stumble_Engine SHALL treat the build filters as inactive and apply no build-related constraints.
5. THE Build_Filter SHALL NOT display blank or empty values as selectable options.
6. IF the combination of all active filters (mood, character, and build filters) matches zero sites in the Site_Corpus, THEN THE SPA_Shell SHALL display the heading "Nothing in that corner right now." with sub-line "Loosen a filter and try again." without displaying an error state, and SHALL not block navigation to adjust filters.

### Requirement 5: Provenance Card

**User Story:** As a visitor, I want to see how the site I just stumbled to was built, so that I can learn from sites I like.

#### Acceptance Criteria

1. WHEN the Stumble_Engine returns a site, THE Provenance_Card SHALL display each non-blank provenance field (`stack`, `host`, `static_or_dynamic`) with its corresponding label ("Stack", "Hosted on", "Type"), omitting any field whose value is blank.
2. IF all three provenance fields (`stack`, `host`, `static_or_dynamic`) of the returned site are blank, THEN THE Provenance_Card SHALL display exactly the single quiet line "Hand-made on the open web." — it SHALL NOT be hidden, SHALL NOT render the text "unknown" in any field, and SHALL NOT display empty labelled slots.
3. THE Provenance_Card SHALL NOT display the literal string "unknown" for any provenance field under any circumstance.
4. THE Provenance_Card SHALL render within the same frame as the Stumble result (no secondary network request and no additional loading state) using precomputed provenance data included in the Stumble_Engine response payload.

### Requirement 6: Filter Combination

**User Story:** As a visitor, I want mood, character, and build filters to work together, so that I can combine constraints freely before stumbling.

#### Acceptance Criteria

1. WHEN multiple filter types are active simultaneously (mood, character, build), THE Stumble_Engine SHALL return only sites satisfying all active constraints (logical AND across filter types).
2. WHEN the active filter combination matches zero sites in the Site_Corpus, THE SPA_Shell SHALL display the heading "Nothing in that corner right now." with sub-line "Loosen a filter and try again." — it SHALL NOT display a technical error.
3. THE SPA_Shell SHALL allow the user to stumble again immediately after receiving a zero-match result without requiring page navigation.
4. WHEN the user changes a filter while a zero-match state is displayed, THE SPA_Shell SHALL clear the zero-match message and allow a new stumble with the updated filters.

### Requirement 7: No Blocking States

**User Story:** As a visitor, I want nothing to block my next stumble, so that discovery feels fluid and uninterrupted.

#### Acceptance Criteria

1. THE SPA_Shell SHALL keep the Stumble button enabled and interactive at all times except during an in-flight request to the Stumble_Engine.
2. WHEN a Stumble_Engine request completes (success or failure), THE SPA_Shell SHALL re-enable the Stumble button within 100 milliseconds.
3. THE SPA_Shell SHALL NOT display modal dialogs, full-screen loading indicators, or any overlay that prevents the user from adjusting filters or initiating a new stumble.
4. IF a Stumble_Engine request does not complete within 5 seconds or a network-level timeout occurs before 5 seconds, THEN THE SPA_Shell SHALL abort the request, re-enable the Stumble button, and allow the user to try again without a blocking error state.

### Requirement 8: Seed Import

**User Story:** As a developer, I want a repeatable process to import the CSV corpus into D1, so that the featured sites are available for the Stumble_Engine to query.

#### Acceptance Criteria

1. THE Seed_Import process SHALL read all rows from `data/featured-sites.csv` and insert them into the D1 database.
2. THE Seed_Import process SHALL add a `tier` column with value `featured` and an `added_at` column with an ISO 8601 UTC timestamp representing the import time to each imported row.
3. THE Seed_Import process SHALL preserve blank values for `stack`, `host`, and `static_or_dynamic` columns as NULL in D1 — it SHALL NOT substitute "unknown" or any placeholder string.
4. THE Seed_Import process SHALL be idempotent using the site `url` as the deduplication key: running the import multiple times against the same data SHALL NOT create duplicate rows.
5. THE Seed_Import process SHALL skip rows that have an empty `url` field, logging a warning for each skipped row.
6. THE Seed_Import process SHALL treat each row insertion as atomic — IF adding any required column (`tier` or `added_at`) fails, THEN THE entire row insertion SHALL be rolled back.

### Requirement 9: Single-Page Application Serving

**User Story:** As a visitor, I want to access Surfdeck from a single URL without additional setup, so that the experience is immediate and frictionless.

#### Acceptance Criteria

1. THE Cloudflare Worker SHALL serve the SPA_Shell static assets with correct MIME content-type headers (e.g., `text/html`, `application/javascript`, `text/css`) and the Stumble_Engine API from a single workers.dev deployment.
2. WHEN a request path starts with the API route prefix (`/api/`), THE Cloudflare Worker SHALL route the request to the Stumble_Engine API handler.
3. WHEN a request path does not match a known API route or a static asset filename, THE Cloudflare Worker SHALL respond with the SPA_Shell entry point (index.html) and a 200 status code to support client-side routing and browser refresh on any SPA route.
4. IF a request targets an API route that does not exist under the `/api/` prefix, THEN THE Cloudflare Worker SHALL respond with a 404 status code and a JSON body indicating the route was not found, rather than falling back to the SPA_Shell.
5. IF the Stumble_Engine API handler fails to process a request, THEN THE Cloudflare Worker SHALL return an appropriate HTTP error status code (5xx) with a JSON body — it SHALL NOT fall back to serving the SPA_Shell.
6. THE SPA_Shell SHALL load and reach an interactive state (first Stumble button usable) within 3 seconds on a standard broadband connection (4G or faster) without requiring the user to create an account or authenticate.

### Requirement 10: Randomness Quality

**User Story:** As a visitor, I want consecutive stumbles to feel genuinely random and not repetitive, so that serendipity stays fresh.

#### Acceptance Criteria

1. THE Stumble_Engine SHALL use a uniform random selection method such that, over any sample of 100 stumbles against an unchanged matching pool, no single site is selected more than 5 times the expected frequency (expected frequency = 100 / pool size).
2. THE Stumble_Engine SHALL NOT return results in a fixed or alphabetical order.
3. THE SPA_Shell SHALL maintain a seen-list of all site URLs returned during the current browser session, persisted in localStorage or sessionStorage (no server-side user state).
4. WHEN the user activates the Stumble button, THE SPA_Shell SHALL send the seen-list (or an equivalent exclusion set of seen site identifiers) with the stumble request to the Stumble_Engine.
5. WHEN the Stumble_Engine receives a stumble request containing a seen-list, THE Stumble_Engine SHALL exclude all sites in the seen-list from the random selection pool before choosing a result.
6. IF every site matching the active filters has already been seen this session (the exclusion set covers the entire matching pool), THEN THE Stumble_Engine SHALL indicate an exhausted-pool state to the SPA_Shell rather than returning a duplicate site.

### Requirement 11: Exhausted State

**User Story:** As a visitor, I want to know when I have seen every matching site in my current session, so that I can reset and start discovering again rather than receiving duplicates.

#### Acceptance Criteria

1. WHEN every site matching the active filters has been seen this session (the seen-list covers the entire matching pool), THE SPA_Shell SHALL display the heading "You've wandered the whole neighbourhood." with sub-line "Reset history to start fresh?" and a reset action button.
2. THE SPA_Shell SHALL visually distinguish the exhausted state from the zero-match state ("Nothing in that corner right now.") — the exhausted state is not an error and SHALL NOT display error styling.
3. WHEN the user activates the reset action, THE SPA_Shell SHALL clear the seen-list from localStorage or sessionStorage and re-enable the Stumble button so the user can stumble again with the same filters.
4. AFTER the seen-list is cleared, THE Stumble_Engine SHALL treat the next stumble request as if no sites have been seen, selecting from the full pool matching the active filters.

### Requirement 12: NSFW Guard

**User Story:** As a visitor, I want to be confident that stumbling will not open explicit content, so that I can use Surfdeck in any environment.

#### Acceptance Criteria

1. THE Stumble_Engine SHALL exclude all sites whose `nsfw` column value is `true` from the random selection pool, regardless of which filters are active.
2. THE Stumble_Engine SHALL enforce the NSFW exclusion at the query level so that no NSFW site is ever returned in a stumble response, even if the featured corpus currently contains no NSFW sites.
