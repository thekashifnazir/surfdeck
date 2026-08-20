/**
 * Discovery Sampler Pure-Function Tests — scripts/discover-vibecoded.test.ts
 *
 * Tests the pure functions in discover-vibecoded.ts using fixtures only.
 * Network is behind the fetch seam — these tests never hit the network.
 *
 * Validates: Requirements 12.4
 */

import { describe, it, expect, afterAll } from "vitest";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractUniqueSubdomains,
  isParkedPage,
  loadExistingUrls,
  sortCandidates,
  DOMAIN_PATTERNS,
  type Candidate,
} from "./discover-vibecoded.js";

// ---------------------------------------------------------------------------
// Test 1: Domain pattern mapping
// ---------------------------------------------------------------------------

describe("Domain pattern mapping", () => {
  it("coolapp.lovable.app → built_with=lovable, tier=2", () => {
    const lovablePattern = DOMAIN_PATTERNS.find((dp) => dp.suffix === "lovable.app");
    expect(lovablePattern).toBeDefined();
    expect(lovablePattern!.built_with).toBe("lovable");
    expect(lovablePattern!.tier).toBe(2);

    // Verify extractUniqueSubdomains correctly extracts the hostname
    const entries = [{ common_name: "coolapp.lovable.app" }];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    expect(result).toContain("coolapp.lovable.app");
  });

  it("mysite.bolt.host → built_with=bolt, tier=2", () => {
    const boltPattern = DOMAIN_PATTERNS.find((dp) => dp.suffix === "bolt.host");
    expect(boltPattern).toBeDefined();
    expect(boltPattern!.built_with).toBe("bolt");
    expect(boltPattern!.tier).toBe(2);

    const entries = [{ common_name: "mysite.bolt.host" }];
    const result = extractUniqueSubdomains(entries, "bolt.host");
    expect(result).toContain("mysite.bolt.host");
  });

  it("app.vercel.app → built_with=null, tier=3", () => {
    const vercelPattern = DOMAIN_PATTERNS.find((dp) => dp.suffix === "vercel.app");
    expect(vercelPattern).toBeDefined();
    expect(vercelPattern!.built_with).toBeNull();
    expect(vercelPattern!.tier).toBe(3);
  });

  it("site.netlify.app → built_with=null, tier=3", () => {
    const netlifyPattern = DOMAIN_PATTERNS.find((dp) => dp.suffix === "netlify.app");
    expect(netlifyPattern).toBeDefined();
    expect(netlifyPattern!.built_with).toBeNull();
    expect(netlifyPattern!.tier).toBe(3);
  });

  it("project.pages.dev → built_with=cloudflare_workers, tier=4", () => {
    const pagesPattern = DOMAIN_PATTERNS.find((dp) => dp.suffix === "pages.dev");
    expect(pagesPattern).toBeDefined();
    expect(pagesPattern!.built_with).toBe("cloudflare_workers");
    expect(pagesPattern!.tier).toBe(4);

    const entries = [{ common_name: "project.pages.dev" }];
    const result = extractUniqueSubdomains(entries, "pages.dev");
    expect(result).toContain("project.pages.dev");
  });

  it("myapp.fly.dev → built_with=fly, tier=4", () => {
    const flyPattern = DOMAIN_PATTERNS.find((dp) => dp.suffix === "fly.dev");
    expect(flyPattern).toBeDefined();
    expect(flyPattern!.built_with).toBe("fly");
    expect(flyPattern!.tier).toBe(4);
  });

  it("filters out wildcard entries (*.lovable.app)", () => {
    const entries = [
      { common_name: "*.lovable.app" },
      { common_name: "coolapp.lovable.app" },
    ];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    expect(result).toEqual(["coolapp.lovable.app"]);
  });

  it("filters out bare suffix (lovable.app without subdomain)", () => {
    const entries = [
      { common_name: "lovable.app" },
      { common_name: "real.lovable.app" },
    ];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    expect(result).toEqual(["real.lovable.app"]);
  });

  it("filters out multi-level subdomains (a.b.lovable.app)", () => {
    const entries = [
      { common_name: "a.b.lovable.app" },
      { common_name: "valid.lovable.app" },
    ];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    expect(result).toEqual(["valid.lovable.app"]);
  });

  it("deduplicates entries across common_name and name_value", () => {
    const entries = [
      { common_name: "app.lovable.app", name_value: "app.lovable.app" },
      { common_name: "app.lovable.app" },
    ];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    expect(result).toEqual(["app.lovable.app"]);
  });

  it("handles name_value with newline-separated hostnames", () => {
    const entries = [
      { name_value: "one.lovable.app\ntwo.lovable.app\nthree.lovable.app" },
    ];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    expect(result).toEqual(["one.lovable.app", "three.lovable.app", "two.lovable.app"]);
  });

  it("filters out very short subdomains (single char)", () => {
    const entries = [
      { common_name: "x.lovable.app" },
      { common_name: "ab.lovable.app" },
    ];
    const result = extractUniqueSubdomains(entries, "lovable.app");
    // "x" is 1 char → filtered; "ab" is 2 chars → kept
    expect(result).toEqual(["ab.lovable.app"]);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Deduplication against existing CSV
// ---------------------------------------------------------------------------

describe("Deduplication — loadExistingUrls", () => {
  const fixtureDir = resolve(__dirname, "../.vibecoded-cache");
  const fixtureCsv = resolve(fixtureDir, "test-dedupe-fixture.csv");

  // Ensure cache dir exists (it's gitignored)
  if (!existsSync(fixtureDir)) mkdirSync(fixtureDir, { recursive: true });

  // Write a small fixture CSV
  const csvContent = [
    "url,title,mood_tags,character,stack,host,static_or_dynamic,built_with,why_note,nsfw,vibecoded,source",
    "https://existing.lovable.app/,Existing Site,useful,modern_indie,,,,lovable,A site,0,1,manual",
    "https://another.bolt.host/,Another Site,learn,retro_personal,,,,bolt,Good one,0,1,manual",
    "https://opensite.com/,Open Site,think,minimal_static,nextjs,vercel,,,,0,0,manual",
  ].join("\n");

  writeFileSync(fixtureCsv, csvContent, "utf-8");

  afterAll(() => {
    try {
      unlinkSync(fixtureCsv);
    } catch {
      // cleanup best-effort
    }
  });

  it("loads existing URLs from a CSV file", () => {
    const urls = loadExistingUrls(fixtureCsv);
    expect(urls.size).toBe(3);
    expect(urls.has("https://existing.lovable.app/")).toBe(true);
    expect(urls.has("https://another.bolt.host/")).toBe(true);
    expect(urls.has("https://opensite.com/")).toBe(true);
  });

  it("candidate URL already in CSV is excluded by set membership", () => {
    const urls = loadExistingUrls(fixtureCsv);
    // Simulating the deduplication logic used in the script:
    const candidates = [
      { url: "https://existing.lovable.app/", built_with: "lovable", tier: 2 },
      { url: "https://newsite.lovable.app/", built_with: "lovable", tier: 2 },
    ];
    const novel = candidates.filter((c) => !urls.has(c.url));
    expect(novel).toHaveLength(1);
    expect(novel[0].url).toBe("https://newsite.lovable.app/");
  });

  it("returns empty set for nonexistent CSV path (graceful failure)", () => {
    const urls = loadExistingUrls("/nonexistent/path/to/file.csv");
    expect(urls.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Report sorting — tier ascending, then alphabetical by URL
// ---------------------------------------------------------------------------

describe("Report sorting", () => {
  it("sorts by tier ascending, then alphabetically by URL", () => {
    const candidates: Candidate[] = [
      { url: "https://zoo.pages.dev/", built_with: "cloudflare_workers", tier: 4, live: true, evidence: [] },
      { url: "https://alpha.lovable.app/", built_with: "lovable", tier: 2, live: true, evidence: [] },
      { url: "https://beta.lovable.app/", built_with: "lovable", tier: 2, live: true, evidence: [] },
      { url: "https://app.vercel.app/", built_with: null, tier: 3, live: true, evidence: [] },
      { url: "https://aaa.pages.dev/", built_with: "cloudflare_workers", tier: 4, live: true, evidence: [] },
    ];

    const sorted = sortCandidates(candidates);

    // Tier 2 first (alphabetical within tier)
    expect(sorted[0].url).toBe("https://alpha.lovable.app/");
    expect(sorted[1].url).toBe("https://beta.lovable.app/");
    // Tier 3
    expect(sorted[2].url).toBe("https://app.vercel.app/");
    // Tier 4 (alphabetical within tier)
    expect(sorted[3].url).toBe("https://aaa.pages.dev/");
    expect(sorted[4].url).toBe("https://zoo.pages.dev/");
  });

  it("does not mutate the original array", () => {
    const candidates: Candidate[] = [
      { url: "https://beta.lovable.app/", built_with: "lovable", tier: 2, live: true, evidence: [] },
      { url: "https://alpha.lovable.app/", built_with: "lovable", tier: 2, live: true, evidence: [] },
    ];

    const original = [...candidates];
    sortCandidates(candidates);

    expect(candidates[0].url).toBe(original[0].url);
    expect(candidates[1].url).toBe(original[1].url);
  });

  it("returns empty array for empty input", () => {
    expect(sortCandidates([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Parked page detection
// ---------------------------------------------------------------------------

describe("Parked page detection", () => {
  it('detects "this domain is parked" as parked', () => {
    const html = "<html><body><h1>This domain is parked</h1></body></html>";
    expect(isParkedPage(html)).toBe(true);
  });

  it('detects "buy this domain" as parked', () => {
    const html = '<html><body><p>Want to buy this domain? Click here.</p></body></html>';
    expect(isParkedPage(html)).toBe(true);
  });

  it('detects "domain is for sale" as parked', () => {
    const html = "<html><body><h2>This domain is for sale!</h2></body></html>";
    expect(isParkedPage(html)).toBe(true);
  });

  it('detects "coming soon" as parked', () => {
    const html = "<html><body><div>Coming Soon</div></body></html>";
    expect(isParkedPage(html)).toBe(true);
  });

  it('detects "domain parking" as parked', () => {
    const html = '<html><body><p>Domain Parking by Provider</p></body></html>';
    expect(isParkedPage(html)).toBe(true);
  });

  it("detects known parking providers (sedoparking)", () => {
    const html = '<html><body><script src="https://sedoparking.com/park.js"></script></body></html>';
    expect(isParkedPage(html)).toBe(true);
  });

  it("is case-insensitive in detection", () => {
    const html = "<html><body><h1>THIS DOMAIN IS PARKED</h1></body></html>";
    expect(isParkedPage(html)).toBe(true);
  });

  it("returns false for a real website with content", () => {
    const html = `<html><head><title>My Cool App</title></head>
      <body><h1>Welcome to my app</h1><p>This is a real site with content.</p></body></html>`;
    expect(isParkedPage(html)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isParkedPage("")).toBe(false);
  });

  it("returns false for null-ish empty input", () => {
    expect(isParkedPage("")).toBe(false);
  });
});
