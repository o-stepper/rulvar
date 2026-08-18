/**
 * The regulated run profile (RV4009): one call composes every
 * assurance posture this codebase grew across the comparison arcs,
 * refuses any loosening typed, and pins the enforced posture behind a
 * hash the existing genesis/resume machinery records and asserts.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { createEngine, type CreateEngineOptions, type RunOptions } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';
import { compileRegulatedProfile } from './regulated-profile.js';

const RESOLVE = (): string | undefined => undefined;

const BASE = (): { engine: CreateEngineOptions; run: RunOptions } => ({
  engine: {
    adapters: [scriptedAdapter(() => ({ text: 'x' }))],
    defaults: { routing: { loop: 'fake:model' } },
  },
  run: {
    budgetUsd: 5,
    scope: { tenant: 'acme' },
  },
});

describe('compileRegulatedProfile (RV4009)', () => {
  it('fills the floor: strict approvals, intent receipts, error determinism, welded ceilings', () => {
    const compiled = compileRegulatedProfile(BASE());
    expect(compiled.engine.defaults?.permissions?.strictApprovals).toBe(true);
    expect(compiled.engine.defaults?.billingReceipts).toBe('intent');
    expect(compiled.engine.determinism?.mode).toBe('error');
    expect(compiled.run.budgetPolicy).toBe('immutable-lifetime');
    expect(compiled.run.strictPricing).toBe(true);
    expect(compiled.run.configFingerprint).toMatch(/^regulated:1:[0-9a-f]{64}$/);
    expect(compiled.profileHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses every loosening typed, naming the field', () => {
    const cases: Array<[string, () => unknown, RegExp]> = [
      [
        'strictApprovals false',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            engine: {
              ...BASE().engine,
              defaults: {
                routing: { loop: 'fake:model' },
                permissions: { strictApprovals: false },
              },
            },
          }),
        /strictApprovals/,
      ],
      [
        'async receipts',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            engine: {
              ...BASE().engine,
              defaults: { routing: { loop: 'fake:model' }, billingReceipts: 'async' },
            },
          }),
        /billingReceipts.*'intent'/,
      ],
      [
        'warn determinism',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            engine: { ...BASE().engine, determinism: { mode: 'warn' } },
          }),
        /determinism\.mode/,
      ],
      [
        'no budget',
        () => compileRegulatedProfile({ ...BASE(), run: { scope: { tenant: 'acme' } } }),
        /budgetUsd/,
      ],
      ['no scope', () => compileRegulatedProfile({ ...BASE(), run: { budgetUsd: 5 } }), /scope/],
      [
        'segment ceilings',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            run: { ...BASE().run, budgetPolicy: 'segment' },
          }),
        /budgetPolicy/,
      ],
      [
        'loose acceptance reserve',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            orchestrate: { budget: { acceptanceReserve: 'warn' } },
          }),
        /acceptanceReserve/,
      ],
      [
        'missing citation audit',
        () => compileRegulatedProfile({ ...BASE(), orchestrate: {} }),
        /citationAudit/,
      ],
      [
        'observed coverage',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            orchestrate: {
              citationAudit: { resolve: RESOLVE },
              claimConsistency: { stage: 'final', coveragePolicy: 'observed' },
            },
          }),
        /coveragePolicy/,
      ],
      [
        'attestation-less tools profile',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            engine: {
              ...BASE().engine,
              defaults: {
                routing: { loop: 'fake:model' },
                profiles: { digger: { description: 'digs', tools: [] } },
              },
            },
          }),
        /toolsetAttestation/,
      ],
    ];
    for (const [label, thunk, pattern] of cases) {
      expect(thunk, label).toThrow(ConfigError);
      expect(thunk, label).toThrow(pattern);
    }
  });

  it('the hash is stable for one posture and moves with it', () => {
    const first = compileRegulatedProfile(BASE());
    const second = compileRegulatedProfile(BASE());
    expect(second.profileHash).toBe(first.profileHash);
    const moved = compileRegulatedProfile({
      ...BASE(),
      run: { ...BASE().run, budgetUsd: 6 },
    });
    expect(moved.profileHash).not.toBe(first.profileHash);
  });

  it('the compiled options run: the fingerprint records at genesis and asserts on resume', async () => {
    const compiled = compileRegulatedProfile(BASE());
    const engine = createEngine(compiled.engine);
    const wf = defineWorkflow({ name: 'regulated-smoke' }, async (ctx) => ctx.agent('one'));
    const outcome = await engine.run(wf, undefined, {
      ...compiled.run,
      runId: 'REG-SMOKE',
    }).result;
    expect(outcome.status).toBe('ok');
  });
});
