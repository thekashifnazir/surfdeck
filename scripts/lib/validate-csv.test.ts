/**
 * CSV Validator — stack-enum check tests (scripts/lib/validate-csv.test.ts)
 *
 * Records Requirement 7 (Cycle 7 "Final Cut"): the reported "two rows with
 * modern_indie in stack" was investigated — no data change needed. Under
 * RFC-4180 parsing (parseCSV) no row carries modern_indie in the stack column;
 * the apparent hits (quoted titles like "100,000 Stars" / "Quick, Draw!") were a
 * naïve comma-split artefact of the quoted title, whose stack is genuinely blank.
 * The existing check #8 (the stack enum guard) in validate-csv.ts is the guard of
 * record, exercised here.
 *
 * Validates: Requirements 7.1, 7.3
 */

import { describe, it, expect } from "vitest";
import { validateCsv } from "./validate-csv.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// 12-column header in the frozen order.
const HEADER =
  "url,title,mood_tags,character,stack,host,static_or_dynamic,built_with,why_note,nsfw,vibecoded,source";

/**
 * Build a well-formed 12-field data row where every required field is valid and
 * only the `stack` field varies. Isolates check #8 (stack enum).
 */
function rowWithStack(stack: string): string {
  // url, title, mood_tags, character, stack, host, static_or_dynamic,
  // built_with, why_note, nsfw, vibecoded, source
  return [
    "https://example.com",
    "Example",
    "useful",
    "modern_indie",
    stack,
    "", // host (blank allowed)
    "", // static_or_dynamic (blank allowed)
    "", // built_with (blank allowed)
    "a note",
    "false",
    "0",
    "manual",
  ].join(",");
}

function csvWithStack(stack: string): string {
  return `${HEADER}\n${rowWithStack(stack)}\n`;
}

/** All validation errors reported against the `stack` column. */
function stackErrors(content: string) {
  return validateCsv(content).errors.filter((e) => e.column === "stack");
}

// ---------------------------------------------------------------------------
// Tests — check #8, the stack enum guard
// ---------------------------------------------------------------------------

describe("validateCsv — stack enum (check #8)", () => {
  it("rejects stack = modern_indie (a character value, not a valid stack)", () => {
    const errs = stackErrors(csvWithStack("modern_indie"));
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("not a valid stack");
    // The offending row is the first data row (row 2; header is row 1).
    expect(errs[0].row).toBe(2);
  });

  it("accepts a blank stack (stack is not a required field)", () => {
    const result = validateCsv(csvWithStack(""));
    expect(stackErrors(csvWithStack(""))).toHaveLength(0);
    // A fully-valid row with a blank stack passes overall.
    expect(result.ok).toBe(true);
  });

  it("accepts stack = nextjs (a valid stack)", () => {
    const result = validateCsv(csvWithStack("nextjs"));
    expect(stackErrors(csvWithStack("nextjs"))).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});
