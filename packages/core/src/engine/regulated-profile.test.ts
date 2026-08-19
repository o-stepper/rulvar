/**
 * The regulated run profile (RV4009): one call composes every
 * assurance posture this codebase grew across the comparison arcs,
 * refuses any loosening typed, and pins the enforced posture behind a
 * hash the existing genesis/resume machinery records and asserts.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ChatRequest } from '../l0/messages.js';
import type { RegulatedPostureDescriptor } from '../l0/spi/regulated-posture.js';
import type { ToolSource } from '../l0/spi/toolsource.js';
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
    expect(compiled.run.configFingerprint).toMatch(/^regulated:2:[0-9a-f]{64}$/);
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
        'missing claim consistency',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            orchestrate: { citationAudit: { resolve: RESOLVE } },
          }),
        /claimConsistency must be declared with stage 'final' or 'both'/,
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

describe('the construction posture attestation (RV4101)', () => {
  const tightSource = (name: string): ToolSource => ({
    id: name,
    tools: () => Promise.resolve([]),
    describeRegulatedPosture: () => ({
      regulatedPosture: 1,
      kind: 'mcp-source',
      name,
      drift: 'refuse',
      bounds: {
        declared: true,
        maxTools: 16,
        maxPages: 4,
        maxSchemaBytes: 65536,
        discoveryMs: 5000,
      },
    }),
  });
  const plainSource = (name: string): ToolSource => ({
    id: name,
    tools: () => Promise.resolve([]),
  });
  const withToolsets = (
    toolsets: Record<string, ToolSource[]>,
  ): { engine: CreateEngineOptions; run: RunOptions } => ({
    ...BASE(),
    engine: {
      ...BASE().engine,
      defaults: { routing: { loop: 'fake:model' }, toolsets },
    },
  });

  it('a tightened source compiles and moves the hash; a renamed one moves it again', () => {
    const bare = compileRegulatedProfile(BASE());
    const one = compileRegulatedProfile(withToolsets({ research: [tightSource('mcp:inprocess')] }));
    const renamed = compileRegulatedProfile(
      withToolsets({ research: [tightSource('mcp:http:x')] }),
    );
    expect(one.profileHash).not.toBe(bare.profileHash);
    expect(renamed.profileHash).not.toBe(one.profileHash);
  });

  it('a construction that attests nothing still moves the hash: the blind spot is counted', () => {
    const bare = compileRegulatedProfile(BASE());
    const counted = compileRegulatedProfile(withToolsets({ research: [plainSource('opaque')] }));
    expect(counted.profileHash).not.toBe(bare.profileHash);
  });

  it('one source reached through two toolsets is walked once', () => {
    const source = tightSource('mcp:inprocess');
    const twice = compileRegulatedProfile(withToolsets({ a: [source], b: [source] }));
    const once = compileRegulatedProfile(withToolsets({ a: [source] }));
    expect(twice.profileHash).toBe(once.profileHash);
  });

  it('descriptor field order cannot move the hash', () => {
    const reversed: ToolSource = {
      id: 'mcp:inprocess',
      tools: () => Promise.resolve([]),
      describeRegulatedPosture: () => ({
        bounds: {
          discoveryMs: 5000,
          maxSchemaBytes: 65536,
          maxPages: 4,
          maxTools: 16,
          declared: true,
        },
        drift: 'refuse',
        name: 'mcp:inprocess',
        kind: 'mcp-source',
        regulatedPosture: 1,
      }),
    };
    expect(compileRegulatedProfile(withToolsets({ r: [reversed] })).profileHash).toBe(
      compileRegulatedProfile(withToolsets({ r: [tightSource('mcp:inprocess')] })).profileHash,
    );
  });

  it('a deny bridge among the adapters compiles and enters the hash', () => {
    const denyBridge = {
      ...scriptedAdapter(() => ({ text: 'x' }), { id: 'bridged' }),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'ai-sdk-bridge',
        name: 'bridged',
        providerExecutedTools: 'deny',
      }),
    };
    const augmented = compileRegulatedProfile({
      ...BASE(),
      engine: { ...BASE().engine, adapters: [...BASE().engine.adapters, denyBridge] },
    });
    expect(augmented.profileHash).not.toBe(compileRegulatedProfile(BASE()).profileHash);
  });

  it('refuses every loosened construction posture typed, naming the field', () => {
    const sourceWith = (descriptor: unknown): ToolSource =>
      ({
        id: 'loose',
        tools: () => Promise.resolve([]),
        describeRegulatedPosture: () => descriptor,
      }) as unknown as ToolSource;
    const cases: Array<[string, () => unknown, RegExp]> = [
      [
        'rekey drift',
        () =>
          compileRegulatedProfile(
            withToolsets({
              r: [
                sourceWith({
                  regulatedPosture: 1,
                  kind: 'mcp-source',
                  name: 'mcp:inprocess',
                  drift: 'rekey',
                  bounds: { declared: true },
                }),
              ],
            }),
          ),
        /construction\['mcp:inprocess'\]\.drift must be 'refuse'/,
      ],
      [
        'undeclared bounds',
        () =>
          compileRegulatedProfile(
            withToolsets({
              r: [
                sourceWith({
                  regulatedPosture: 1,
                  kind: 'mcp-source',
                  name: 'mcp:inprocess',
                  drift: 'refuse',
                  bounds: { declared: false },
                }),
              ],
            }),
          ),
        /construction\['mcp:inprocess'\]\.bounds must declare every discovery bound/,
      ],
      [
        'allow bridge',
        () =>
          compileRegulatedProfile({
            ...BASE(),
            engine: {
              ...BASE().engine,
              adapters: [
                ...BASE().engine.adapters,
                {
                  ...scriptedAdapter(() => ({ text: 'x' }), { id: 'bridged' }),
                  describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
                    regulatedPosture: 1,
                    kind: 'ai-sdk-bridge',
                    name: 'bridged',
                    providerExecutedTools: 'allow',
                  }),
                },
              ],
            },
          }),
        /construction\['bridged'\]\.providerExecutedTools must be 'deny'/,
      ],
      [
        'unknown kind',
        () =>
          compileRegulatedProfile(
            withToolsets({
              r: [sourceWith({ regulatedPosture: 1, kind: 'quantum', name: 'q' })],
            }),
          ),
        /attests an unrecognized kind 'quantum'/,
      ],
      [
        'malformed descriptor',
        () => compileRegulatedProfile(withToolsets({ r: [sourceWith({ shrug: true })] })),
        /unrecognized shape/,
      ],
    ];
    for (const [label, thunk, pattern] of cases) {
      expect(thunk, label).toThrow(ConfigError);
      expect(thunk, label).toThrow(pattern);
    }
  });
});

describe('the use-time posture re-assertion (RV4102)', () => {
  interface MutableSource extends ToolSource {
    posture: { drift: 'rekey' | 'refuse'; name: string };
  }
  const mutableSource = (): MutableSource => {
    const posture = { drift: 'refuse' as 'rekey' | 'refuse', name: 'mcp:inprocess' };
    return {
      id: 'mutable',
      posture,
      tools: () => Promise.resolve([]),
      describeRegulatedPosture: () => ({
        regulatedPosture: 1,
        kind: 'mcp-source',
        name: posture.name,
        drift: posture.drift,
        bounds: {
          declared: true,
          maxTools: 8,
          maxPages: 2,
          maxSchemaBytes: 65536,
          discoveryMs: 1000,
        },
      }),
    };
  };
  const withToolsets = (
    toolsets: Record<string, ToolSource[]>,
  ): { engine: CreateEngineOptions; run: RunOptions } => ({
    ...BASE(),
    engine: {
      ...BASE().engine,
      defaults: { routing: { loop: 'fake:model' }, toolsets },
    },
  });
  const compiledSourceOf = (compiled: { engine: CreateEngineOptions }): ToolSource =>
    compiled.engine.defaults?.toolsets?.r?.[0] as ToolSource;

  it('an unmutated wrapped source serves tools; identity fields pass through', async () => {
    const source = mutableSource();
    const compiled = compileRegulatedProfile(withToolsets({ r: [source] }));
    const wrapped = compiledSourceOf(compiled);
    expect(wrapped).not.toBe(source);
    expect(wrapped.id).toBe('mutable');
    await expect(wrapped.tools({ runId: 'r' })).resolves.toEqual([]);
  });

  it('a posture loosened after compile refuses at the seam with the field-named error', () => {
    const source = mutableSource();
    const compiled = compileRegulatedProfile(withToolsets({ r: [source] }));
    source.posture.drift = 'rekey';
    expect(() => {
      void compiledSourceOf(compiled).tools({ runId: 'r' });
    }).toThrow(/construction\['mcp:inprocess'\]\.drift must be 'refuse'/);
  });

  it('a tightened but moved posture refuses naming the drift', () => {
    const source = mutableSource();
    const compiled = compileRegulatedProfile(withToolsets({ r: [source] }));
    source.posture.name = 'mcp:http:renamed';
    expect(() => {
      void compiledSourceOf(compiled).tools({ runId: 'r' });
    }).toThrow(/posture moved between compile time and tools\(\)/);
  });

  it('a vanished descriptor refuses too', () => {
    const source = mutableSource();
    const compiled = compileRegulatedProfile(withToolsets({ r: [source] }));
    delete (source as Partial<MutableSource>).describeRegulatedPosture;
    expect(() => {
      void compiledSourceOf(compiled).tools({ runId: 'r' });
    }).toThrow(/no describeRegulatedPosture\(\) at all/);
  });

  it('an adapter that flips to allow after compile refuses at stream()', () => {
    const seam = { providerExecutedTools: 'deny' as 'allow' | 'deny' };
    const adapter = {
      ...scriptedAdapter(() => ({ text: 'x' }), { id: 'bridged' }),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'ai-sdk-bridge',
        name: 'bridged',
        providerExecutedTools: seam.providerExecutedTools,
      }),
    };
    const compiled = compileRegulatedProfile({
      ...BASE(),
      engine: { ...BASE().engine, adapters: [...BASE().engine.adapters, adapter] },
    });
    seam.providerExecutedTools = 'allow';
    const wrapped = compiled.engine.adapters.find((candidate) => candidate.id === 'bridged');
    expect(wrapped).toBeDefined();
    expect(() => wrapped?.stream({} as ChatRequest)).toThrow(
      /construction\['bridged'\]\.providerExecutedTools must be 'deny'/,
    );
  });

  it('the compiled options run through the wrapper: an honest construction is invisible', async () => {
    const adapter = {
      ...scriptedAdapter(() => ({ text: 'x' }), { id: 'bridged' }),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'ai-sdk-bridge',
        name: 'bridged',
        providerExecutedTools: 'deny',
      }),
    };
    const compiled = compileRegulatedProfile({
      engine: { adapters: [adapter], defaults: { routing: { loop: 'bridged:model' } } },
      run: { budgetUsd: 5, scope: { tenant: 'acme' } },
    });
    const engine = createEngine(compiled.engine);
    const wf = defineWorkflow({ name: 'reassert-smoke' }, async (ctx) => ctx.agent('one'));
    const outcome = await engine.run(wf, undefined, {
      ...compiled.run,
      runId: 'REASSERT-SMOKE',
    }).result;
    expect(outcome.status).toBe('ok');
  });
});
