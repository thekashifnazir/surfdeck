import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCsv } from '../lib/validate-csv';

const HEADER = 'url,title,mood_tags,character,stack,host,static_or_dynamic,built_with,why_note,nsfw,vibecoded,source';
const VALID_ROW = 'https://example.com,Example Site,useful,modern_indie,,,,,A great site,false,0,manual';

describe('validate-seed — pass case', () => {
  it('production CSV passes all constraints', () => {
    const csvPath = resolve(__dirname, '../../data/featured-sites.csv');
    const content = readFileSync(csvPath, 'utf-8');
    const result = validateCsv(content);

    expect(result.ok).toBe(true);
    expect(result.rowCount).toBe(349);
    expect(result.errors).toEqual([]);
  });
});

describe('validate-seed — required fields and URL format', () => {
  it('reports error when title is blank', () => {
    // Build a row with blank title (2nd field)
    const blankTitleRow = 'https://example.com,,useful,modern_indie,,,,,A great site,false,0,manual';
    const csv = `${HEADER}\n${blankTitleRow}\n`;

    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const titleError = result.errors.find(
      (e) => e.column === 'title' && e.message.includes('required')
    );
    expect(titleError).toBeDefined();
    expect(titleError!.row).toBe(2);
  });

  it('reports error when source is blank', () => {
    // Build a row with blank source (12th/last field)
    const blankSourceRow = 'https://example.com,Example Site,useful,modern_indie,,,,,A great site,false,0,';
    const csv = `${HEADER}\n${blankSourceRow}\n`;

    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const sourceError = result.errors.find(
      (e) => e.column === 'source' && e.message.includes('required')
    );
    expect(sourceError).toBeDefined();
    expect(sourceError!.row).toBe(2);
  });

  it('reports error when url starts with http:// instead of https://', () => {
    // Build a row with http:// URL
    const httpRow = 'http://example.com,Example Site,useful,modern_indie,,,,,A great site,false,0,manual';
    const csv = `${HEADER}\n${httpRow}\n`;

    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const urlError = result.errors.find(
      (e) => e.column === 'url' && e.message.includes('https://')
    );
    expect(urlError).toBeDefined();
    expect(urlError!.row).toBe(2);
  });
});

describe('validate-seed — structural failures', () => {
  it('reports error for a ragged row (fewer than 12 fields)', () => {
    // Remove the last field from the valid row to produce only 11 fields
    const fields = VALID_ROW.split(',');
    const raggedRow = fields.slice(0, -1).join(',');
    const csv = `${HEADER}\n${raggedRow}\n`;

    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const raggedError = result.errors.find(
      (e) => e.message.includes('ragged') || e.message.includes('12')
    );
    expect(raggedError).toBeDefined();
  });

  it('reports error for wrong header (swapped column names)', () => {
    // Swap "url" and "title" in the header
    const swappedHeader = HEADER.replace('url,title,', 'title,url,');
    const csv = `${swappedHeader}\n${VALID_ROW}\n`;

    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const headerError = result.errors.find(
      (e) => e.message.includes('Header') || e.message.includes('expected')
    );
    expect(headerError).toBeDefined();
  });
});


describe('validate-seed — enum constraints', () => {
  /** Helper: replace a field in VALID_ROW by column index, return full CSV string. */
  function csvWithField(index: number, value: string): string {
    const fields = VALID_ROW.split(',');
    fields[index] = value;
    return `${HEADER}\n${fields.join(',')}\n`;
  }

  it('reports error for invalid character ("funky")', () => {
    const csv = csvWithField(3, 'funky');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'character' && e.message.includes('funky')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/allowed/i);
  });

  it('reports error for invalid mood_tags ("useful;party")', () => {
    const csv = csvWithField(2, 'useful;party');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'mood_tags' && e.message.includes('party')
    );
    expect(err).toBeDefined();
  });

  it('reports error for duplicate mood_tags ("useful;useful")', () => {
    const csv = csvWithField(2, 'useful;useful');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'mood_tags' && e.message.includes('duplicate')
    );
    expect(err).toBeDefined();
  });

  it('reports error for invalid stack ("angular")', () => {
    const csv = csvWithField(4, 'angular');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'stack' && e.message.includes('angular')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/allowed/i);
  });

  it('reports error for invalid host ("aws")', () => {
    const csv = csvWithField(5, 'aws');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'host' && e.message.includes('aws')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/allowed/i);
  });

  it('reports error for invalid static_or_dynamic ("hybrid")', () => {
    const csv = csvWithField(6, 'hybrid');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'static_or_dynamic' && e.message.includes('hybrid')
    );
    expect(err).toBeDefined();
  });

  it('reports error for invalid nsfw ("yes")', () => {
    const csv = csvWithField(9, 'yes');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'nsfw' && e.message.includes('yes')
    );
    expect(err).toBeDefined();
  });

  it('reports error for invalid vibecoded ("2")', () => {
    const csv = csvWithField(10, '2');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'vibecoded' && e.message.includes('2')
    );
    expect(err).toBeDefined();
  });

  it('reports error for invalid built_with ("chatgpt")', () => {
    const csv = csvWithField(7, 'chatgpt');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'built_with' && e.message.includes('chatgpt')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/allowed/i);
  });
});


describe('validate-seed — provenance conventions', () => {
  /** Helper: replace a field in VALID_ROW by column index, return full CSV string. */
  function csvWithField(index: number, value: string): string {
    const fields = VALID_ROW.split(',');
    fields[index] = value;
    return `${HEADER}\n${fields.join(',')}\n`;
  }

  /** Helper: replace multiple fields in VALID_ROW by column index. */
  function csvWithFields(replacements: [number, string][]): string {
    const fields = VALID_ROW.split(',');
    for (const [index, value] of replacements) {
      fields[index] = value;
    }
    return `${HEADER}\n${fields.join(',')}\n`;
  }

  it('reports error when stack is "unknown"', () => {
    const csv = csvWithField(4, 'unknown');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    // The provenance convention check produces a "not allowed" error distinct from the enum error
    const err = result.errors.find(
      (e) => e.column === 'stack' && e.message.includes('not allowed')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/blank/i);
  });

  it('reports error when why_note is "TBD"', () => {
    const csv = csvWithField(8, 'TBD');
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);
    const err = result.errors.find(
      (e) => e.column === 'why_note' && e.message.includes('TBD')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/placeholder/i);
  });

  it('reports all violations in a single row (not short-circuit)', () => {
    // stack="unknown", host="unknown", why_note="TBD" — three violations at once
    const csv = csvWithFields([
      [4, 'unknown'],
      [5, 'unknown'],
      [8, 'TBD'],
    ]);
    const result = validateCsv(csv);

    expect(result.ok).toBe(false);

    const stackErr = result.errors.find(
      (e) => e.column === 'stack' && e.message.toLowerCase().includes('unknown')
    );
    const hostErr = result.errors.find(
      (e) => e.column === 'host' && e.message.toLowerCase().includes('unknown')
    );
    const whyNoteErr = result.errors.find(
      (e) => e.column === 'why_note' && e.message.includes('TBD')
    );

    expect(stackErr).toBeDefined();
    expect(hostErr).toBeDefined();
    expect(whyNoteErr).toBeDefined();

    // Verify at least 3 errors were reported (may include enum errors too)
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
