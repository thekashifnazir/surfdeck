/**
 * Worker entry point — Hono app serving the Surf and Filters API routes.
 * Static assets + SPA fallback handled by Cloudflare Workers Assets (wrangler.jsonc config).
 */

import { Hono } from "hono";
import { surfRoute } from "./routes/surf";
import { filtersRoute } from "./routes/filters";
import { ouroborosRoute } from "./routes/ouroboros";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Mount standalone pages (before API and SPA fallback)
app.route("", ouroborosRoute);

// Mount API routes
app.route("/api", surfRoute);
app.route("/api", filtersRoute);

// Catch-all: unknown /api/* paths return 404 JSON (Req 9.4)
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
