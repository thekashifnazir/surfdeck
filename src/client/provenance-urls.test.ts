import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV } from "../../scripts/seed-logic";
import { PROVENANCE_URLS, getProvenanceUrl } from "./provenance-urls";

// ─── Derive the distinct corpus values (RFC-4180 parsed, blanks excluded) ───

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

// ─── getProvenanceUrl resolves every corpus stack + host ───

describe("getProvenanceUrl resolves every corpus provenance value", () => {
  it("resolves all 11 distinct corpus stack values to a non-null URL", () => {
    const values = distinctCorpusValues("stack");
    expect(values.length).toBe(11);
    for (const value of values) {
      const url = getProvenanceUrl(value);
      expect(url, `missing URL for stack "${value}"`).not.toBeNull();
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it("resolves all 6 distinct corpus host values to a non-null URL", () => {
    const values = distinctCorpusValues("host");
    expect(values.length).toBe(6);
    for (const value of values) {
      const url = getProvenanceUrl(value);
      expect(url, `missing URL for host "${value}"`).not.toBeNull();
      expect(url).toMatch(/^https:\/\//);
    }
  });
});

// ─── unknown values → null ───

describe("getProvenanceUrl returns null for unmapped values", () => {
  it("returns null for an unknown value", () => {
    expect(getProvenanceUrl("made_up_thing")).toBeNull();
  });

  it("returns null for the empty string", () => {
    expect(getProvenanceUrl("")).toBeNull();
  });
});

// ─── PROVENANCE_URLS map sanity ───

describe("PROVENANCE_URLS", () => {
  it("every entry is an https URL", () => {
    for (const [key, url] of Object.entries(PROVENANCE_URLS)) {
      expect(typeof url, `url for "${key}"`).toBe("string");
      expect(url, `url for "${key}"`).toMatch(/^https:\/\//);
    }
  });
});
