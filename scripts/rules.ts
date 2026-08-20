/**
 * Provenance Detection Rules — pure functions, no I/O.
 *
 * Accepts HTTP response headers, HTML body, and DNS CNAMEs for a site,
 * returns inferred stack, host, and static_or_dynamic values with
 * confidence levels and human-readable evidence.
 */

// ---------------------------------------------------------------------------
// Type Interfaces
// ---------------------------------------------------------------------------

export interface SignalInput {
  headHeaders: Record<string, string>;
  getHeaders: Record<string, string>;
  html: string;
  cnames: string[];
  statusCode: number;
}

export interface RuleResult {
  stack: string;
  stackConfidence: "HIGH" | "MEDIUM" | "";
  host: string;
  hostConfidence: "HIGH" | "MEDIUM" | "";
  static_or_dynamic: string;
  sodConfidence: "HIGH" | "MEDIUM" | "";
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive header lookup. Returns the value or empty string.
 */
function getHeader(headers: Record<string, string>, name: string): string {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return "";
}

/**
 * Check if any header key starts with a given prefix (case-insensitive).
 */
function hasHeaderPrefix(headers: Record<string, string>, prefix: string): boolean {
  const lower = prefix.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase().startsWith(lower));
}

/**
 * Check if any CNAME matches a pattern (case-insensitive substring or glob-like).
 * Pattern examples: "vercel-dns.com", "*.vercel.app", "*.github.io"
 */
function cnameMatches(cnames: string[], pattern: string): boolean {
  const lower = pattern.toLowerCase();
  if (lower.startsWith("*.")) {
    const suffix = lower.slice(1); // e.g. ".vercel.app"
    return cnames.some((c) => c.toLowerCase().endsWith(suffix));
  }
  return cnames.some((c) => c.toLowerCase().includes(lower));
}

/**
 * Extract the content attribute value from <meta name="generator" content="...">
 * Returns the content value or empty string if not found.
 */
function getGeneratorMeta(html: string): string {
  // Match <meta name="generator" content="..."> with flexible attribute order and quoting
  const regex = /<meta\s+[^>]*name\s*=\s*["']generator["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*\/?>/i;
  const match = html.match(regex);
  if (match) return match[1];

  // Also try reversed attribute order: content before name
  const regex2 = /<meta\s+[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']generator["'][^>]*\/?>/i;
  const match2 = html.match(regex2);
  if (match2) return match2[1];

  return "";
}

/**
 * Estimate total script bundle size referenced in HTML.
 * Looks for <script src="..."> tags with path hints of large bundles.
 * Returns a rough heuristic: count of "large-looking" script references.
 */
function estimateScriptBundleSize(html: string): number {
  // Count script src references that look like framework bundles
  const scriptSrcs = html.match(/<script[^>]+src\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
  // If there are chunked bundles (e.g. /static/js/main.abc123.js), count them
  let largeCount = 0;
  for (const tag of scriptSrcs) {
    // Heuristic: paths with hash-like segments suggest bundled/chunked JS
    if (/\.[a-f0-9]{6,}\.(js|mjs)/i.test(tag) || /chunk/i.test(tag) || /bundle/i.test(tag)) {
      largeCount++;
    }
  }
  return largeCount;
}

/**
 * Check if HTML is plain/semantic — no framework markers, no large script bundles.
 */
function isPlainSemanticHTML(html: string): boolean {
  // Must have basic structure
  if (!/<html/i.test(html) || !/<body/i.test(html)) return false;

  // No framework markers at all
  if (/id\s*=\s*["']root["']/i.test(html)) return false;
  if (/id\s*=\s*["']app["']/i.test(html)) return false;
  if (/id\s*=\s*["']__next["']/i.test(html)) return false;
  if (/id\s*=\s*["']___gatsby["']/i.test(html)) return false;
  if (/data-sveltekit-/i.test(html)) return false;
  if (/data-v-[a-f0-9]/i.test(html)) return false;
  if (/window\.__NUXT__/i.test(html)) return false;
  if (/window\.__remixContext/i.test(html)) return false;
  if (/window\.__VUE__/i.test(html)) return false;

  // No large script bundles (more than 2 chunked scripts suggests a framework)
  const bundleCount = estimateScriptBundleSize(html);
  if (bundleCount > 2) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Stack Detection
// ---------------------------------------------------------------------------

interface StackResult {
  stack: string;
  confidence: "HIGH" | "MEDIUM" | "";
  evidence: string[];
}

function detectStack(input: SignalInput): StackResult {
  const { html } = input;
  const evidence: string[] = [];
  const generator = getGeneratorMeta(html);

  // --- HIGH Confidence Rules (priority 1–11) ---

  // 1. Next.js
  if (/<script[^>]+id\s*=\s*["']__NEXT_DATA__["']/i.test(html) || /\/_next\/static\//i.test(html)) {
    if (/<script[^>]+id\s*=\s*["']__NEXT_DATA__["']/i.test(html)) {
      evidence.push("__NEXT_DATA__ script tag found");
    }
    if (/\/_next\/static\//i.test(html)) {
      evidence.push("/_next/static/ path found");
    }
    return { stack: "nextjs", confidence: "HIGH", evidence };
  }

  // 2. Hugo
  if (generator && /^hugo/i.test(generator)) {
    evidence.push(`generator meta "${generator}"`);
    return { stack: "hugo", confidence: "HIGH", evidence };
  }

  // 3. Jekyll
  if (generator && /^jekyll/i.test(generator)) {
    evidence.push(`generator meta "${generator}"`);
    return { stack: "jekyll", confidence: "HIGH", evidence };
  }

  // 4. WordPress (generator + corroborating signal)
  if (generator && /wordpress/i.test(generator) && (/wp-content\//i.test(html) || /wp-json/i.test(html))) {
    evidence.push(`generator meta "${generator}"`);
    if (/wp-content\//i.test(html)) evidence.push("wp-content/ path found");
    if (/wp-json/i.test(html)) evidence.push("wp-json path found");
    return { stack: "wordpress", confidence: "HIGH", evidence };
  }

  // 5. Astro
  if ((generator && /^astro/i.test(generator)) || /\/_astro\//i.test(html)) {
    if (generator && /^astro/i.test(generator)) evidence.push(`generator meta "${generator}"`);
    if (/\/_astro\//i.test(html)) evidence.push("/_astro/ path found");
    return { stack: "astro", confidence: "HIGH", evidence };
  }

  // 6. Nuxt
  if (/window\.__NUXT__/i.test(html) || /\/_nuxt\//i.test(html)) {
    if (/window\.__NUXT__/i.test(html)) evidence.push("window.__NUXT__ found");
    if (/\/_nuxt\//i.test(html)) evidence.push("/_nuxt/ path found");
    return { stack: "nuxt", confidence: "HIGH", evidence };
  }

  // 7. Gatsby
  if (/id\s*=\s*["']___gatsby["']/i.test(html) || /\/page-data\//i.test(html)) {
    if (/id\s*=\s*["']___gatsby["']/i.test(html)) evidence.push('id="___gatsby" found');
    if (/\/page-data\//i.test(html)) evidence.push("/page-data/ path found");
    return { stack: "gatsby", confidence: "HIGH", evidence };
  }

  // 8. SvelteKit
  if (/data-sveltekit-/i.test(html) || /\/_app\/immutable\//i.test(html)) {
    if (/data-sveltekit-/i.test(html)) evidence.push("data-sveltekit- attribute found");
    if (/\/_app\/immutable\//i.test(html)) evidence.push("/_app/immutable/ path found");
    return { stack: "sveltekit", confidence: "HIGH", evidence };
  }

  // 9. Remix
  if (/window\.__remixContext/i.test(html)) {
    evidence.push("window.__remixContext found");
    return { stack: "remix", confidence: "HIGH", evidence };
  }

  // 10. Docusaurus
  if (generator && /^docusaurus/i.test(generator)) {
    evidence.push(`generator meta "${generator}"`);
    return { stack: "docusaurus", confidence: "HIGH", evidence };
  }

  // 11. Ghost
  if (generator && /^ghost/i.test(generator)) {
    evidence.push(`generator meta "${generator}"`);
    return { stack: "ghost", confidence: "HIGH", evidence };
  }

  // --- MEDIUM Confidence Rules (priority 12–15) ---

  // 12. React SPA — id="root" + /static/js/ (guard: no HIGH match already applied above)
  if (/id\s*=\s*["']root["']/i.test(html) && /\/static\/js\//i.test(html)) {
    evidence.push('id="root" found');
    evidence.push("/static/js/ path found");
    return { stack: "react_spa", confidence: "MEDIUM", evidence };
  }

  // 13. Vue SPA — data-v- attribute OR window.__VUE__ (guard: no Nuxt markers)
  if ((/ data-v-[a-f0-9]/i.test(html) || /window\.__VUE__/i.test(html))) {
    // Guard: not Nuxt (already handled above, but be explicit)
    if (!/window\.__NUXT__/i.test(html) && !/\/_nuxt\//i.test(html)) {
      if (/ data-v-[a-f0-9]/i.test(html)) evidence.push("data-v- scoped style attribute found");
      if (/window\.__VUE__/i.test(html)) evidence.push("window.__VUE__ found");
      return { stack: "vue_spa", confidence: "MEDIUM", evidence };
    }
  }

  // 14. Svelte SPA — svelte- class hash pattern (guard: no SvelteKit markers)
  if (/class\s*=\s*["'][^"']*svelte-[a-z0-9]/i.test(html)) {
    // Guard: not SvelteKit (already handled above)
    if (!/data-sveltekit-/i.test(html) && !/\/_app\/immutable\//i.test(html)) {
      evidence.push("svelte- class hash pattern found");
      return { stack: "svelte_spa", confidence: "MEDIUM", evidence };
    }
  }

  // 15. Static HTML — plain semantic HTML with no framework markers, no large bundles
  if (!generator && isPlainSemanticHTML(html)) {
    evidence.push("plain semantic HTML with no framework markers");
    evidence.push("no large script bundles detected");
    return { stack: "static_html", confidence: "MEDIUM", evidence };
  }

  // No rule matched → blank
  return { stack: "", confidence: "", evidence };
}

// ---------------------------------------------------------------------------
// Host Detection
// ---------------------------------------------------------------------------

interface HostResult {
  host: string;
  confidence: "HIGH" | "MEDIUM" | "";
  evidence: string[];
}

function detectHost(input: SignalInput): HostResult {
  const headers = { ...input.headHeaders, ...input.getHeaders };
  const { cnames } = input;
  const evidence: string[] = [];

  // --- HIGH Confidence Rules (priority 1–12) ---

  // 1. Vercel
  if (getHeader(headers, "x-vercel-id")) {
    evidence.push("X-Vercel-Id header present");
    return { host: "vercel", confidence: "HIGH", evidence };
  }
  if (cnameMatches(cnames, "vercel-dns.com") || cnameMatches(cnames, "*.vercel.app")) {
    evidence.push("CNAME to Vercel");
    return { host: "vercel", confidence: "HIGH", evidence };
  }

  // 2. Netlify
  if (getHeader(headers, "x-nf-request-id")) {
    evidence.push("X-Nf-Request-Id header present");
    return { host: "netlify", confidence: "HIGH", evidence };
  }
  if (cnameMatches(cnames, "*.netlify.app")) {
    evidence.push("CNAME to *.netlify.app");
    return { host: "netlify", confidence: "HIGH", evidence };
  }

  // 3. GitHub Pages
  if (getHeader(headers, "x-github-request-id") && getHeader(headers, "server").toLowerCase() === "github.com") {
    evidence.push("X-GitHub-Request-Id header + Server: GitHub.com");
    return { host: "github_pages", confidence: "HIGH", evidence };
  }
  if (cnameMatches(cnames, "*.github.io")) {
    evidence.push("CNAME to *.github.io");
    return { host: "github_pages", confidence: "HIGH", evidence };
  }

  // 4. Cloudflare Pages (ONLY via CNAME — CF-Ray alone is NOT sufficient)
  if (cnameMatches(cnames, "*.pages.dev")) {
    evidence.push("CNAME to *.pages.dev");
    return { host: "cloudflare_pages", confidence: "HIGH", evidence };
  }

  // 5. Fly.io
  if (getHeader(headers, "fly-request-id")) {
    evidence.push("Fly-Request-Id header present");
    return { host: "fly", confidence: "HIGH", evidence };
  }

  // 6. Render
  if (hasHeaderPrefix(headers, "x-render-")) {
    evidence.push("x-render-* header present");
    return { host: "render", confidence: "HIGH", evidence };
  }
  if (cnameMatches(cnames, "*.onrender.com")) {
    evidence.push("CNAME to *.onrender.com");
    return { host: "render", confidence: "HIGH", evidence };
  }

  // 7. AWS S3
  if (getHeader(headers, "server").toLowerCase() === "amazons3" && hasHeaderPrefix(headers, "x-amz-")) {
    evidence.push("Server: AmazonS3 + x-amz-* header");
    return { host: "aws_s3", confidence: "HIGH", evidence };
  }

  // 8. AWS Amplify
  if (cnameMatches(cnames, "*.amplifyapp.com")) {
    evidence.push("CNAME to *.amplifyapp.com");
    return { host: "aws_amplify", confidence: "HIGH", evidence };
  }

  // 9. Neocities
  if (cnameMatches(cnames, "*.neocities.org")) {
    evidence.push("CNAME to *.neocities.org");
    return { host: "neocities", confidence: "HIGH", evidence };
  }

  // 10. Surge
  if (cnameMatches(cnames, "*.surge.sh")) {
    evidence.push("CNAME to *.surge.sh");
    return { host: "surge", confidence: "HIGH", evidence };
  }

  // 11. Firebase
  if (cnameMatches(cnames, "*.web.app") || cnameMatches(cnames, "*.firebaseapp.com")) {
    if (cnameMatches(cnames, "*.web.app")) evidence.push("CNAME to *.web.app");
    if (cnameMatches(cnames, "*.firebaseapp.com")) evidence.push("CNAME to *.firebaseapp.com");
    return { host: "firebase", confidence: "HIGH", evidence };
  }

  // 12. Heroku
  const viaHeader = getHeader(headers, "via");
  if (viaHeader && /1\.1 vegur/i.test(viaHeader)) {
    evidence.push("Via: 1.1 vegur (Heroku router)");
    return { host: "heroku", confidence: "HIGH", evidence };
  }

  // --- TRAPS: these do NOT identify a host ---
  // CF-Ray / Server: cloudflare → proxy, not host
  // Server: nginx / Apache / Caddy → web server, not host
  // Fastly / Varnish X-Cache → CDN, not host

  // No rule matched → blank
  return { host: "", confidence: "", evidence };
}

// ---------------------------------------------------------------------------
// Static/Dynamic Detection
// ---------------------------------------------------------------------------

interface SodResult {
  static_or_dynamic: string;
  confidence: "HIGH" | "MEDIUM" | "";
  evidence: string[];
}

/** Known static hosting platforms */
const STATIC_HOSTS = new Set(["github_pages", "netlify", "cloudflare_pages", "neocities", "aws_s3"]);

/** Server-rendered frameworks that lean dynamic without CDN cache hit */
const SERVER_RENDERED_STACKS = new Set(["wordpress", "ghost"]);

function detectStaticOrDynamic(input: SignalInput, stack: string, host: string): SodResult {
  const headers = input.getHeaders;
  const evidence: string[] = [];
  let staticScore = 0;
  let dynamicScore = 0;

  // --- Static Signals ---

  // 1. No Set-Cookie on GET
  if (!getHeader(headers, "set-cookie")) {
    staticScore++;
    evidence.push("no Set-Cookie on GET");
  }

  // 2. Cache-Control contains "public" or "immutable"
  const cacheControl = getHeader(headers, "cache-control").toLowerCase();
  if (cacheControl.includes("public") || cacheControl.includes("immutable")) {
    staticScore++;
    evidence.push(`Cache-Control contains "${cacheControl.includes("public") ? "public" : "immutable"}"`);
  }

  // 3. CDN cache hit
  const vercelCache = getHeader(headers, "x-vercel-cache").toUpperCase();
  const cfCacheStatus = getHeader(headers, "cf-cache-status").toUpperCase();
  const xCache = getHeader(headers, "x-cache").toUpperCase();
  if (vercelCache === "HIT" || cfCacheStatus === "HIT" || xCache === "HIT") {
    staticScore++;
    const hitSource = vercelCache === "HIT" ? "X-Vercel-Cache" : cfCacheStatus === "HIT" ? "CF-Cache-Status" : "X-Cache";
    evidence.push(`${hitSource}: HIT`);
  }

  // 4. Host is a known static platform
  if (STATIC_HOSTS.has(host)) {
    staticScore++;
    evidence.push(`host "${host}" is a known static platform`);
  }

  // 5. No script bundles > 100KB referenced in HTML
  // Heuristic: if there are fewer than 3 chunked/bundled script references, assume no large bundles
  const bundleCount = estimateScriptBundleSize(input.html);
  if (bundleCount === 0) {
    staticScore++;
    evidence.push("no large script bundles referenced");
  }

  // --- Dynamic Signals ---

  // 1. Set-Cookie present
  if (getHeader(headers, "set-cookie")) {
    dynamicScore++;
    evidence.push("Set-Cookie present");
  }

  // 2. Cache-Control contains "no-store" or "private"
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
    dynamicScore++;
    evidence.push(`Cache-Control contains "${cacheControl.includes("no-store") ? "no-store" : "private"}"`);
  }

  // 3. X-Powered-By contains Express or PHP
  const poweredBy = getHeader(headers, "x-powered-by").toLowerCase();
  if (poweredBy.includes("express") || poweredBy.includes("php")) {
    dynamicScore++;
    evidence.push(`X-Powered-By: ${getHeader(headers, "x-powered-by")}`);
  }

  // 4. Vary contains Cookie
  const vary = getHeader(headers, "vary").toLowerCase();
  if (vary.includes("cookie")) {
    dynamicScore++;
    evidence.push("Vary header contains Cookie");
  }

  // 5. Server-rendered stack AND no CDN cache hit
  const hasCacheHit = vercelCache === "HIT" || cfCacheStatus === "HIT" || xCache === "HIT";
  if (SERVER_RENDERED_STACKS.has(stack) && !hasCacheHit) {
    dynamicScore++;
    evidence.push(`server-rendered stack "${stack}" with no CDN cache hit`);
  }

  // --- Decision Logic ---
  if (staticScore >= 2 && dynamicScore === 0) {
    return { static_or_dynamic: "static", confidence: "HIGH", evidence };
  }
  if (staticScore >= 1 && dynamicScore === 0) {
    return { static_or_dynamic: "static", confidence: "MEDIUM", evidence };
  }
  if (dynamicScore >= 2 && staticScore === 0) {
    return { static_or_dynamic: "dynamic", confidence: "HIGH", evidence };
  }
  if (dynamicScore >= 1 && staticScore === 0) {
    return { static_or_dynamic: "dynamic", confidence: "MEDIUM", evidence };
  }

  // Ambiguous → blank
  return { static_or_dynamic: "", confidence: "", evidence };
}

// ---------------------------------------------------------------------------
// Main Detection Entry Point
// ---------------------------------------------------------------------------

/**
 * Run all provenance detection rules against the given signals.
 * Returns the inferred stack, host, static_or_dynamic with confidence and evidence.
 * Pure function — no I/O, fully testable in isolation.
 */
export function detectProvenance(input: SignalInput): RuleResult {
  const stackResult = detectStack(input);
  const hostResult = detectHost(input);
  const sodResult = detectStaticOrDynamic(input, stackResult.stack, hostResult.host);

  // Merge evidence from all detectors
  const evidence = [
    ...stackResult.evidence,
    ...hostResult.evidence,
    ...sodResult.evidence,
  ];

  return {
    stack: stackResult.stack,
    stackConfidence: stackResult.confidence,
    host: hostResult.host,
    hostConfidence: hostResult.confidence,
    static_or_dynamic: sodResult.static_or_dynamic,
    sodConfidence: sodResult.confidence,
    evidence,
  };
}
