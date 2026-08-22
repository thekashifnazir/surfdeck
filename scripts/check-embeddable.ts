/**
 * Embeddable Check Script
 *
 * HTTP-GETs each site in data/featured-sites.csv and inspects framing headers
 * (X-Frame-Options and Content-Security-Policy: frame-ancestors) to precompute
 * whether each site can be embedded in an iframe.
 *
 * Why GET rather than HEAD: measured on 30 corpus sites, some sites (e.g.
 * neal.fun) return a 403 block page to HEAD requests whose headers do NOT
 * reflect the real page — the HEAD block page even carried a misleading
 * X-Frame-Options. A GET (following redirects, with a desktop-browser
 * User-Agent) returns the real response headers. The body is read and
 * discarded — never downloaded/persisted — so we pay only header cost while
 * still triggering the real (non-HEAD) response.
 *
 * Network errors and timeouts default to embeddable = FALSE (pessimistic): a
 * false negative costs only a harmless new-tab fallback, whereas a false
 * positive shows a blank telly.
 *
 * Results are cached per-URL in .embeddable-cache/<sha256-of-url>.json so re-runs
 * only check new/changed URLs. Pass --force to re-check every URL.
 *
 * Usage:
 *   npx tsx scripts/check-embeddable.ts          # check uncached URLs
 *   npx tsx scripts/check-embeddable.ts --force  # re-check all URLs
 *
 * This script is a dev tool — it never ships in the deployed Worker.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseCSV, buildColIndex } from "./seed-logic.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const CSV_PATH = resolve(PROJECT_ROOT, "data", "featured-sites.csv");
const CACHE_DIR = resolve(PROJECT_ROOT, ".embeddable-cache");

// A desktop-browser User-Agent: some sites tailor responses (or block bots)
// based on the UA, so we present as a mainstream browser to see the headers a
// real visitor's iframe would receive.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT = 5;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface EmbeddableResult {
  url: string;
  embeddable: boolean;
  checked_at: string;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function cachePath(url: string): string {
  return resolve(CACHE_DIR, `${sha256(url)}.json`);
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

function loadFromCache(url: string): EmbeddableResult | null {
  const path = cachePath(url);
  try {
    if (existsSync(path)) {
      const data = readFileSync(path, "utf-8");
      return JSON.parse(data) as EmbeddableResult;
    }
  } catch {
    // Cache read failure → ignore, re-check
  }
  return null;
}

function saveToCache(result: EmbeddableResult): void {
  try {
    writeFileSync(cachePath(result.url), JSON.stringify(result, null, 2), "utf-8");
  } catch {
    // Non-critical — continue
  }
}

// ---------------------------------------------------------------------------
// Header Inspection
// ---------------------------------------------------------------------------

/**
 * Determines whether framing headers permit embedding.
 *
 * X-Frame-Options DENY/SAMEORIGIN → not embeddable.
 * CSP frame-ancestors, when present and restrictive (not `*` and not including
 * our origin), → not embeddable.
 */
export function isEmbeddableFromHeaders(headers: Headers): boolean {
  // X-Frame-Options
  const xfo = headers.get("x-frame-options");
  if (xfo) {
    const value = xfo.trim().toLowerCase();
    if (value === "deny" || value === "sameorigin") {
      return false;
    }
  }

  // Content-Security-Policy: frame-ancestors
  const csp = headers.get("content-security-policy");
  if (csp) {
    const frameAncestors = parseFrameAncestors(csp);
    if (frameAncestors !== null) {
      // Directive present. Embeddable only if it allows any origin (`*`).
      // Anything else is restrictive: without a same-origin deployment target
      // we cannot be in the allowlist, so treat as not embeddable.
      const allowsAny = frameAncestors.some((src) => src === "*");
      if (!allowsAny) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Extracts the source list of the `frame-ancestors` directive from a CSP header.
 * Returns null when the directive is absent.
 */
function parseFrameAncestors(csp: string): string[] | null {
  const directives = csp.split(";");
  for (const directive of directives) {
    const trimmed = directive.trim();
    const spaceIdx = trimmed.search(/\s/);
    const name = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
    if (name === "frame-ancestors") {
      const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
      if (rest === "") return [];
      return rest.split(/\s+/);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTTP Check
// ---------------------------------------------------------------------------

/**
 * A relative URL (starting with "/", e.g. the /ouroboros self-referential row)
 * points at our own origin. It has no external headers to check and fetch
 * cannot resolve it here, so it is same-origin embeddable by definition.
 */
export function isRelativeUrl(url: string): boolean {
  return url.startsWith("/");
}

/**
 * HTTP-GETs a URL and derives its embeddable flag from the response headers.
 *
 * A GET (following redirects, desktop-browser User-Agent) is used instead of
 * HEAD because some sites return a misleading block page to HEAD requests. The
 * response body is read and discarded — never downloaded/persisted — so we
 * trigger the real response while only inspecting headers.
 *
 * Relative URLs are same-origin by definition (embeddable = true) — they have
 * no external headers to inspect and fetch cannot resolve them here.
 *
 * Network errors and timeouts are pessimistic (embeddable = false): a false
 * negative costs only a harmless new-tab fallback, whereas a false positive
 * shows a blank telly.
 */
async function checkUrl(url: string): Promise<boolean> {
  // Relative (same-origin) URLs cannot be header-checked; treat as embeddable.
  if (isRelativeUrl(url)) return true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
        redirect: "follow",
      });
      const embeddable = isEmbeddableFromHeaders(response.headers);
      // Drain and discard the body without buffering it into memory so the
      // connection is released cleanly; we only care about the headers.
      try {
        await response.body?.cancel();
      } catch {
        // Ignore — the response was still delivered; headers are what matter.
      }
      return embeddable;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Network error or timeout → pessimistic (not embeddable)
    return false;
  }
}

// ---------------------------------------------------------------------------
// Concurrent Execution (limited to MAX_CONCURRENT)
// ---------------------------------------------------------------------------

async function processUrls(urls: string[], force: boolean): Promise<EmbeddableResult[]> {
  const results: EmbeddableResult[] = new Array(urls.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < urls.length) {
      const currentIndex = index++;
      const url = urls[currentIndex];

      if (!force) {
        const cached = loadFromCache(url);
        if (cached) {
          results[currentIndex] = cached;
          process.stdout.write(`  [${currentIndex + 1}/${urls.length}] ${url} (cached)\n`);
          continue;
        }
      }

      process.stdout.write(`  [${currentIndex + 1}/${urls.length}] ${url} (checking...)\n`);
      const embeddable = await checkUrl(url);
      const result: EmbeddableResult = {
        url,
        embeddable,
        checked_at: new Date().toISOString(),
      };
      saveToCache(result);
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT, urls.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ---------------------------------------------------------------------------
// CSV Reading
// ---------------------------------------------------------------------------

function readUrlsFromCSV(csvPath: string): string[] {
  const csvText = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const header = rows[0];
  const colIndex = buildColIndex(header);
  const urlIdx = colIndex.get("url");

  if (urlIdx === undefined) {
    throw new Error("CSV missing 'url' column");
  }

  const urls: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty rows (trailing newline can produce an empty last row)
    if (row.length === 1 && row[0].trim() === "") continue;

    const url = urlIdx < row.length ? row[urlIdx].trim() : "";
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  console.log("Surfdeck Embeddable Checker");
  console.log("===========================\n");

  ensureCacheDir();

  const urls = readUrlsFromCSV(CSV_PATH);
  console.log(`Found ${urls.length} URLs in CSV.\n`);

  if (urls.length === 0) {
    console.log("No URLs to process. Exiting.");
    return;
  }

  console.log(
    `Processing with max ${MAX_CONCURRENT} concurrent${force ? " (--force: re-checking all)" : ""}...\n`
  );
  const results = await processUrls(urls, force);

  const embeddableCount = results.filter((r) => r.embeddable).length;

  console.log(`\n===========================`);
  console.log(`Done!`);
  console.log(`${embeddableCount} of ${results.length} sites are embeddable`);
}

// Only run when executed directly (e.g. `npx tsx scripts/check-embeddable.ts`),
// not when imported by a test — importing must not trigger network I/O.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
