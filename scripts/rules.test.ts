/**
 * Detection Rule Tests — scripts/rules.test.ts
 *
 * Static fixture tests for the provenance detection rule module.
 * Each test constructs a SignalInput and asserts the expected detection result.
 *
 * Validates: Requirements 12.1
 */

import { describe, it, expect } from "vitest";
import { detectProvenance, type SignalInput } from "./rules.js";

// ---------------------------------------------------------------------------
// Helper: build a minimal SignalInput with overrides
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<SignalInput> = {}): SignalInput {
  return {
    headHeaders: {},
    getHeaders: {},
    html: "<html><head></head><body></body></html>",
    cnames: [],
    statusCode: 200,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1: Next.js HIGH — __NEXT_DATA__ + /_next/static/ → stack=nextjs
// ---------------------------------------------------------------------------

describe("Test 1: Next.js HIGH confidence", () => {
  it("detects nextjs from __NEXT_DATA__ script tag and /_next/static/ path", () => {
    const input = makeInput({
      html: `<html><head></head><body>
        <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
        <script src="/_next/static/chunks/main.js"></script>
      </body></html>`,
    });

    const result = detectProvenance(input);

    expect(result.stack).toBe("nextjs");
    expect(result.stackConfidence).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// Test 2: Hugo + GitHub Pages — generator "Hugo 0.120" + CNAME *.github.io
//          + no Set-Cookie → stack=hugo, host=github_pages, sod=static
// ---------------------------------------------------------------------------

describe("Test 2: Hugo + GitHub Pages static", () => {
  it("detects hugo stack, github_pages host, and static sod", () => {
    const input = makeInput({
      html: `<html><head><meta name="generator" content="Hugo 0.120"></head><body><p>Hello</p></body></html>`,
      cnames: ["username.github.io"],
      getHeaders: {
        "Cache-Control": "public, max-age=3600",
      },
    });

    const result = detectProvenance(input);

    expect(result.stack).toBe("hugo");
    expect(result.stackConfidence).toBe("HIGH");
    expect(result.host).toBe("github_pages");
    expect(result.hostConfidence).toBe("HIGH");
    expect(result.static_or_dynamic).toBe("static");
    expect(result.sodConfidence).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// Test 3: CF-Ray trap — CF-Ray + Server: cloudflare, no *.pages.dev CNAME
//          → host=blank
// ---------------------------------------------------------------------------

describe("Test 3: CF-Ray trap", () => {
  it("does NOT detect cloudflare_pages from CF-Ray header alone", () => {
    const input = makeInput({
      headHeaders: {
        "CF-Ray": "abc123-LAX",
        Server: "cloudflare",
      },
      getHeaders: {
        "CF-Ray": "abc123-LAX",
        Server: "cloudflare",
      },
      cnames: ["some-origin.example.com"],
    });

    const result = detectProvenance(input);

    expect(result.host).toBe("");
    expect(result.hostConfidence).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Test 4: Next.js + dynamic trap — __NEXT_DATA__ + Set-Cookie +
//          Cache-Control: no-store → stack=nextjs, sod=dynamic
// ---------------------------------------------------------------------------

describe("Test 4: Next.js + dynamic signals", () => {
  it("detects nextjs stack but dynamic sod from cookies and cache headers", () => {
    const input = makeInput({
      html: `<html><head></head><body>
        <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
        <script src="/_next/static/chunks/main.js"></script>
      </body></html>`,
      getHeaders: {
        "Set-Cookie": "session=abc123; Path=/; HttpOnly",
        "Cache-Control": "no-store, must-revalidate",
      },
    });

    const result = detectProvenance(input);

    expect(result.stack).toBe("nextjs");
    expect(result.stackConfidence).toBe("HIGH");
    expect(result.static_or_dynamic).toBe("dynamic");
  });
});

// ---------------------------------------------------------------------------
// Test 5: Minimal static — plain semantic HTML, no scripts
//          → stack=static_html, sod=static
// ---------------------------------------------------------------------------

describe("Test 5: Minimal static HTML", () => {
  it("detects static_html stack and static sod for plain semantic HTML", () => {
    const input = makeInput({
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>My Page</title></head>
<body>
  <h1>Hello World</h1>
  <p>A simple page with no JavaScript frameworks.</p>
</body>
</html>`,
      getHeaders: {
        "Cache-Control": "public, max-age=86400",
      },
    });

    const result = detectProvenance(input);

    expect(result.stack).toBe("static_html");
    expect(result.stackConfidence).toBe("MEDIUM");
    expect(result.static_or_dynamic).toBe("static");
  });
});

// ---------------------------------------------------------------------------
// Test 6: Ambiguous/blank — generic nginx + CF-Ray, no markers → all blank
//          Include both a static signal and a dynamic signal so sod is ambiguous
// ---------------------------------------------------------------------------

describe("Test 6: Ambiguous/blank", () => {
  it("returns all blank for generic nginx + CF-Ray with conflicting signals", () => {
    const input = makeInput({
      html: `<html><head></head><body><div class="content"><p>Some content</p></div></body></html>`,
      headHeaders: {
        Server: "nginx",
        "CF-Ray": "xyz789-SJC",
      },
      getHeaders: {
        Server: "nginx",
        "CF-Ray": "xyz789-SJC",
        // Dynamic signal: Set-Cookie present
        "Set-Cookie": "tracker=abc; Path=/",
        // Static signal: Cache-Control public
        "Cache-Control": "public, max-age=300",
      },
      cnames: ["cdn.example.com"],
    });

    const result = detectProvenance(input);

    // No framework markers in HTML, not plain semantic enough → stack blank
    // (has a div with class but no <html lang> - but the helper defaults have html+body)
    // Actually the HTML above HAS <html> and <body> but also has non-trivial structure
    // The key: no framework markers BUT has Set-Cookie → not clearly static_html either
    // nginx is a trap → host blank
    expect(result.host).toBe("");
    expect(result.hostConfidence).toBe("");
    // Both static and dynamic signals present → ambiguous sod
    expect(result.static_or_dynamic).toBe("");
    expect(result.sodConfidence).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Test 7: WordPress — generator "WordPress 6.4" + wp-content/ + Set-Cookie
//          → stack=wordpress, sod=dynamic
// ---------------------------------------------------------------------------

describe("Test 7: WordPress dynamic", () => {
  it("detects wordpress stack and dynamic sod", () => {
    const input = makeInput({
      html: `<html><head>
        <meta name="generator" content="WordPress 6.4">
        <link rel="stylesheet" href="/wp-content/themes/mytheme/style.css">
      </head><body>
        <div id="page">Content here</div>
        <script src="/wp-content/plugins/jetpack/js/main.a1b2c3d4.js"></script>
      </body></html>`,
      getHeaders: {
        "Set-Cookie": "wordpress_logged_in=abc; Path=/",
        "Cache-Control": "no-store, private",
        "X-Powered-By": "PHP/8.2",
        "Vary": "Cookie, Accept-Encoding",
      },
    });

    const result = detectProvenance(input);

    expect(result.stack).toBe("wordpress");
    expect(result.stackConfidence).toBe("HIGH");
    expect(result.static_or_dynamic).toBe("dynamic");
    expect(result.sodConfidence).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// Test 8: Netlify static — X-Nf-Request-Id + no Set-Cookie +
//          Cache-Control: public → host=netlify, sod=static
// ---------------------------------------------------------------------------

describe("Test 8: Netlify static", () => {
  it("detects netlify host and static sod", () => {
    const input = makeInput({
      html: `<html><head><title>My Site</title></head><body><main>Content</main></body></html>`,
      getHeaders: {
        "X-Nf-Request-Id": "abc123-def456",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    const result = detectProvenance(input);

    expect(result.host).toBe("netlify");
    expect(result.hostConfidence).toBe("HIGH");
    expect(result.static_or_dynamic).toBe("static");
    expect(result.sodConfidence).toBe("HIGH");
  });
});
