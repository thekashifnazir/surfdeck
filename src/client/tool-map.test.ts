import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV } from "../../scripts/seed-logic";
import { TOOL_MAP, getToolInfo, type ToolInfo } from "./tool-map";

// ─── Derive the distinct corpus built_with values (RFC-4180 parsed, blanks excluded) ───

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolve(__dirname, "../../data/featured-sites.csv");

/** Distinct non-blank values in a column, parsed with the same RFC-4180 parser
 *  the seed/validator use (so quoted-comma titles never leak into other cols). */
function distinctCorpusValues(column: string): string[] {
  const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));
  const header = rows[0];
  const idx = header.indexOf(column);
  const data = rows.slice(1).filter((r) => r.length === header.length);
  const set = new Set<string>();
  for (const row of data) {
    const value = row[idx].trim();
    if (value !== "") set.add(value);
  }
  return [...set].sort();
}

// The 8 real corpus built_with values (Requirement 3.5).
const EXPECTED_BUILT_WITH = [
  "bolt",
  "claude_code",
  "cloudflare_workers",
  "cursor",
  "fly",
  "godaddy_airo",
  "kiro",
  "lovable",
].sort();

// ─── getToolInfo resolves every corpus built_with value ───

describe("getToolInfo resolves every corpus built_with value", () => {
  it("resolves all 8 distinct corpus built_with values to a ToolInfo", () => {
    const values = distinctCorpusValues("built_with");
    expect(values).toEqual(EXPECTED_BUILT_WITH);
    for (const value of values) {
      const info = getToolInfo(value);
      expect(info, `missing ToolInfo for built_with "${value}"`).not.toBeNull();
      expect(info!.url, `url for "${value}"`).toMatch(/^https:\/\//);
      expect(info!.timeCue.length, `timeCue for "${value}"`).toBeGreaterThan(0);
    }
  });

  it("resolves each of the 8 keys to a non-empty url and timeCue", () => {
    for (const value of EXPECTED_BUILT_WITH) {
      const info = getToolInfo(value);
      expect(info, `missing ToolInfo for "${value}"`).not.toBeNull();
      expect(info!.url.length, `url for "${value}"`).toBeGreaterThan(0);
      expect(info!.timeCue.length, `timeCue for "${value}"`).toBeGreaterThan(0);
    }
  });
});

// ─── each key resolves to the exact approved url + timeCue ───

describe("getToolInfo returns the exact approved values (design §3.2)", () => {
  const APPROVED: Record<string, ToolInfo> = {
    lovable:            { url: "https://lovable.dev",             timeCue: "type what you want · free to start · a site by tonight" },
    bolt:               { url: "https://bolt.new",                timeCue: "prompt in the browser · free to start · a site by tonight" },
    godaddy_airo:       { url: "https://www.godaddy.com/airo",    timeCue: "guided setup · a site in an afternoon" },
    cursor:             { url: "https://cursor.com",              timeCue: "an AI editor pair-codes with you · free tier · a weekend project" },
    claude_code:        { url: "https://claude.com/claude-code",  timeCue: "an AI agent codes in your terminal · you review, it builds" },
    kiro:               { url: "https://kiro.dev",                timeCue: "spec it, agents build it — this site's own recipe" },
    cloudflare_workers: { url: "https://workers.cloudflare.com",  timeCue: "for developers · free tier · deploys in minutes" },
    fly:                { url: "https://fly.io",                  timeCue: "for developers · runs apps near your visitors" },
  };

  for (const [key, expected] of Object.entries(APPROVED)) {
    it(`resolves "${key}" to its approved url + timeCue`, () => {
      expect(getToolInfo(key)).toEqual(expected);
    });
  }
});

// ─── unknown values → null (Requirement 3.6) ───

describe("getToolInfo returns null for unmapped values", () => {
  it("returns null for an unknown value", () => {
    expect(getToolInfo("made_up_thing")).toBeNull();
  });

  it("returns null for the empty string", () => {
    expect(getToolInfo("")).toBeNull();
  });
});

// ─── TOOL_MAP map sanity ───

describe("TOOL_MAP", () => {
  it("has exactly the 8 approved keys", () => {
    expect(Object.keys(TOOL_MAP).sort()).toEqual(EXPECTED_BUILT_WITH);
  });

  it("every entry is an https URL with a non-empty timeCue", () => {
    for (const [key, info] of Object.entries(TOOL_MAP)) {
      expect(info.url, `url for "${key}"`).toMatch(/^https:\/\//);
      expect(info.timeCue.length, `timeCue for "${key}"`).toBeGreaterThan(0);
    }
  });
});
