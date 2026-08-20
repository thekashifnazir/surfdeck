/**
 * Vibecoded Discovery Sampler
 *
 * Queries Certificate Transparency logs (crt.sh) for recent certs on
 * tier-mapped domains, applies liveness checks, deduplicates against
 * the existing CSV, and emits a human-review report.
 *
 * Usage:
 *   npx tsx scripts/discover-vibecoded.ts
 *
 * This script is an offline dev tool — it never ships in the deployed Worker.
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
const CACHE_DIR = resolve(PROJECT_ROOT, ".vibecoded-cache");
const REPORT_PATH = resolve(PROJECT_ROOT, "data", "vibecoded-candidates-report.md");

const USER_AGENT = "SurfdeckBot/0.1";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT = 2;
const DELAY_BETWEEN_MS = 500;

// ---------------------------------------------------------------------------
// Domain Pattern → built_with/tier Mapping
// ---------------------------------------------------------------------------

export interface DomainPattern {
  /** crt.sh wildcard query pattern, e.g. "%.lovable.app" */
  pattern: string;
  /** Suffix to match subdomains against (without leading dot) */
  suffix: string;
  /** built_with value, or null if tool is unknown from domain alone */
  built_with: string | null;
  /** Tier number (1–4) */
  tier: number;
}

export const DOMAIN_PATTERNS: DomainPattern[] = [
  // T2 — AI app-builders
  { pattern: "%.lovable.app", suffix: "lovable.app", built_with: "lovable", tier: 2 },
  { pattern: "%.bolt.host", suffix: "bolt.host", built_with: "bolt", tier: 2 },
  // T3 — AI-assisted + hosted (tool unknown from domain alone)
  { pattern: "%.vercel.app", suffix: "vercel.app", built_with: null, tier: 3 },
  { pattern: "%.netlify.app", suffix: "netlify.app", built_with: null, tier: 3 },
  // T4 — Developer cloud
  { pattern: "%.pages.dev", suffix: "pages.dev", built_with: "cloudflare_workers", tier: 4 },
  { pattern: "%.fly.dev", suffix: "fly.dev", built_with: "fly", tier: 4 },
];

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface Candidate {
  url: string;
  built_with: string | null;
  tier: number;
  live: boolean;
  evidence: string[];
}

interface CrtShEntry {
  common_name?: string;
  name_value?: string;
}

interface CachedLiveness {
  url: string;
  fetchedAt: string;
  statusCode: number;
  html: string;
  live: boolean;
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Parked Page Detection
// ---------------------------------------------------------------------------

const PARKED_SIGNATURES = [
  "this domain is parked",
  "buy this domain",
  "domain is for sale",
  "this site is under construction",
  "welcome to your new site",
  "congratulations! your site is live",
  "default web page",
  "index of /",
  "it works!",
  "coming soon",
  "parked free",
  "domain parking",
  "godaddy",
  "sedoparking",
  "hugedomains",
  "afternic",
  "dan.com",
];

/**
 * Detect if an HTML page is a parked/default page.
 * Returns true if parked signals are found.
 */
export function isParkedPage(html: string): boolean {
  if (!html || html.length === 0) return false;

  const lower = html.toLowerCase();

  // Very short pages with parking signatures
  for (const sig of PARKED_SIGNATURES) {
    if (lower.includes(sig)) return true;
  }

  return false;
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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Cache Operations
// ---------------------------------------------------------------------------

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

function loadFromCache(url: string): CachedLiveness | null {
  const path = cachePath(url);
  try {
    if (existsSync(path)) {
      const data = readFileSync(path, "utf-8");
      return JSON.parse(data) as CachedLiveness;
    }
  } catch {
    // Cache read failure → fetch fresh
  }
  return null;
}

function saveToCache(url: string, response: CachedLiveness): void {
  try {
    writeFileSync(cachePath(url), JSON.stringify(response, null, 2), "utf-8");
  } catch {
    // Non-critical — continue
  }
}

// ---------------------------------------------------------------------------
// crt.sh Query
// ---------------------------------------------------------------------------

interface RawCandidate {
  url: string;
  built_with: string | null;
  tier: number;
  suffix: string;
}

/**
 * Query crt.sh JSON API for a single domain pattern.
 * Returns unique subdomains as candidate URLs.
 */
async function queryCrtShForPattern(dp: DomainPattern): Promise<RawCandidate[]> {
  const apiUrl = `https://crt.sh/?q=${encodeURIComponent(dp.pattern)}&output=json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`  crt.sh returned ${response.status} for ${dp.pattern} — skipping`);
      return [];
    }

    const entries: CrtShEntry[] = await response.json() as CrtShEntry[];
    const uniqueHosts = extractUniqueSubdomains(entries, dp.suffix);

    return uniqueHosts.map((host) => ({
      url: `https://${host}/`,
      built_with: dp.built_with,
      tier: dp.tier,
      suffix: dp.suffix,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  crt.sh query failed for ${dp.pattern}: ${msg}`);
    return [];
  }
}

/**
 * Extract unique valid subdomains from crt.sh entries.
 * Filters out wildcards, bare domains, and multi-level TLD patterns.
 */
export function extractUniqueSubdomains(entries: CrtShEntry[], suffix: string): string[] {
  const seen = new Set<string>();

  for (const entry of entries) {
    // crt.sh returns hostnames in both common_name and name_value
    const names = [entry.common_name, entry.name_value].filter(Boolean) as string[];

    for (const raw of names) {
      // name_value can contain multiple newline-separated hostnames
      const parts = raw.split("\n");
      for (const part of parts) {
        const hostname = part.trim().toLowerCase();

        // Skip wildcards, bare suffix, and empty
        if (!hostname) continue;
        if (hostname.startsWith("*")) continue;
        if (hostname === suffix) continue;

        // Must end with the expected suffix
        if (!hostname.endsWith(`.${suffix}`) && hostname !== suffix) continue;

        // Extract the subdomain part (before the suffix)
        const sub = hostname.slice(0, hostname.length - suffix.length - 1);

        // Skip if subdomain is empty or contains dots (multi-level, likely wildcard cert)
        if (!sub || sub.includes(".")) continue;

        // Skip overly short subdomains (likely placeholders)
        if (sub.length < 2) continue;

        seen.add(hostname);
      }
    }
  }

  return [...seen].sort();
}

// ---------------------------------------------------------------------------
// Liveness Check
// ---------------------------------------------------------------------------

async function checkSingleLiveness(url: string): Promise<CachedLiveness> {
  const evidence: string[] = [];
  let statusCode = 0;
  let html = "";
  let live = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    statusCode = response.status;

    if (statusCode >= 200 && statusCode < 300) {
      html = await response.text();
      // Truncate to 100KB for cache
      if (html.length > 100_000) {
        html = html.slice(0, 100_000);
      }

      if (isParkedPage(html)) {
        evidence.push("parking page detected");
        live = false;
      } else {
        evidence.push("renders content");
        live = true;
      }
    } else {
      evidence.push(`HTTP ${statusCode}`);
      live = false;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    evidence.push(`unreachable: ${msg}`);
    live = false;
  }

  return {
    url,
    fetchedAt: new Date().toISOString(),
    statusCode,
    html,
    live,
    evidence,
  };
}

// ---------------------------------------------------------------------------
// Rate-Limited Concurrent Liveness Checks
// ---------------------------------------------------------------------------

async function checkLivenessRateLimited(candidates: RawCandidate[]): Promise<Candidate[]> {
  const results: Candidate[] = [];
  let activeCount = 0;
  let index = 0;
  let lastInitTime = 0;

  return new Promise((resolveAll) => {
    const pending: Promise<void>[] = [];

    function tryNext(): void {
      while (activeCount < MAX_CONCURRENT && index < candidates.length) {
        const currentIndex = index++;
        const candidate = candidates[currentIndex];
        activeCount++;

        const now = Date.now();
        const timeSinceLast = now - lastInitTime;
        const waitTime = timeSinceLast < DELAY_BETWEEN_MS ? DELAY_BETWEEN_MS - timeSinceLast : 0;
        lastInitTime = now + waitTime;

        const task = (async () => {
          if (waitTime > 0) await delay(waitTime);

          // Check cache first
          const cached = loadFromCache(candidate.url);
          let liveness: CachedLiveness;

          if (cached) {
            liveness = cached;
            process.stdout.write(
              `  [${currentIndex + 1}/${candidates.length}] ${candidate.url} (cached)\n`
            );
          } else {
            process.stdout.write(
              `  [${currentIndex + 1}/${candidates.length}] ${candidate.url} (checking...)\n`
            );
            liveness = await checkSingleLiveness(candidate.url);
            saveToCache(candidate.url, liveness);
          }

          const domainEvidence = `*.${candidate.suffix} domain`;
          results[currentIndex] = {
            url: candidate.url,
            built_with: candidate.built_with,
            tier: candidate.tier,
            live: liveness.live,
            evidence: [domainEvidence, ...liveness.evidence],
          };

          activeCount--;
          tryNext();
        })();

        pending.push(task);
      }

      // Check if all done
      if (index >= candidates.length && activeCount === 0) {
        Promise.all(pending).then(() => resolveAll(results));
      }
    }

    tryNext();
  });
}

// ---------------------------------------------------------------------------
// CSV Deduplication
// ---------------------------------------------------------------------------

export function loadExistingUrls(csvPath: string): Set<string> {
  try {
    const csvText = readFileSync(csvPath, "utf-8");
    const rows = parseCSV(csvText);

    if (rows.length < 2) return new Set();

    const header = rows[0];
    const colIndex = buildColIndex(header);
    const urlIdx = colIndex.get("url");

    if (urlIdx === undefined) return new Set();

    const urls = new Set<string>();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 1 && row[0].trim() === "") continue;
      const url = urlIdx < row.length ? row[urlIdx].trim() : "";
      if (url) urls.add(url);
    }

    return urls;
  } catch {
    // If CSV can't be read, return empty set — never crash
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Report Sorting
// ---------------------------------------------------------------------------

/**
 * Sort candidates by tier ascending, then alphabetically by URL.
 */
export function sortCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.url.localeCompare(b.url);
  });
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function generateReport(
  allCandidates: Candidate[],
  totalFromCrt: number,
  novelCount: number
): string {
  const sorted = sortCandidates(allCandidates);
  const liveCount = sorted.filter((c) => c.live).length;
  const now = new Date().toISOString();

  let report = `# Vibecoded Candidates Report\n\n`;
  report += `Generated: ${now}\n`;
  report += `Candidates found: ${totalFromCrt} | Live: ${liveCount} | Novel (not in CSV): ${novelCount}\n\n`;
  report += `| url | built_with | tier | live? | evidence |\n`;
  report += `|-----|-----------|------|-------|----------|\n`;

  for (const c of sorted) {
    const builtWith = c.built_with ?? "null";
    const liveStr = c.live ? "yes" : "no";
    const evidenceStr = c.evidence.join("; ");
    report += `| ${c.url} | ${builtWith} | ${c.tier} | ${liveStr} | ${evidenceStr} |\n`;
  }

  return report;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Surfdeck Vibecoded Discovery Sampler");
  console.log("=====================================\n");

  ensureCacheDir();

  // 1. Load existing CSV URLs for deduplication
  console.log("Loading existing CSV URLs for deduplication...");
  const existingUrls = loadExistingUrls(CSV_PATH);
  console.log(`  ${existingUrls.size} URLs already in corpus.\n`);

  // 2. Query crt.sh for each domain pattern
  console.log("Querying crt.sh for certificate transparency logs...");
  const allRawCandidates: RawCandidate[] = [];

  for (const dp of DOMAIN_PATTERNS) {
    console.log(`  Querying: ${dp.pattern}`);
    const candidates = await queryCrtShForPattern(dp);
    console.log(`    Found ${candidates.length} unique subdomains`);
    allRawCandidates.push(...candidates);

    // Be polite to crt.sh — delay between pattern queries
    await delay(1000);
  }

  const totalFromCrt = allRawCandidates.length;
  console.log(`\nTotal candidates from crt.sh: ${totalFromCrt}`);

  // 3. Deduplicate against existing CSV
  const novel = allRawCandidates.filter((c) => !existingUrls.has(c.url));
  console.log(`Novel (not in CSV): ${novel.length}\n`);

  if (novel.length === 0) {
    console.log("No novel candidates found. Writing empty report.");
    const report = generateReport([], totalFromCrt, 0);
    writeFileSync(REPORT_PATH, report, "utf-8");
    console.log(`\nReport written to: ${REPORT_PATH}`);
    return;
  }

  // 4. Liveness check (rate-limited, cached)
  console.log(
    `Checking liveness (max ${MAX_CONCURRENT} concurrent, ${DELAY_BETWEEN_MS}ms delay)...\n`
  );
  const verified = await checkLivenessRateLimited(novel);

  // 5. Generate and write report
  const report = generateReport(verified, totalFromCrt, novel.length);
  writeFileSync(REPORT_PATH, report, "utf-8");

  // Print summary
  const liveCount = verified.filter((c) => c.live).length;
  const deadCount = verified.length - liveCount;

  console.log(`\n=====================================`);
  console.log(`Done!`);
  console.log(`Total from crt.sh: ${totalFromCrt}`);
  console.log(`Novel (not in CSV): ${novel.length}`);
  console.log(`Live: ${liveCount}`);
  console.log(`Not live (parked/dead): ${deadCount}`);
  console.log(`\nReport written to: data/vibecoded-candidates-report.md`);
}

// Only run when executed directly (not when imported for testing)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("discover-vibecoded.ts") ||
    process.argv[1].endsWith("discover-vibecoded.js"));

if (isMain) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
