/**
 * /ouroboros route — standalone colophon HTML page.
 * Surfdeck is exhibit #1 in its own vibecoded corner.
 * Served as a standalone page (not the SPA) so it works when
 * opened in a new tab from surf, like any other site URL.
 */

import { Hono } from "hono";

export const ouroborosRoute = new Hono();

ouroborosRoute.get("/ouroboros", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Surfdeck — The Ouroboros</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; line-height: 1.6; }
    .glyph { font-size: 4rem; text-align: center; margin: 2rem 0; opacity: 0.3; }
    h1 { font-size: 1.5rem; }
    a { color: inherit; }
  </style>
</head>
<body>
  <div class="glyph" aria-hidden="true">&#x1F40D;</div>
  <h1>The loop closes.</h1>
  <p>You're inside the app you're surfing with. Surfdeck was built end-to-end by AI in Kiro — exhibit #1 in its own vibecoded corner.</p>
  <p><a href="https://github.com/thekashifnazir/surfdeck">View the repo &amp; process log</a></p>
  <p class="note"><em>Glyph placeholder — the real ouroboros design comes in a later cycle.</em></p>
</body>
</html>`;
  return c.html(html);
});
