/**
 * The regulated run profile (RV4009): one call composes every
 * assurance posture this codebase grew across the comparison arcs,
 * refuses any loosening typed, and pins the enforced posture behind a
 * hash the existing genesis/resume machinery records and asserts.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ChatRequest } from '../l0/messages.js';
import type { OrchestrateOptions } from '../orchestrator/orchestrate.js';
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
    expect(compiled.run.configFingerprint).toMatch(/^regulated:3:[0-9a-f]{64}$/);
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

describe('the compile intake edges (RV4107)', () => {
  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['zero', 0],
    ['negative', -5],
  ])('refuses a %s budget ceiling typed', (_label, budgetUsd) => {
    expect(() =>
      compileRegulatedProfile({ ...BASE(), run: { budgetUsd, scope: { tenant: 'acme' } } }),
    ).toThrow(/positive finite USD ceiling/);
  });

  it('hashes the normalized scope, and a junk field refuses by name since RV4205', () => {
    const clean = compileRegulatedProfile(BASE());
    expect(clean.run.scope).toEqual({ tenant: 'acme' });
    expect(clean.profileHash).toMatch(/^[0-9a-f]{64}$/);
    // RV4107 dropped the junk so it could not move the hash; RV4205
    // strengthens the same intent into a refusal: a dimension the
    // engine cannot record refuses by name, so the question of it
    // moving the hash no longer arises.
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        run: {
          budgetUsd: 5,
          scope: { tenant: 'acme', junk: 'x' } as unknown as RunOptions['scope'],
        },
      }),
    ).toThrow(/junk is not a scope dimension/);
  });

  it('an empty scope refuses at compile time, not at run intake', () => {
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        run: { budgetUsd: 5, scope: {} },
      }),
    ).toThrow(/at least one of tenant, account, project/);
  });

  it('a resolver that is not a function refuses at compile time', () => {
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        orchestrate: {
          citationAudit: { resolve: 'nope' } as unknown as OrchestrateOptions['citationAudit'],
          claimConsistency: { judge: { model: 'judge:model' }, stage: 'final' },
        },
      }),
    ).toThrow(/citationAudit\.resolve/);
  });
});

describe('the regulated semantic acceptance (RV4201)', () => {
  const ORCH = (): OrchestrateOptions => ({
    citationAudit: { resolve: RESOLVE },
    claimConsistency: { judge: { model: 'judge:model' }, stage: 'final' },
  });

  it("fills the fail-closed pair and the declaration: onFound 'fail' twice, waiver 'forbid'", () => {
    const compiled = compileRegulatedProfile({ ...BASE(), orchestrate: ORCH() });
    expect(compiled.orchestrate?.claimConsistency?.onFound).toBe('fail');
    expect(compiled.orchestrate?.citationAudit?.onFound).toBe('fail');
    expect(compiled.orchestrate?.semanticAcceptance).toEqual({
      judgedStage: 'final',
      claimCoverage: 'full',
      contradictions: 'fail',
      citations: 'fail',
      unresolved: 'fail',
      waiver: 'forbid',
    });
  });

  it("licenses the armed repair: coverageRepair fills true, the declaration says 'repair-once-then-fail'", () => {
    const compiled = compileRegulatedProfile({
      ...BASE(),
      orchestrate: {
        synthesis: {},
        citationAudit: { resolve: RESOLVE, onFound: 'repair' },
        claimConsistency: { judge: { model: 'judge:model' }, stage: 'final', onFound: 'repair' },
      },
    });
    expect(compiled.orchestrate?.claimConsistency?.coverageRepair).toBe(true);
    expect(compiled.orchestrate?.semanticAcceptance).toMatchObject({
      contradictions: 'repair-once-then-fail',
      citations: 'repair-once-then-fail',
      waiver: 'forbid',
    });
  });

  it('refuses every observing or unsatisfiable semantic posture, naming the field', () => {
    const cases: Array<[string, OrchestrateOptions, RegExp]> = [
      [
        'claim report',
        { ...ORCH(), claimConsistency: { ...ORCH().claimConsistency, onFound: 'report' } },
        /claimConsistency\.onFound must be 'repair' or 'fail' \(RV4201\)/,
      ],
      [
        'claim carry',
        {
          ...ORCH(),
          synthesis: {},
          claimConsistency: { ...ORCH().claimConsistency, stage: 'both', onFound: 'carry' },
        },
        /claimConsistency\.onFound must be 'repair' or 'fail' \(RV4201\)/,
      ],
      [
        'audit report',
        { ...ORCH(), citationAudit: { resolve: RESOLVE, onFound: 'report' } },
        /citationAudit\.onFound must be 'repair' or 'fail' \(RV4201\)/,
      ],
      [
        'a coverage target below 1',
        {
          ...ORCH(),
          claimConsistency: { ...ORCH().claimConsistency, coverageTarget: 0.72 },
        },
        /coverageTarget must be 1 or absent \(RV4201\)/,
      ],
      [
        'coverageRepair disarmed beside repair',
        {
          ...ORCH(),
          synthesis: {},
          claimConsistency: {
            ...ORCH().claimConsistency,
            onFound: 'repair',
            coverageRepair: false,
          },
        },
        /coverageRepair must not be false/,
      ],
      [
        'a standing waiver',
        {
          ...ORCH(),
          claimConsistency: {
            ...ORCH().claimConsistency,
            waiver: { principal: 'ops', reason: 'known gap', expiresAt: '2100-01-01' },
          },
        },
        /standing waiver \(RV4201\)/,
      ],
      [
        'a declaration that contradicts the compiled postures',
        {
          ...ORCH(),
          semanticAcceptance: {
            judgedStage: 'final',
            claimCoverage: 'full',
            contradictions: 'repair-once-then-fail',
            citations: 'fail',
            unresolved: 'fail',
            waiver: 'forbid',
          },
        },
        /semanticAcceptance\.contradictions must be 'fail'/,
      ],
      [
        'a pinned waiver with no declared principal',
        {
          ...ORCH(),
          semanticAcceptance: {
            judgedStage: 'final',
            claimCoverage: 'full',
            contradictions: 'fail',
            citations: 'fail',
            unresolved: 'fail',
            waiver: { judgedHash: 'a'.repeat(64) },
          },
        },
        /must be declared beside the pinned semanticAcceptance\.waiver/,
      ],
    ];
    for (const [label, orchestrate, pattern] of cases) {
      const thunk = (): unknown => compileRegulatedProfile({ ...BASE(), orchestrate });
      expect(thunk, label).toThrow(ConfigError);
      expect(thunk, label).toThrow(pattern);
    }
  });

  it('the posture map hashes the findings postures: fail closed and repair armed differ (RV4203)', () => {
    const failClosed = compileRegulatedProfile({ ...BASE(), orchestrate: ORCH() });
    const repairArmed = compileRegulatedProfile({
      ...BASE(),
      orchestrate: {
        synthesis: {},
        citationAudit: { resolve: RESOLVE, onFound: 'repair' },
        claimConsistency: { judge: { model: 'judge:model' }, stage: 'final', onFound: 'repair' },
      },
    });
    expect(repairArmed.profileHash).not.toBe(failClosed.profileHash);
    expect(failClosed.run.configFingerprint).toMatch(/^regulated:3:/);
  });

  it('the waiver terms move the hash: forbid, a pin, and a different pin are three postures (RV4203)', () => {
    const forbid = compileRegulatedProfile({ ...BASE(), orchestrate: ORCH() });
    const pinned = (hash: string) =>
      compileRegulatedProfile({
        ...BASE(),
        orchestrate: {
          ...ORCH(),
          claimConsistency: {
            ...ORCH().claimConsistency,
            waiver: { principal: 'release-owner', reason: 'reviewed dossier' },
          },
          semanticAcceptance: {
            judgedStage: 'final',
            claimCoverage: 'full',
            contradictions: 'fail',
            citations: 'fail',
            unresolved: 'fail',
            waiver: { judgedHash: hash },
          },
        },
      });
    const pinnedA = pinned('a'.repeat(64));
    const pinnedB = pinned('b'.repeat(64));
    expect(pinnedA.profileHash).not.toBe(forbid.profileHash);
    expect(pinnedB.profileHash).not.toBe(pinnedA.profileHash);
  });

  it('the audit sampling and judge parameters move the hash (RV4203)', () => {
    const base = compileRegulatedProfile({ ...BASE(), orchestrate: ORCH() });
    const widerSample = compileRegulatedProfile({
      ...BASE(),
      orchestrate: { ...ORCH(), citationAudit: { resolve: RESOLVE, samplePerSection: 4 } },
    });
    const otherJudge = compileRegulatedProfile({
      ...BASE(),
      orchestrate: {
        ...ORCH(),
        citationAudit: { resolve: RESOLVE, judge: { model: 'stronger:model' } },
      },
    });
    expect(widerSample.profileHash).not.toBe(base.profileHash);
    expect(otherJudge.profileHash).not.toBe(base.profileHash);
    expect(otherJudge.profileHash).not.toBe(widerSample.profileHash);
  });

  it('the toolset pin is hashed, and a legacy contract-only pin refuses outright (RV4203/RV4204)', () => {
    const contractHash = 'c'.repeat(64);
    const withPin = (authorityHash?: string) => () =>
      compileRegulatedProfile({
        ...BASE(),
        engine: {
          ...BASE().engine,
          defaults: {
            routing: { loop: 'fake:model' },
            profiles: {
              digger: {
                description: 'digs',
                tools: [],
                toolsetAttestation: {
                  hash: contractHash,
                  ...(authorityHash === undefined ? {} : { authorityHash }),
                },
              },
            },
          },
        },
      });
    // The legacy pin passes authority drift silently by its own
    // documented posture, which the regulated floor refuses (RV4204).
    expect(withPin()).toThrow(ConfigError);
    expect(withPin()).toThrow(/legacy contract-only pin \(RV4204\)/);
    // Two full pins whose authority differs are two postures (RV4203).
    const authorityA = withPin('d'.repeat(64))();
    const authorityB = withPin('e'.repeat(64))();
    expect(authorityB.profileHash).not.toBe(authorityA.profileHash);
  });

  it('the attestation floor arms on the compiled defaults (RV4204)', () => {
    const compiled = compileRegulatedProfile(BASE());
    expect(compiled.engine.defaults?.requireToolsetAttestation).toBe(true);
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        engine: {
          ...BASE().engine,
          defaults: { routing: { loop: 'fake:model' }, requireToolsetAttestation: false },
        },
      }),
    ).toThrow(/requireToolsetAttestation/);
  });

  it('the pinned-hash waiver is the one exception the floor admits', () => {
    const compiled = compileRegulatedProfile({
      ...BASE(),
      orchestrate: {
        ...ORCH(),
        claimConsistency: {
          ...ORCH().claimConsistency,
          waiver: { principal: 'release-owner', reason: 'reviewed dossier 42' },
        },
        semanticAcceptance: {
          judgedStage: 'final',
          claimCoverage: 'full',
          contradictions: 'fail',
          citations: 'fail',
          unresolved: 'fail',
          waiver: { judgedHash: 'a'.repeat(64) },
        },
      },
    });
    expect(compiled.orchestrate?.semanticAcceptance?.waiver).toEqual({
      judgedHash: 'a'.repeat(64),
    });
    expect(compiled.orchestrate?.claimConsistency?.waiver).toEqual({
      principal: 'release-owner',
      reason: 'reviewed dossier 42',
    });
  });
});

describe('the first-party construction descriptors (RV4204)', () => {
  const tightExecutor = (posture?: Partial<Record<string, unknown>>) => ({
    run: () => Promise.resolve(null),
    describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
      regulatedPosture: 1,
      kind: 'tool-executor',
      name: 'subprocess',
      ledger: true,
      allowEnv: ['PATH'],
      bounds: { timeoutMs: 30_000, maxOutputBytes: 1_048_576 },
      isolation: { flavor: 'subprocess', sandboxed: true },
      ...posture,
    }),
  });

  it('a model-adapter descriptor is judged, folded, and pins the egress', () => {
    const adapter = {
      ...scriptedAdapter(() => ({ text: 'x' })),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'model-adapter',
        name: 'anthropic',
        transport: 'custom-base-url',
        baseUrlOrigin: 'https://proxy.example.com',
        capsBound: { declared: true, maxPages: 4 },
      }),
    };
    const compiled = compileRegulatedProfile({
      ...BASE(),
      engine: { ...BASE().engine, adapters: [adapter] },
    });
    expect(compiled.profileHash).toMatch(/^[0-9a-f]{64}$/);
    const official = {
      ...scriptedAdapter(() => ({ text: 'x' })),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'model-adapter',
        name: 'anthropic',
        transport: 'official',
        capsBound: { declared: true, maxPages: 4 },
      }),
    };
    const moved = compileRegulatedProfile({
      ...BASE(),
      engine: { ...BASE().engine, adapters: [official] },
    });
    expect(moved.profileHash).not.toBe(compiled.profileHash);
  });

  it('a custom-base-url descriptor with no origin refuses: an egress the hash cannot pin', () => {
    const adapter = {
      ...scriptedAdapter(() => ({ text: 'x' })),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'model-adapter',
        name: 'anthropic',
        transport: 'custom-base-url',
      }),
    };
    expect(() =>
      compileRegulatedProfile({ ...BASE(), engine: { ...BASE().engine, adapters: [adapter] } }),
    ).toThrow(/baseUrlOrigin/);
  });

  it('the executor registry is walked: a ledgerless executor refuses by field name', () => {
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        engine: { ...BASE().engine, executors: { subprocess: tightExecutor({ ledger: false }) } },
      }),
    ).toThrow(/construction\['subprocess'\]\.ledger/);
    const compiled = compileRegulatedProfile({
      ...BASE(),
      engine: { ...BASE().engine, executors: { subprocess: tightExecutor() } },
    });
    expect(compiled.profileHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the compiled executor re-judges its posture at run() (RV4102 seam)', async () => {
    let ledgerArmed = true;
    let name = 'subprocess';
    const shifty = {
      run: () => Promise.resolve(null),
      describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
        regulatedPosture: 1,
        kind: 'tool-executor',
        name,
        ledger: ledgerArmed,
        allowEnv: [],
        bounds: { timeoutMs: 30_000, maxOutputBytes: 1_048_576 },
        isolation: { flavor: 'subprocess', sandboxed: false },
      }),
    };
    const compiled = compileRegulatedProfile({
      ...BASE(),
      engine: { ...BASE().engine, executors: { subprocess: shifty } },
    });
    const wrapped = compiled.engine.executors?.subprocess;
    // A LOOSENING refuses with the compile-time field-named error.
    ledgerArmed = false;
    await expect(
      Promise.resolve().then(() =>
        wrapped?.run({ tool: 't', args: {}, callId: 'c', runId: 'r' } as never),
      ),
    ).rejects.toThrow(/construction\['subprocess'\]\.ledger must be armed/);
    // Any other movement refuses naming the drift.
    ledgerArmed = true;
    name = 'renamed';
    await expect(
      Promise.resolve().then(() =>
        wrapped?.run({ tool: 't', args: {}, callId: 'c', runId: 'r' } as never),
      ),
    ).rejects.toThrow(/posture moved between compile time and run\(\)/);
  });

  it("'require-recognized' refuses a blind construction by name, and enters the hash", () => {
    expect(() =>
      compileRegulatedProfile({ ...BASE(), construction: 'require-recognized' }),
    ).toThrow(/attested nothing: fake/);
    const attestedOnly = compileRegulatedProfile({
      ...BASE(),
      engine: {
        adapters: [
          {
            ...scriptedAdapter(() => ({ text: 'x' })),
            describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
              regulatedPosture: 1,
              kind: 'model-adapter',
              name: 'fake',
              transport: 'official',
            }),
          },
        ],
        defaults: { routing: { loop: 'fake:model' } },
      },
      construction: 'require-recognized',
    });
    const counted = compileRegulatedProfile({
      ...BASE(),
      engine: {
        adapters: [
          {
            ...scriptedAdapter(() => ({ text: 'x' })),
            describeRegulatedPosture: (): RegulatedPostureDescriptor => ({
              regulatedPosture: 1,
              kind: 'model-adapter',
              name: 'fake',
              transport: 'official',
            }),
          },
        ],
        defaults: { routing: { loop: 'fake:model' } },
      },
    });
    expect(attestedOnly.profileHash).not.toBe(counted.profileHash);
  });
});

describe('the regulated scope policy (RV4205)', () => {
  it("fills 'reject', refuses an explicit 'drop', and refuses an unknown dimension at compile", () => {
    const compiled = compileRegulatedProfile(BASE());
    expect(compiled.run.scopePolicy).toEqual({ unknown: 'reject' });
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        run: { ...BASE().run, scopePolicy: { unknown: 'drop' } },
      }),
    ).toThrow(/scopePolicy\.unknown must be 'reject' \(RV4205\)/);
    expect(() =>
      compileRegulatedProfile({
        ...BASE(),
        run: { budgetUsd: 5, scope: { tenant: 'acme', platformTeam: 'core' } as object },
      }),
    ).toThrow(/platformTeam is not a scope dimension/);
  });

  it('the named dimensions compile, and the policy is part of the hashed posture', () => {
    const base = compileRegulatedProfile(BASE());
    const dimensional = compileRegulatedProfile({
      ...BASE(),
      run: {
        budgetUsd: 5,
        scope: { tenant: 'acme', region: 'eu-central-1', legalDomain: 'eu-gdpr' },
      },
    });
    expect(dimensional.profileHash).not.toBe(base.profileHash);
  });
});
