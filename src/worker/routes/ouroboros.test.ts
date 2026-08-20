/**
 * Unit tests for /ouroboros route
 *
 * Feature: vibecoded-corner, Task 5.3
 * Validates: Requirements 12.3
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { ouroborosRoute } from "./ouroboros.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a test app with the ouroboros route mounted at root */
function createApp() {
  const app = new Hono();
  app.route("", ouroborosRoute);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/ouroboros route", () => {
  it("returns 200 with Content-Type text/html", async () => {
    const app = createApp();
    const res = await app.request("/ouroboros");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("response body contains required colophon text", async () => {
    const app = createApp();
    const res = await app.request("/ouroboros");
    const body = await res.text();

    expect(body).toContain(
      "You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner."
    );
  });

  it("response body contains a link", async () => {
    const app = createApp();
    const res = await app.request("/ouroboros");
    const body = await res.text();

    expect(body).toContain('<a href="https://github.com/thekashifnazir/surfdeck"');
  });
});
