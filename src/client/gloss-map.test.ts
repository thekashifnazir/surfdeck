import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV } from "../../scripts/seed-logic";
import { GROUP_GLOSS, CHIP_GLOSS, RECIPE_FRAGMENTS } from "./gloss-map";

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

// ─── CHIP_GLOSS coverage ───

describe("CHIP_GLOSS covers every corpus value", () => {
  it("has an entry for every distinct corpus stack value", () => {
    const values = distinctCorpusValues("stack");
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(CHIP_GLOSS, `missing CHIP_GLOSS for stack "${value}"`).toHaveProperty(
        value
      );
    }
  });

  it("has an entry for every distinct corpus host value", () => {
    const values = distinctCorpusValues("host");
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(CHIP_GLOSS, `missing CHIP_GLOSS for host "${value}"`).toHaveProperty(
        value
      );
    }
  });

  it("has an entry for every distinct corpus character value", () => {
    const values = distinctCorpusValues("character");
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(
        CHIP_GLOSS,
        `missing CHIP_GLOSS for character "${value}"`
      ).toHaveProperty(value);
    }
  });

  it("has an entry for every distinct corpus static_or_dynamic value", () => {
    const values = distinctCorpusValues("static_or_dynamic");
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(
        CHIP_GLOSS,
        `missing CHIP_GLOSS for static_or_dynamic "${value}"`
      ).toHaveProperty(value);
    }
  });

  it("has an entry for all four tiers", () => {
    for (const tier of ["1", "2", "3", "4"]) {
      expect(CHIP_GLOSS, `missing CHIP_GLOSS for tier "${tier}"`).toHaveProperty(
        tier
      );
    }
  });

  it("every CHIP_GLOSS entry is a non-empty string", () => {
    for (const [key, gloss] of Object.entries(CHIP_GLOSS)) {
      expect(typeof gloss, `gloss for "${key}"`).toBe("string");
      expect(gloss.length, `gloss for "${key}"`).toBeGreaterThan(0);
    }
  });
});

// ─── GROUP_GLOSS verbatim ───

describe("GROUP_GLOSS is the approved verbatim copy", () => {
  it("matches the approved strings for every group", () => {
    expect(GROUP_GLOSS).toEqual({
      character: "what kind of place it is",
      stack: "what it was built with",
      host: "where it lives online",
      static_or_dynamic: "does it change while you watch",
      tier: "how much of it AI built",
    });
  });
});

// ─── RECIPE_FRAGMENTS sanity ───

describe("RECIPE_FRAGMENTS", () => {
  it("has a fragment for every distinct corpus stack value", () => {
    for (const value of distinctCorpusValues("stack")) {
      expect(
        RECIPE_FRAGMENTS,
        `missing RECIPE_FRAGMENTS for stack "${value}"`
      ).toHaveProperty(value);
    }
  });

  it("has a fragment for every distinct corpus host value", () => {
    for (const value of distinctCorpusValues("host")) {
      expect(
        RECIPE_FRAGMENTS,
        `missing RECIPE_FRAGMENTS for host "${value}"`
      ).toHaveProperty(value);
    }
  });

  it("composes the comp's static_html + github_pages recipe", () => {
    expect(
      `the recipe: ${RECIPE_FRAGMENTS.static_html} — ${RECIPE_FRAGMENTS.github_pages}`
    ).toBe("the recipe: written by hand, no tools — hosted free from a code repo");
  });
});
