import { describe, expect, it } from 'vitest';

import { deriveExecIdempotencyKey } from './executor.js';

describe('deriveExecIdempotencyKey (RV-216; P0.4 logical-invocation binding)', () => {
  it('is stable for identical (runId, agentSeq, ordinal, tool, args)', () => {
    const a = deriveExecIdempotencyKey('run-1', 7, 1, 'run_python', { code: 'x' });
    const b = deriveExecIdempotencyKey('run-1', 7, 1, 'run_python', { code: 'x' });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('canonicalizes argument key order', () => {
    const a = deriveExecIdempotencyKey('run-1', 7, 1, 't', { a: 1, b: 2 });
    const b = deriveExecIdempotencyKey('run-1', 7, 1, 't', { b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('separates distinct runs, tools, and arguments', () => {
    const base = deriveExecIdempotencyKey('run-1', 7, 1, 't', { code: 'x' });
    expect(deriveExecIdempotencyKey('run-2', 7, 1, 't', { code: 'x' })).not.toBe(base);
    expect(deriveExecIdempotencyKey('run-1', 7, 1, 'u', { code: 'x' })).not.toBe(base);
    expect(deriveExecIdempotencyKey('run-1', 7, 1, 't', { code: 'y' })).not.toBe(base);
  });

  it('separates two calls with identical args by their logical invocation (P0.4)', () => {
    // Two DISTINCT calls in one run with byte-identical arguments: the
    // ordinal within one agent, or the agent entry seq across agents,
    // keeps their keys apart so external dedup never folds two intents.
    const first = deriveExecIdempotencyKey('run-1', 7, 1, 'charge', { amountCents: 500 });
    const second = deriveExecIdempotencyKey('run-1', 7, 2, 'charge', { amountCents: 500 });
    const otherAgent = deriveExecIdempotencyKey('run-1', 12, 1, 'charge', { amountCents: 500 });
    expect(second).not.toBe(first);
    expect(otherAgent).not.toBe(first);
    // But the SAME logical invocation (same agentSeq and ordinal) reuses
    // the key: an at-least-once retry folds into effectively-once.
    expect(deriveExecIdempotencyKey('run-1', 7, 1, 'charge', { amountCents: 500 })).toBe(first);
  });
});
