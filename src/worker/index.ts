/**
 * Worker entry point — Hono app serving the Stumble and Filters API routes.
 * Static assets + SPA fallback handled by Cloudflare Workers Assets (wrangler.jsonc config).
 */

import { Hono } from "hono";
import { stumbleRoute } from "./routes/stumble";
import { filtersRoute } from "./routes/filters";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Mount API routes
app.route("/api", stumbleRoute);
app.route("/api", filtersRoute);

// Catch-all: unknown /api/* paths return 404 JSON (Req 9.4)
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
