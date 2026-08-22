/**
 * Build-time colophon-stats generator.
 *
 * Computes the four self-portrait statistics FRESH from the repository and
 * writes them into the generated module `src/worker/colophon-stats.ts`, which
 * the `/ouroboros` "Dead Air" route imports. This keeps the colophon numbers
 * honest — they are derived from the repo at build time, never hand-typed
 * literals scattered across the route (design §4.4, Req 4.9).
 *
 * Derivation (all fresh at ship):
 *   SPEC_COUNT — count of directories in `.kiro/specs/` (incl. `final-cut`).
 *   HOOK_COUNT — count of `*.json` files in `.kiro/hooks/`.
 *   TEST_COUNT — the real vitest total (full suite, JSON reporter → numTotalTests).
 *   LOG_COUNT  — the HIGHEST entry number in `docs/kiro-process.md`. The counting
 *                unit is the entry NUMBER, not headings: entries are numbered
 *                (`**82 · …`, older ones `**05–06 · …`), so take the maximum
 *                number present. Rendered `{n}+` by the route.
 *
 * Usage:
 *   npx tsx scripts/generate-colophon-stats.ts
 *   npm run generate:colophon
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const SPECS_DIR = resolve(PROJECT_ROOT, ".kiro/specs");
const HOOKS_DIR = resolve(PROJECT_ROOT, ".kiro/hooks");
const PROCESS_LOG = resolve(PROJECT_ROOT, "docs/kiro-process.md");
const OUTPUT_FILE = resolve(PROJECT_ROOT, "src/worker/colophon-stats.ts");

/** Count directories directly under `.kiro/specs/` (each is one Kiro spec). */
export function countSpecs(specsDir: string): number {
  if (!existsSync(specsDir)) return 0;
  return readdirSync(specsDir).filter((entry) => {
    try {
      return statSync(join(specsDir, entry)).isDirectory();
    } catch {
      return false;
    }
  }).length;
}

/** Count `*.json` files under `.kiro/hooks/` (each is one agent hook). */
export function countHooks(hooksDir: string): number {
  if (!existsSync(hooksDir)) return 0;
  return readdirSync(hooksDir).filter((f) => f.endsWith(".json")).length;
}

/**
 * Highest entry NUMBER in the process log.
 *
 * Entry markers sit at the start of a line as bold `**N · …` (older ones as a
 * range like `**05–06 · …`). We collect every number in those markers — both
 * ends of a range — and return the maximum. Anchored to line start so bold
 * spans mid-paragraph (e.g. `**576 rows written**`) are never miscounted.
 */
export function highestLogEntry(markdown: string): number {
  const re = /^\*\*(\d+)(?:\s*[–—-]\s*(\d+))?\s*·/gm;
  let max = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const start = Number.parseInt(m[1], 10);
    if (Number.isFinite(start) && start > max) max = start;
    if (m[2] !== undefined) {
      const end = Number.parseInt(m[2], 10);
      if (Number.isFinite(end) && end > max) max = end;
    }
  }
  return max;
}

/**
 * Real vitest total — runs the full suite once with the JSON reporter and reads
 * `numTotalTests`. This is the honest "fresh at ship" count; it is intentionally
 * a build-time step, not a runtime one.
 */
export function countTests(projectRoot: string): number {
  const tmp = mkdtempSync(join(tmpdir(), "colophon-stats-"));
  const reportFile = join(tmp, "vitest-report.json");
  try {
    execSync(
      `npx vitest --run --config vitest.config.ts --reporter=json --outputFile="${reportFile}"`,
      { cwd: projectRoot, stdio: "ignore" }
    );
    const report = JSON.parse(readFileSync(reportFile, "utf-8")) as {
      numTotalTests?: number;
    };
    if (typeof report.numTotalTests !== "number") {
      throw new Error("vitest JSON report missing numTotalTests");
    }
    return report.numTotalTests;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Render the generated module source. */
export function renderModule(stats: {
  specCount: number;
  hookCount: number;
  testCount: number;
  logCount: number;
}): string {
  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Build-time colophon statistics for the /ouroboros "Dead Air" self-portrait,
 * counted fresh from the repository (design §4.4, Req 4.9).
 *
 * Regenerate with: npm run generate:colophon
 */

/** Directories in \`.kiro/specs/\` — one per Kiro spec. */
export const SPEC_COUNT = ${stats.specCount};

/** \`*.json\` files in \`.kiro/hooks/\` — one per agent hook. */
export const HOOK_COUNT = ${stats.hookCount};

/** Real vitest total across the whole suite. */
export const TEST_COUNT = ${stats.testCount};

/**
 * Highest entry NUMBER in \`docs/kiro-process.md\`.
 * The Dead Air stat card renders this in \`{n}+\` form (e.g. "${stats.logCount}+ process-log entries").
 */
export const LOG_COUNT = ${stats.logCount};
`;
}

function main(): void {
  const specCount = countSpecs(SPECS_DIR);
  const hookCount = countHooks(HOOKS_DIR);
  const logCount = highestLogEntry(readFileSync(PROCESS_LOG, "utf-8"));

  console.log(`SPEC_COUNT = ${specCount}`);
  console.log(`HOOK_COUNT = ${hookCount}`);
  console.log(`LOG_COUNT  = ${logCount}`);
  console.log("Running the full vitest suite to count tests (this takes a moment)…");
  const testCount = countTests(PROJECT_ROOT);
  console.log(`TEST_COUNT = ${testCount}`);

  writeFileSync(
    OUTPUT_FILE,
    renderModule({ specCount, hookCount, testCount, logCount }),
    "utf-8"
  );
  console.log(`Wrote ${OUTPUT_FILE}`);
}

// Only run when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === __filename;
if (invokedDirectly) {
  main();
}
