/**
 * /api/corpus-size route — returns the total number of non-NSFW sites in the corpus.
 */

import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

export const corpusSizeRoute = new Hono<{ Bindings: Bindings }>();

corpusSizeRoute.get("/corpus-size", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM sites WHERE nsfw = 0"
    ).first<{ total: number }>();

    c.header("Cache-Control", "public, max-age=3600");
    return c.json({ total: result?.total ?? 0 });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});
