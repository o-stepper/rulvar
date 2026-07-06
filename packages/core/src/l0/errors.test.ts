import { describe, expect, it } from 'vitest';

import type { AgentError, ErrorCode, WireError } from './errors.js';
import {
  agentErrorFromWire,
  agentErrorToWire,
  BudgetExhaustedError,
  ConfigError,
  InvalidResolutionError,
  JournalCompatibilityError,
  JournalMissError,
  JournalOrderViolation,
  LeaseHeldError,
  LurkerError,
  NonSerializableValueError,
  OrchestratorCapConfigError,
  PlanInvariantError,
  ReplayPlanHashMismatch,
  ScriptRejected,
} from './errors.js';

/** JSON round trip: exactly what a journal write and read performs. */
function throughJson(wire: WireError): WireError {
  return JSON.parse(JSON.stringify(wire)) as WireError;
}

describe('error taxonomy (M1-T02)', () => {
  const cases: Array<{ error: LurkerError; code: ErrorCode; retryable: boolean }> = [
    {
      error: new ConfigError('bad config', { data: { adapterId: 'x' } }),
      code: 'config',
      retryable: false,
    },
    {
      error: new NonSerializableValueError('boom'),
      code: 'non_serializable_value',
      retryable: false,
    },
    {
      error: new ScriptRejected('rejected', { data: { diagnostics: [] } }),
      code: 'script_rejected',
      retryable: false,
    },
    {
      error: new JournalCompatibilityError('too old', {
        subCode: 'HASH_VERSION_TOO_OLD',
        runId: 'r1',
        entrySeq: 4,
        entryHashVersion: 0,
        supportedRange: { min: 1, max: 2 },
        hint: 'enable deriverV0 from @lurker/compat',
      }),
      code: 'journal_compat',
      retryable: false,
    },
    { error: new InvalidResolutionError('closed'), code: 'invalid_resolution', retryable: false },
    {
      error: new JournalOrderViolation('unfenced writer'),
      code: 'journal_order_violation',
      retryable: false,
    },
    { error: new PlanInvariantError('cycle'), code: 'plan_invariant', retryable: false },
    {
      error: new ReplayPlanHashMismatch('fork'),
      code: 'replay_plan_hash_mismatch',
      retryable: false,
    },
    {
      error: new OrchestratorCapConfigError('cap < reserve'),
      code: 'orchestrator_cap_config',
      retryable: false,
    },
    { error: new JournalMissError('would go live'), code: 'journal_miss', retryable: false },
    { error: new BudgetExhaustedError('ceiling'), code: 'budget_exhausted', retryable: false },
    {
      error: new LeaseHeldError('held', { data: { owner: 'w1' } }),
      code: 'lease_held',
      retryable: true,
    },
  ];

  it('every named error serializes to a WireError and back losslessly', () => {
    for (const { error, code, retryable } of cases) {
      const wire = throughJson(error.toWire());
      expect(wire.code).toBe(code);
      expect(wire.message).toBe(error.message);
      expect(wire.retryable).toBe(retryable);
      if (error.data !== undefined) {
        expect(wire.data).toEqual(error.data);
      } else {
        expect(wire).not.toHaveProperty('data');
      }
    }
  });

  it('the code registry is closed and unique across classes', () => {
    const codes = cases.map(({ error }) => error.code);
    expect(new Set(codes).size).toBe(codes.length);
    // 13 registry codes: 12 LurkerError classes plus 'agent' (a value, not a class).
    expect(codes).toHaveLength(12);
    expect(codes).not.toContain('agent');
  });

  it('all named errors are LurkerError and Error instances with stable names', () => {
    for (const { error } of cases) {
      expect(error).toBeInstanceOf(LurkerError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(error.constructor.name);
    }
  });

  it('JournalCompatibilityError carries its typed detail and journal-bound data', () => {
    const error = new JournalCompatibilityError('too new', {
      subCode: 'HASH_VERSION_TOO_NEW',
      runId: 'r2',
      entrySeq: 9,
      entryHashVersion: 3,
      supportedRange: { min: 1, max: 2 },
      hint: 'upgrade lurker',
    });
    expect(error.subCode).toBe('HASH_VERSION_TOO_NEW');
    expect(error.supportedRange).toEqual({ min: 1, max: 2 });
    const wire = throughJson(error.toWire());
    expect(wire.data).toEqual({
      subCode: 'HASH_VERSION_TOO_NEW',
      runId: 'r2',
      entrySeq: 9,
      entryHashVersion: 3,
      supportedRange: { min: 1, max: 2 },
      hint: 'upgrade lurker',
    });
  });

  it('preserves cause chains locally without leaking them into the wire form', () => {
    const cause = new Error('io');
    const error = new ConfigError('outer', { cause });
    expect(error.cause).toBe(cause);
    expect(JSON.stringify(error.toWire())).not.toContain('io');
  });
});

describe('AgentError wire projection (M1-T02)', () => {
  it('round-trips kind, retryability, retryAfterMs, and issues through code agent', () => {
    const agentError: AgentError = {
      kind: 'rate-limit',
      retryable: true,
      retryAfterMs: 12_000,
      issues: [{ message: 'expected string', path: ['user', 0, 'name'] }],
    };
    const wire = throughJson(agentErrorToWire(agentError, 'rate limited'));
    expect(wire.code).toBe('agent');
    expect(wire.retryable).toBe(true);
    const back = agentErrorFromWire(wire);
    expect(back).toEqual(agentError);
  });

  it('flattens { key } path segments into JSON-safe segments', () => {
    const wire = agentErrorToWire(
      {
        kind: 'schema-mismatch',
        retryable: false,
        issues: [{ message: 'bad', path: [{ key: 'a' }, 3] }],
      },
      'mismatch',
    );
    const issues = (wire.data as { issues: Array<{ path: unknown[] }> }).issues;
    expect(issues[0]?.path).toEqual(['a', 3]);
  });

  it('rejects a non-agent wire code', () => {
    expect(() => agentErrorFromWire({ code: 'config', message: 'x', retryable: false })).toThrow(
      ConfigError,
    );
  });
});
