/**
 * /api/stumble route — parses filter params, calls Stumble Engine,
 * returns the appropriate JSON response.
 */

import { Hono } from "hono";
import { stumble, type StumbleParams, type SiteRow } from "../engine/stumble";

type Bindings = {
  DB: D1Database;
};

/** Valid mood values accepted by the filter. */
const VALID_MOODS = new Set([
  "useful",
  "learn",
  "waste_time",
  "beautiful",
  "think",
  "surprise",
]);

/** Valid character values accepted by the filter. */
const VALID_CHARACTERS = new Set([
  "modern_indie",
  "old_web",
  "retro_personal",
  "minimal_static",
]);

/** Valid static_or_dynamic values. */
const VALID_STATIC_OR_DYNAMIC = new Set(["static", "dynamic"]);

/**
 * Parse comma-separated string into an array, filtering out empty strings.
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse the seen parameter (comma-separated IDs) into validated positive integers.
 * Non-integer or non-positive values are silently dropped.
 */
function parseSeenIds(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * Transform a SiteRow from D1 into the API response shape.
 * - mood_tags split on ";" into an array
 * - Only includes specified fields
 * - Null provenance fields are included as null (not omitted)
 */
function transformSiteResponse(site: SiteRow) {
  return {
    id: site.id,
    url: site.url,
    title: site.title,
    why_note: site.why_note,
    mood_tags: site.mood_tags.split(";").filter((t) => t.length > 0),
    character: site.character,
    stack: site.stack ?? null,
    host: site.host ?? null,
    static_or_dynamic: site.static_or_dynamic ?? null,
  };
}

export const stumbleRoute = new Hono<{ Bindings: Bindings }>();

stumbleRoute.get("/stumble", async (c) => {
  try {
    const mood = c.req.query("mood");
    const character = c.req.query("character");
    const stack = c.req.query("stack");
    const host = c.req.query("host");
    const staticOrDynamic = c.req.query("static_or_dynamic");
    const seen = c.req.query("seen");

    // Build StumbleParams, ignoring invalid values
    const params: StumbleParams = {};

    // Mood: validate against known values; invalid → treat as absent
    if (mood && VALID_MOODS.has(mood)) {
      params.mood = mood;
    }

    // Character: validate against known values; invalid → treat as absent
    if (character && VALID_CHARACTERS.has(character)) {
      params.character = character;
    }

    // Stacks: comma-separated, no validation on values (they come from the corpus)
    const stacks = parseCommaSeparated(stack);
    if (stacks.length > 0) {
      params.stacks = stacks;
    }

    // Hosts: comma-separated, no validation on values (they come from the corpus)
    const hosts = parseCommaSeparated(host);
    if (hosts.length > 0) {
      params.hosts = hosts;
    }

    // Static or dynamic: validate against known values
    if (staticOrDynamic && VALID_STATIC_OR_DYNAMIC.has(staticOrDynamic)) {
      params.staticOrDynamic = staticOrDynamic;
    }

    // Seen IDs: parse and validate as positive integers
    const seenIds = parseSeenIds(seen);
    if (seenIds.length > 0) {
      params.seen = seenIds;
    }

    const result = await stumble(c.env.DB, params);

    if (result.status === "ok") {
      return c.json({
        status: "ok",
        site: transformSiteResponse(result.site),
      });
    }

    // no_match or exhausted — return as-is
    return c.json({ status: result.status });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});
