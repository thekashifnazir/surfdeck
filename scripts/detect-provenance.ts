/**
 * Provenance Detection Script
 *
 * Fetches each site in data/featured-sites.csv, applies detection rules,
 * and emits data/provenance-report.md with confidence-sorted findings.
 *
 * Usage:
 *   npx tsx scripts/detect-provenance.ts
 *
 * This script is a dev tool — it never ships in the deployed Worker.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import * as dns from "node:dns/promises";
import robotsParser from "robots-parser";
import { parseCSV, buildColIndex } from "./seed-logic.js";
import { detectProvenance } from "./rules.js";
import type { SignalInput, RuleResult } from "./rules.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const CSV_PATH = resolve(PROJECT_ROOT, "data", "featured-sites.csv");
const CACHE_DIR = resolve(PROJECT_ROOT, ".provenance-cache");
const ROBOTS_CACHE_DIR = resolve(CACHE_DIR, "robots");
const REPORT_PATH = resolve(PROJECT_ROOT, "data", "provenance-report.md");

const USER_AGENT = "SurfdeckBot/0.1";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT = 2;
const DELAY_BETWEEN_MS = 500;
const MAX_HTML_BYTES = 500 * 1024; // 500KB

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface CachedResponse {
  url: string;
  fetchedAt: string;
  headHeaders: Record<string, string>;
  getHeaders: Record<string, string>;
  html: string;
  statusCode: number;
  cnames: string[];
}

interface DetectionResult {
  url: string;
  stack: string;
  host: string;
  static_or_dynamic: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "";
  evidence: string[];
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

function robotsCachePath(domain: string): string {
  return resolve(ROBOTS_CACHE_DIR, `${domain}.txt`);
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function getOrigin(url: string): { origin: string; hostname: string; pathname: string } {
  const parsed = new URL(url);
  return {
    origin: parsed.origin,
    hostname: parsed.hostname,
    pathname: parsed.pathname,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Cache Operations
// ---------------------------------------------------------------------------

function ensureCacheDirs(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  if (!existsSync(ROBOTS_CACHE_DIR)) mkdirSync(ROBOTS_CACHE_DIR, { recursive: true });
}

function loadFromCache(url: string): CachedResponse | null {
  const path = cachePath(url);
  try {
    if (existsSync(path)) {
      const data = readFileSync(path, "utf-8");
      return JSON.parse(data) as CachedResponse;
    }
  } catch {
    // Cache read failure → ignore, fetch fresh
  }
  return null;
}

function saveToCache(url: string, response: CachedResponse): void {
  try {
    writeFileSync(cachePath(url), JSON.stringify(response, null, 2), "utf-8");
  } catch {
    // Non-critical — continue
  }
}

// ---------------------------------------------------------------------------
// Robots.txt Handling
// ---------------------------------------------------------------------------

/** Per-domain robots.txt cache (in-memory for the run + on-disk) */
const robotsCache = new Map<string, string | null>();

async function fetchRobotsTxt(domain: string, origin: string): Promise<string | null> {
  // Check in-memory cache first
  if (robotsCache.has(domain)) {
    return robotsCache.get(domain) ?? null;
  }

  // Check disk cache
  const diskPath = robotsCachePath(domain);
  if (existsSync(diskPath)) {
    try {
      const content = readFileSync(diskPath, "utf-8");
      robotsCache.set(domain, content);
      return content;
    } catch {
      // Ignore read failure
    }
  }

  // Fetch from network
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(`${origin}/robots.txt`, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      robotsCache.set(domain, text);
      // Save to disk cache
      try {
        writeFileSync(diskPath, text, "utf-8");
      } catch {
        // Non-critical
      }
      return text;
    }
  } catch {
    // robots.txt fetch failed — treat as no restrictions
  }

  robotsCache.set(domain, null);
  return null;
}

function isAllowedByRobots(robotsTxt: string | null, url: string, origin: string): boolean {
  if (!robotsTxt) return true; // No robots.txt → allowed

  const robots = robotsParser(`${origin}/robots.txt`, robotsTxt);
  const result = robots.isAllowed(url, USER_AGENT);
  // isAllowed returns boolean or undefined (undefined = not applicable, treat as allowed)
  return result !== false;
}

// ---------------------------------------------------------------------------
// HTTP Fetching
// ---------------------------------------------------------------------------

async function fetchSiteData(url: string): Promise<CachedResponse | null> {
  const { origin, hostname, pathname } = getOrigin(url);

  // 1. Check robots.txt
  const robotsTxt = await fetchRobotsTxt(hostname, origin);
  if (!isAllowedByRobots(robotsTxt, url, origin)) {
    // Return a response indicating robots disallowed
    return {
      url,
      fetchedAt: new Date().toISOString(),
      headHeaders: {},
      getHeaders: {},
      html: "",
      statusCode: 0,
      cnames: [],
    };
  }

  let headHeaders: Record<string, string> = {};
  let getHeaders: Record<string, string> = {};
  let html = "";
  let statusCode = 0;
  let cnames: string[] = [];

  // 2. HEAD request
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const headResponse = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    headHeaders = headersToRecord(headResponse.headers);
    statusCode = headResponse.status;
  } catch {
    // HEAD failed — continue, maybe GET will work
  }

  // 3. GET request for HTML
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const getResponse = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    getHeaders = headersToRecord(getResponse.headers);
    statusCode = getResponse.status;

    if (getResponse.ok) {
      const body = await getResponse.text();
      // Truncate to 500KB
      html = body.length > MAX_HTML_BYTES ? body.slice(0, MAX_HTML_BYTES) : body;
    }
  } catch {
    // GET failed — continue with whatever we have
  }

  // 4. DNS CNAME lookup
  try {
    const results = await dns.resolveCname(hostname);
    cnames = results;
  } catch {
    // DNS lookup failed — skip DNS signal, continue
  }

  // If both HEAD and GET failed (statusCode 0), return null to signal failure
  if (statusCode === 0) {
    return null;
  }

  return {
    url,
    fetchedAt: new Date().toISOString(),
    headHeaders,
    getHeaders,
    html,
    statusCode,
    cnames,
  };
}

// ---------------------------------------------------------------------------
// Detection Logic
// ---------------------------------------------------------------------------

function applyRules(url: string, response: CachedResponse | null): DetectionResult {
  // If response is null or statusCode is 0 (robots disallowed or fetch failed)
  if (!response || response.statusCode === 0) {
    const evidence: string[] = [];
    if (response && response.statusCode === 0 && response.html === "" && response.cnames.length === 0) {
      // Check if this was a robots disallowed case
      const { hostname, origin } = getOrigin(url);
      const robotsTxt = robotsCache.get(hostname);
      if (robotsTxt && !isAllowedByRobots(robotsTxt, url, origin)) {
        evidence.push("robots.txt disallowed");
      } else {
        evidence.push("unreachable (timeout or DNS failure)");
      }
    } else if (!response) {
      evidence.push("unreachable (timeout or DNS failure)");
    }

    return {
      url,
      stack: "",
      host: "",
      static_or_dynamic: "",
      confidence: "",
      evidence,
    };
  }

  // Non-2xx status code → all blank
  if (response.statusCode < 200 || response.statusCode >= 300) {
    return {
      url,
      stack: "",
      host: "",
      static_or_dynamic: "",
      confidence: "",
      evidence: [`HTTP ${response.statusCode}`],
    };
  }

  // Apply detection rules
  const input: SignalInput = {
    headHeaders: response.headHeaders,
    getHeaders: response.getHeaders,
    html: response.html,
    cnames: response.cnames,
    statusCode: response.statusCode,
  };

  const result: RuleResult = detectProvenance(input);

  // Compute row-level confidence = minimum of non-blank field confidences
  const confidence = computeRowConfidence(result);

  return {
    url,
    stack: result.stack,
    host: result.host,
    static_or_dynamic: result.static_or_dynamic,
    confidence,
    evidence: result.evidence,
  };
}

function computeRowConfidence(result: RuleResult): "HIGH" | "MEDIUM" | "LOW" | "" {
  const confidences: ("HIGH" | "MEDIUM" | "")[] = [];

  if (result.stack) confidences.push(result.stackConfidence);
  if (result.host) confidences.push(result.hostConfidence);
  if (result.static_or_dynamic) confidences.push(result.sodConfidence);

  if (confidences.length === 0) return "";

  // Minimum confidence: HIGH > MEDIUM > "" (blank)
  if (confidences.includes("")) return "";
  if (confidences.includes("MEDIUM")) return "MEDIUM";
  return "HIGH";
}

// ---------------------------------------------------------------------------
// Rate-Limited Concurrent Execution
// ---------------------------------------------------------------------------

async function processUrlsWithRateLimit(urls: string[]): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  let activeCount = 0;
  let index = 0;
  let lastInitTime = 0;

  return new Promise((resolveAll) => {
    const pending: Promise<void>[] = [];

    function tryNext(): void {
      while (activeCount < MAX_CONCURRENT && index < urls.length) {
        const currentIndex = index++;
        const url = urls[currentIndex];
        activeCount++;

        const now = Date.now();
        const timeSinceLast = now - lastInitTime;
        const waitTime = timeSinceLast < DELAY_BETWEEN_MS ? DELAY_BETWEEN_MS - timeSinceLast : 0;
        lastInitTime = now + waitTime;

        const task = (async () => {
          if (waitTime > 0) await delay(waitTime);

          // Check cache first
          const cached = loadFromCache(url);
          let response: CachedResponse | null;

          if (cached) {
            response = cached;
            process.stdout.write(`  [${currentIndex + 1}/${urls.length}] ${url} (cached)\n`);
          } else {
            process.stdout.write(`  [${currentIndex + 1}/${urls.length}] ${url} (fetching...)\n`);
            response = await fetchSiteData(url);
            if (response) {
              saveToCache(url, response);
            }
          }

          const result = applyRules(url, response);
          results[currentIndex] = result;

          activeCount--;
          tryNext();
        })();

        pending.push(task);
      }

      // Check if all done
      if (index >= urls.length && activeCount === 0) {
        Promise.all(pending).then(() => resolveAll(results));
      }
    }

    tryNext();
  });
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function sortByConfidence(results: DetectionResult[]): DetectionResult[] {
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, "": 3 };
  return [...results].sort((a, b) => {
    return (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3);
  });
}

function generateReport(results: DetectionResult[]): string {
  const sorted = sortByConfidence(results);

  const totalSites = sorted.length;
  const detectedCount = sorted.filter(
    (r) => r.stack || r.host || r.static_or_dynamic
  ).length;
  const allBlankCount = totalSites - detectedCount;

  const now = new Date().toISOString();

  let report = `# Provenance Detection Report\n\n`;
  report += `Generated: ${now}\n`;
  report += `Sites scanned: ${totalSites} | Detected (≥1 field): ${detectedCount} | All-blank: ${allBlankCount}\n\n`;
  report += `| url | stack | host | static_or_dynamic | confidence | evidence |\n`;
  report += `|-----|-------|------|-------------------|------------|----------|\n`;

  for (const r of sorted) {
    const evidenceStr = r.evidence.join("; ");
    report += `| ${r.url} | ${r.stack} | ${r.host} | ${r.static_or_dynamic} | ${r.confidence} | ${evidenceStr} |\n`;
  }

  return report;
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
    // Skip empty rows
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
  console.log("Surfdeck Provenance Detector");
  console.log("============================\n");

  ensureCacheDirs();

  // Read URLs from CSV
  const urls = readUrlsFromCSV(CSV_PATH);
  console.log(`Found ${urls.length} URLs in CSV.\n`);

  if (urls.length === 0) {
    console.log("No URLs to process. Exiting.");
    return;
  }

  // Process all URLs with rate limiting
  console.log(`Processing with max ${MAX_CONCURRENT} concurrent, ${DELAY_BETWEEN_MS}ms delay...\n`);
  const results = await processUrlsWithRateLimit(urls);

  // Sort and generate report
  const report = generateReport(results);
  writeFileSync(REPORT_PATH, report, "utf-8");

  // Print summary
  const detectedCount = results.filter(
    (r) => r.stack || r.host || r.static_or_dynamic
  ).length;
  const allBlankCount = results.length - detectedCount;

  console.log(`\n============================`);
  console.log(`Done!`);
  console.log(`Sites scanned: ${results.length}`);
  console.log(`Detected (≥1 field): ${detectedCount}`);
  console.log(`All-blank: ${allBlankCount}`);
  console.log(`\nReport written to: data/provenance-report.md`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
