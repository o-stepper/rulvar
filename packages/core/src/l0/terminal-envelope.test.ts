/**
 * The runtime terminal-envelope contract gate (RV3903, the fourth
 * comparison experiment). The typed producer is a compile-time
 * promise; the experiment probed the built dist and the typed copy
 * accepted `status: 'green'`, NaN dollars, and negative counters
 * without a sound. This table pins the gate: a valid envelope passes
 * by reference, and every malformed class refuses with a typed
 * ConfigError naming the field and the defect.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from './errors.js';
import type { TerminalEnvelope } from './terminal-envelope.js';
import { parseTerminalEnvelope } from './terminal-envelope.js';

function validEnvelope(): TerminalEnvelope {
  return {
    runId: 'run-1',
    workflow: 'review',
    status: 'ok',
    settled: true,
    totalUsd: 1.25,
    grossUsd: 1.5,
    costBasis: 'locally-estimated',
    costByModel: { 'fake:m1': 1.25 },
    wireRequests: 7,
    usage: {
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 0,
      cacheWriteTokens: 50,
      cacheWrite5mTokens: 50,
    },
    usageApprox: false,
    agentsSpawned: 3,
    completion: 'complete',
    deliverableAccepted: true,
    resultAvailable: true,
    acceptedArtifactRef: 42,
    claimConsistencyMeta: { findings: 0, judgedStage: 'final' },
    configFingerprint: 'cfg-1',
  };
}

describe('parseTerminalEnvelope (RV3903)', () => {
  it('passes a valid envelope back by reference, never a normalized copy', () => {
    const envelope = validEnvelope();
    expect(parseTerminalEnvelope(envelope)).toBe(envelope);
  });

  it('passes the journal-provenance shape and the unsettled superseded shape', () => {
    const persisted = { ...validEnvelope(), provenance: 'journal' as const };
    expect(parseTerminalEnvelope(persisted)).toBe(persisted);
    const superseded = {
      ...validEnvelope(),
      settled: false,
      settledReason: 'superseded' as const,
    };
    expect(parseTerminalEnvelope(superseded)).toBe(superseded);
  });

  it('lets unknown top-level fields through: the contract evolves additively', () => {
    const envelope = { ...validEnvelope(), someFutureField: { anything: true } };
    expect(parseTerminalEnvelope(envelope)).toBe(envelope);
  });

  it('accepts the error shape and refuses a malformed one', () => {
    const withError = {
      ...validEnvelope(),
      status: 'error' as const,
      error: { code: 'agent', message: 'boom', retryable: false },
    };
    expect(parseTerminalEnvelope(withError)).toBe(withError);
    expect(() =>
      parseTerminalEnvelope({ ...validEnvelope(), error: { message: 'no code' } }),
    ).toThrowError(/error\.code/u);
    expect(() =>
      parseTerminalEnvelope({
        ...validEnvelope(),
        error: { code: 'agent', message: 'x', retryable: 'yes' },
      }),
    ).toThrowError(/error\.retryable/u);
  });

  const MALFORMED: Array<{ name: string; mutate: Record<string, unknown>; expects: RegExp }> = [
    {
      name: 'an unknown status literal',
      mutate: { status: 'green' },
      expects: /status must be one of/u,
    },
    { name: 'NaN money', mutate: { totalUsd: Number.NaN }, expects: /totalUsd.*got NaN/u },
    {
      name: 'infinite money',
      mutate: { grossUsd: Number.POSITIVE_INFINITY },
      expects: /grossUsd/u,
    },
    { name: 'negative money', mutate: { totalUsd: -0.01 }, expects: /totalUsd/u },
    {
      name: 'net above gross',
      mutate: { totalUsd: 2, grossUsd: 1 },
      expects: /at most grossUsd/u,
    },
    {
      name: 'a wrong costBasis literal',
      mutate: { costBasis: 'provider-statement' },
      expects: /costBasis/u,
    },
    {
      name: 'NaN inside the per-model split',
      mutate: { costByModel: { 'fake:m1': Number.NaN } },
      expects: /costByModel\['fake:m1'\]/u,
    },
    {
      name: 'a fractional wire counter',
      mutate: { wireRequests: 1.5 },
      expects: /wireRequests/u,
    },
    {
      name: 'a negative agent counter',
      mutate: { agentsSpawned: -1 },
      expects: /agentsSpawned/u,
    },
    {
      name: 'NaN inside the usage subtree',
      mutate: { usage: { inputTokens: Number.NaN } },
      expects: /usage\.inputTokens/u,
    },
    {
      name: 'a negative nested usage number',
      mutate: { usage: { inputTokens: 1, nested: { cacheWrite5mTokens: -5 } } },
      expects: /usage\.nested\.cacheWrite5mTokens/u,
    },
    {
      name: 'a non-boolean usageApprox',
      mutate: { usageApprox: 'true' },
      expects: /usageApprox/u,
    },
    {
      name: 'an unknown completion literal',
      mutate: { completion: 'done' },
      expects: /completion/u,
    },
    {
      name: 'settledReason beside settled: true',
      mutate: { settled: true, settledReason: 'superseded' },
      expects: /present only beside settled: false/u,
    },
    {
      name: 'an unknown settledReason literal',
      mutate: { settled: false, settledReason: 'lost' },
      expects: /settledReason/u,
    },
    {
      name: 'an unknown provenance literal',
      mutate: { provenance: 'live' },
      expects: /provenance/u,
    },
    { name: 'an empty runId', mutate: { runId: '' }, expects: /runId/u },
    {
      name: 'a fractional acceptedArtifactRef',
      mutate: { acceptedArtifactRef: 3.5 },
      expects: /acceptedArtifactRef/u,
    },
    {
      name: 'an array claimConsistencyMeta',
      mutate: { claimConsistencyMeta: [] },
      expects: /claimConsistencyMeta/u,
    },
    {
      name: 'an empty configFingerprint',
      mutate: { configFingerprint: '' },
      expects: /configFingerprint/u,
    },
  ];

  for (const row of MALFORMED) {
    it(`refuses ${row.name} with a typed ConfigError`, () => {
      const malformed = { ...validEnvelope(), ...row.mutate };
      expect(() => parseTerminalEnvelope(malformed)).toThrowError(ConfigError);
      expect(() => parseTerminalEnvelope(malformed)).toThrowError(row.expects);
    });
  }

  it('refuses a non-object outright', () => {
    expect(() => parseTerminalEnvelope(null)).toThrowError(ConfigError);
    expect(() => parseTerminalEnvelope('{}')).toThrowError(ConfigError);
    expect(() => parseTerminalEnvelope([])).toThrowError(ConfigError);
  });
});
