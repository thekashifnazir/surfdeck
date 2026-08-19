/**
 * /api/filters route — returns distinct non-NULL, non-empty values
 * for stack, host, and static_or_dynamic from the sites table.
 */

import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

export const filtersRoute = new Hono<{ Bindings: Bindings }>();

filtersRoute.get("/filters", async (c) => {
  try {
    const [stacksResult, hostsResult, staticOrDynamicResult] = await Promise.all(
      [
        c.env.DB.prepare(
          "SELECT DISTINCT stack FROM sites WHERE stack IS NOT NULL AND stack != '' ORDER BY stack"
        ).all<{ stack: string }>(),
        c.env.DB.prepare(
          "SELECT DISTINCT host FROM sites WHERE host IS NOT NULL AND host != '' ORDER BY host"
        ).all<{ host: string }>(),
        c.env.DB.prepare(
          "SELECT DISTINCT static_or_dynamic FROM sites WHERE static_or_dynamic IS NOT NULL AND static_or_dynamic != '' ORDER BY static_or_dynamic"
        ).all<{ static_or_dynamic: string }>(),
      ]
    );

    return c.json({
      stacks: stacksResult.results.map((r) => r.stack),
      hosts: hostsResult.results.map((r) => r.host),
      static_or_dynamic: staticOrDynamicResult.results.map(
        (r) => r.static_or_dynamic
      ),
    });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});
