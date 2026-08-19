/**
 * Worker entry point — stub for development.
 * Full implementation in task 5.3.
 */

import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
