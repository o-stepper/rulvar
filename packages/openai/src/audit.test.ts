/**
 * The v1.19.0 cache-journal audit helpers (v1.20.0 review P1/P2-2),
 * pinned to the review's frozen live numbers: the same two-call cache
 * scenario folds to $0.060296875 as recorded by v1.19.0 and to the true
 * $0.034734375 after the exact inversion.
 */
import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  priceUsdOf,
  type JournalEntry,
  type ModelRef,
  type Usage,
} from '@rulvar/core';

import { auditV1190CacheJournal, undoV1190CacheDoubleCount } from './audit.js';
import { OPENAI_PRICING } from './caps.js';

const priceUsd = (servedBy: ModelRef, usage: Usage): number | undefined => {
  const row = OPENAI_PRICING.models[servedBy];
  return row === undefined ? undefined : priceUsdOf(row, usage);
};

/** The frozen v1.19.0 journal shapes from the review. */
const INFLATED_WRITE_LEG: Usage = {
  inputTokens: 20_453,
  outputTokens: 7,
  cacheReadTokens: 0,
  cacheWriteTokens: 10_225,
};
const READ_LEG: Usage = {
  inputTokens: 10_228,
  outputTokens: 7,
  cacheReadTokens: 10_225,
  cacheWriteTokens: 0,
};

function terminalEntry(seq: number, usage: Usage, usageSemantics?: string): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `k${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    usage,
    servedBy: 'openai:gpt-5.6-terra',
    ...(usageSemantics === undefined ? {} : { usageSemantics }),
  } as unknown as JournalEntry;
}

describe('undoV1190CacheDoubleCount', () => {
  it('inverts the exact v1.19.0 transformation and only that', () => {
    expect(undoV1190CacheDoubleCount(INFLATED_WRITE_LEG)).toEqual({
      inputTokens: 10_228,
      outputTokens: 7,
      cacheReadTokens: 0,
      cacheWriteTokens: 10_225,
    });
    // No writes: recorded correctly by v1.19.0, returned unchanged.
    expect(undoV1190CacheDoubleCount(READ_LEG)).toEqual(READ_LEG);
  });

  it('refuses a usage the inversion cannot have produced', () => {
    expect(() =>
      undoV1190CacheDoubleCount({
        inputTokens: 100,
        outputTokens: 0,
        cacheReadTokens: 30,
        cacheWriteTokens: 80,
      }),
    ).toThrow(ConfigError);
  });
});

describe('auditV1190CacheJournal', () => {
  it('reproduces the review pair: $0.060296875 recorded, $0.034734375 corrected', () => {
    const audit = auditV1190CacheJournal(
      [terminalEntry(1, INFLATED_WRITE_LEG), terminalEntry(2, READ_LEG)],
      priceUsd,
    );
    expect(audit.affectedEntries).toBe(1);
    expect(audit.recordedUsd).toBeCloseTo(0.060296875, 12);
    expect(audit.correctedUsd).toBeCloseTo(0.034734375, 12);
  });

  it('treats stamped entries as already correct', () => {
    const audit = auditV1190CacheJournal(
      [terminalEntry(1, INFLATED_WRITE_LEG, 'openai-cache-subsets-v2'), terminalEntry(2, READ_LEG)],
      priceUsd,
    );
    expect(audit.affectedEntries).toBe(0);
    expect(audit.correctedUsd).toBeCloseTo(audit.recordedUsd, 12);
  });

  it('never mutates the journal: entries are byte-identical after the audit', () => {
    const entries = [terminalEntry(1, INFLATED_WRITE_LEG), terminalEntry(2, READ_LEG)];
    const frozen = JSON.stringify(entries);
    auditV1190CacheJournal(entries, priceUsd);
    expect(JSON.stringify(entries)).toBe(frozen);
    // The usage-level inverse also returns a fresh object.
    const before = { ...INFLATED_WRITE_LEG };
    const inverted = undoV1190CacheDoubleCount(INFLATED_WRITE_LEG);
    expect(INFLATED_WRITE_LEG).toEqual(before);
    expect(inverted).not.toBe(INFLATED_WRITE_LEG);
  });

  it('a correct v1.20.0 shape the inversion cannot fit folds as recorded instead of aborting', () => {
    // input 100 with reads 30 and writes 80 is a LEGITIMATE subset shape
    // (30 + 80 > 100 is impossible, so use 30 + 60): writes-heavy but
    // valid, and subtracting writes would leave less than the subsets.
    const legit: Usage = {
      inputTokens: 100,
      outputTokens: 5,
      cacheReadTokens: 30,
      cacheWriteTokens: 60,
    };
    const audit = auditV1190CacheJournal(
      [terminalEntry(1, legit), terminalEntry(2, INFLATED_WRITE_LEG)],
      priceUsd,
    );
    // The uninvertible entry folds as recorded; the real one still inverts.
    expect(audit.affectedEntries).toBe(1);
    expect(Number.isFinite(audit.correctedUsd)).toBe(true);
    expect(audit.recordedUsd).toBeGreaterThan(audit.correctedUsd);
  });

  it('ignores non-openai and unpriced slices', () => {
    const other = {
      ...terminalEntry(3, INFLATED_WRITE_LEG),
      servedBy: 'anthropic:claude-opus-4-8',
    };
    const audit = auditV1190CacheJournal([other as JournalEntry], priceUsd);
    expect(audit.affectedEntries).toBe(0);
    expect(audit.recordedUsd).toBeCloseTo(audit.correctedUsd, 12);
  });
});
