/**
 * Surf Engine — core query builder and executor.
 *
 * Selects one random site matching the given filters, excludes NSFW sites,
 * excludes already-seen sites via inlined integer literals in a NOT IN clause,
 * and distinguishes zero-match from exhausted states.
 */

/** Filter parameters for a surf request. */
export interface SurfParams {
  /** One of: useful, learn, waste_time, beautiful, think, surprise. Omit or "surprise" = no mood filter. */
  mood?: string;
  /** One of: modern_indie, old_web, retro_personal, minimal_static. */
  character?: string;
  /** Stack values — OR within dimension. */
  stacks?: string[];
  /** Host values — OR within dimension. */
  hosts?: string[];
  /** "static" or "dynamic". */
  staticOrDynamic?: string;
  /** Site IDs already seen this session. */
  seen?: number[];
}

/** A single site row from D1. */
export interface SiteRow {
  id: number;
  url: string;
  title: string;
  mood_tags: string;
  character: string;
  stack: string | null;
  host: string | null;
  static_or_dynamic: string | null;
  why_note: string;
  nsfw: number;
  source: string;
  tier: string;
  added_at: string;
}

/** Surf result — one of three outcomes. */
export type SurfResult =
  | { status: "ok"; site: SiteRow }
  | { status: "no_match" }
  | { status: "exhausted" };

/**
 * Build the WHERE clause conditions and bindings from the given filter params.
 * Always includes nsfw = 0 as the first condition.
 */
function buildFilterConditions(params: SurfParams): {
  conditions: string[];
  bindings: unknown[];
} {
  const conditions: string[] = ["nsfw = 0"];
  const bindings: unknown[] = [];

  // Mood filter — skip if absent or "surprise"
  if (params.mood && params.mood !== "surprise") {
    conditions.push(
      "(mood_tags = ? OR mood_tags LIKE ? OR mood_tags LIKE ? OR mood_tags LIKE ?)"
    );
    bindings.push(
      params.mood,
      `${params.mood};%`,
      `%;${params.mood}`,
      `%;${params.mood};%`
    );
  }

  // Character filter — exact match
  if (params.character) {
    conditions.push("character = ?");
    bindings.push(params.character);
  }

  // Build filters — OR within dimension, AND across dimensions
  if (params.stacks && params.stacks.length > 0) {
    const placeholders = params.stacks.map(() => "?").join(",");
    conditions.push(`stack IN (${placeholders})`);
    bindings.push(...params.stacks);
  }

  if (params.hosts && params.hosts.length > 0) {
    const placeholders = params.hosts.map(() => "?").join(",");
    conditions.push(`host IN (${placeholders})`);
    bindings.push(...params.hosts);
  }

  if (params.staticOrDynamic) {
    conditions.push("static_or_dynamic = ?");
    bindings.push(params.staticOrDynamic);
  }

  return { conditions, bindings };
}

/**
 * Validate and filter seen IDs to only positive integers.
 * Returns a deduplicated array of valid IDs.
 */
function validateSeenIds(seen: number[] | undefined): number[] {
  if (!seen || seen.length === 0) return [];
  const valid = seen.filter(
    (id) => Number.isInteger(id) && id > 0
  );
  // Deduplicate
  return [...new Set(valid)];
}

/**
 * Execute a surf query against D1.
 *
 * Strategy:
 * 1. Build filter conditions (always excludes NSFW).
 * 2. Query without seen-list exclusion to check if the pool exists (COUNT).
 * 3. If pool is empty → return "no_match".
 * 4. If pool exists and there's a seen-list, query with seen-list exclusion.
 * 5. If seen-list excludes everything → return "exhausted".
 * 6. Otherwise return the random site.
 */
export async function surf(
  db: D1Database,
  params: SurfParams
): Promise<SurfResult> {
  const { conditions, bindings } = buildFilterConditions(params);
  const validSeen = validateSeenIds(params.seen);

  const whereClause = conditions.join(" AND ");

  // Step 1: Check if any sites match the filters (ignoring seen-list).
  // This determines whether the result is "no_match" or potentially "exhausted".
  const countSql = `SELECT COUNT(*) as cnt FROM sites WHERE ${whereClause}`;
  const countResult = await db
    .prepare(countSql)
    .bind(...bindings)
    .first<{ cnt: number }>();

  const totalPool = countResult?.cnt ?? 0;

  if (totalPool === 0) {
    return { status: "no_match" };
  }

  // Step 2: If no seen-list, just pick a random site from the pool.
  if (validSeen.length === 0) {
    const selectSql = `SELECT * FROM sites WHERE ${whereClause} ORDER BY RANDOM() LIMIT 1`;
    const site = await db
      .prepare(selectSql)
      .bind(...bindings)
      .first<SiteRow>();

    if (!site) {
      return { status: "no_match" };
    }
    return { status: "ok", site };
  }

  // Step 3: Inline seen-list as integer literals in a NOT IN clause.
  // D1 forbids CREATE TEMP TABLE (SQLITE_AUTH), and seen-list can exceed
  // D1's 100-bound-parameter limit. Inlining validated integer literals is
  // safe because validateSeenIds() guarantees only deduplicated positive integers.
  const seenInline = validSeen.join(",");
  const selectWithSeenSql = `SELECT * FROM sites WHERE ${whereClause} AND id NOT IN (${seenInline}) ORDER BY RANDOM() LIMIT 1`;
  const site = await db
    .prepare(selectWithSeenSql)
    .bind(...bindings)
    .first<SiteRow>();

  if (!site) {
    // Pool exists but all sites have been seen
    return { status: "exhausted" };
  }

  return { status: "ok", site };
}
