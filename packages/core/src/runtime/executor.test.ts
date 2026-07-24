import { describe, expect, it } from 'vitest';

import { deriveExecIdempotencyKey } from './executor.js';

describe('deriveExecIdempotencyKey (RV-216)', () => {
  it('is stable for identical (runId, tool, args)', () => {
    const a = deriveExecIdempotencyKey('run-1', 'run_python', { code: 'x' });
    const b = deriveExecIdempotencyKey('run-1', 'run_python', { code: 'x' });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('canonicalizes argument key order', () => {
    const a = deriveExecIdempotencyKey('run-1', 't', { a: 1, b: 2 });
    const b = deriveExecIdempotencyKey('run-1', 't', { b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('separates distinct runs, tools, and arguments', () => {
    const base = deriveExecIdempotencyKey('run-1', 't', { code: 'x' });
    expect(deriveExecIdempotencyKey('run-2', 't', { code: 'x' })).not.toBe(base);
    expect(deriveExecIdempotencyKey('run-1', 'u', { code: 'x' })).not.toBe(base);
    expect(deriveExecIdempotencyKey('run-1', 't', { code: 'y' })).not.toBe(base);
  });
});
