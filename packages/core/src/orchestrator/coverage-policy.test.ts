/**
 * The strict final coverage policy (RV4003, the fifth comparison
 * experiment): the run's claim pass covered 54 of 74 citing sentences,
 * graded itself 'partial' honestly, met its own declared 0.72 target,
 * and the run still shipped three unsupported citations inside exactly
 * the uncovered fraction. The grade was a report and nothing could
 * make it a gate: `coveragePolicy: 'strict-final'` refuses acceptance
 * typed on any final grade but 'full', unless a named waiver stands,
 * and the waiver is journaled beside the acceptance it licensed.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow, type OrchestrateOptions } from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one span' } };

const POOL_READING = 'A failed audit write does not mask success (`src/exec.ts:256-296`).';
// Two citing sentences; the pool holds a reading for exactly one
// anchor, so the FINAL grade is an honest 'partial' (covered 1 of 2).
const FINAL_PARTIAL =
  'final: an audit-write failure does not mask success [src/exec.ts:256-296]. ' +
  'final: the retry ladder caps at three attempts [src/retry.ts:24].';
const FINAL_COVERED = 'final: an audit-write failure does not mask success [src/exec.ts:256-296].';
const FINAL_VACUOUS = 'final: nothing cited here at all.';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
      }
    }
  }
  return handles;
}

function strictHarness(finalText: string) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: POOL_READING };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read the span' } },
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
  });
  const judge = scriptedAdapter(
    (): ScriptedTurn => ({ text: JSON.stringify({ contradictions: [] }) }),
    { id: 'judge' },
  );
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: finalText } } }),
    { id: 'strong' },
  );
  const { internals, store } = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { internals, store };
}

const STRICT_OPTS = {
  acceptance: { childPolicy: 'all-ok' as const },
  synthesis: {},
  claimConsistency: {
    judge: { model: 'judge:model' as const },
    stage: 'final' as const,
    coveragePolicy: 'strict-final' as const,
  },
};

describe('coveragePolicy intake (RV4003)', () => {
  it.each([
    [
      { claimConsistency: { coveragePolicy: 'harsh' as unknown as 'observed' } },
      /coveragePolicy must be 'observed' or 'strict-final'; got "harsh"/,
    ],
    [
      { claimConsistency: { coveragePolicy: 'strict-final' as const } },
      /coveragePolicy 'strict-final' needs stage 'final' or 'both'/,
    ],
    [
      { claimConsistency: { waiver: { principal: 'ops', reason: 'known gap' } } },
      /waiver requires coveragePolicy 'strict-final'/,
    ],
    [
      {
        synthesis: {},
        claimConsistency: {
          stage: 'final' as const,
          coveragePolicy: 'strict-final' as const,
          waiver: { principal: '', reason: 'known gap' },
        },
      },
      /waiver\.principal must be a non empty string/,
    ],
    [
      {
        synthesis: {},
        claimConsistency: {
          stage: 'final' as const,
          coveragePolicy: 'strict-final' as const,
          waiver: { principal: 'ops', reason: '' },
        },
      },
      /waiver\.reason must be a non empty string/,
    ],
    [
      {
        synthesis: {},
        claimConsistency: {
          stage: 'final' as const,
          coveragePolicy: 'strict-final' as const,
          waiver: { principal: 'ops', reason: 'gap', expiresAt: 'yesterday-ish' },
        },
      },
      /waiver\.expiresAt must be an ISO 8601 date string/,
    ],
  ] as Array<[OrchestrateOptions, RegExp]>)('refuses %j at construction', (opts, message) => {
    expect(() => makeOrchestratorWorkflow('the goal', opts)).toThrow(ConfigError);
    expect(() => makeOrchestratorWorkflow('the goal', opts)).toThrow(message);
  });
});

describe("coveragePolicy 'strict-final' (RV4003)", () => {
  it("the default 'observed' keeps a partial grade a report: the run settles ok", async () => {
    const { internals } = strictHarness(FINAL_PARTIAL);
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_OPTS,
        claimConsistency: {
          judge: { model: 'judge:model' as const },
          stage: 'final' as const,
        },
      }),
      undefined,
    )) as { claimConsistencyMeta?: { coverage?: string }; claimCoverageWaiver?: unknown };
    expect(outcome.claimConsistencyMeta?.coverage).toBe('partial');
    expect('claimCoverageWaiver' in outcome).toBe(false);
  });

  it('a partial final grade under strict refuses acceptance typed', async () => {
    const { internals } = strictHarness(FINAL_PARTIAL);
    await expect(
      executeWorkflow(
        internals,
        makeOrchestratorWorkflow('audit the executor', STRICT_OPTS),
        undefined,
      ),
    ).rejects.toMatchObject({
      data: {
        source: 'orchestrator_claim_consistency',
        coveragePolicy: 'strict-final',
        coverage: 'partial',
      },
    });
  });

  it('a vacuous final grade under strict refuses too: a zero denominator is not full', async () => {
    const { internals } = strictHarness(FINAL_VACUOUS);
    await expect(
      executeWorkflow(
        internals,
        makeOrchestratorWorkflow('audit the executor', STRICT_OPTS),
        undefined,
      ),
    ).rejects.toMatchObject({
      data: { coveragePolicy: 'strict-final', coverage: 'vacuous' },
    });
  });

  it("a 'full' final grade passes with nothing waived", async () => {
    const { internals } = strictHarness(FINAL_COVERED);
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', STRICT_OPTS),
      undefined,
    )) as { claimConsistencyMeta?: { coverage?: string }; claimCoverageWaiver?: unknown };
    expect(outcome.claimConsistencyMeta?.coverage).toBe('full');
    expect('claimCoverageWaiver' in outcome).toBe(false);
  });

  it('the declared waiver licenses the partial acceptance and journals it verbatim', async () => {
    const { internals, store } = strictHarness(FINAL_PARTIAL);
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('audit the executor', {
        ...STRICT_OPTS,
        claimConsistency: {
          ...STRICT_OPTS.claimConsistency,
          waiver: {
            principal: 'release-owner',
            reason: 'the uncovered anchors are legacy paths scheduled for removal',
            expiresAt: '2100-01-01T00:00:00.000Z',
          },
        },
      }),
      undefined,
    )) as {
      claimConsistencyMeta?: { coverage?: string };
      claimCoverageWaiver?: {
        principal?: string;
        reason?: string;
        expiresAt?: string;
        coverage?: string;
      };
    };
    expect(outcome.claimConsistencyMeta?.coverage).toBe('partial');
    expect(outcome.claimCoverageWaiver).toEqual({
      principal: 'release-owner',
      reason: 'the uncovered anchors are legacy paths scheduled for removal',
      expiresAt: '2100-01-01T00:00:00.000Z',
      coverage: 'partial',
    });
    const entries = await store.load(internals.runId);
    const waived = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'claim_coverage_waived',
    );
    expect(waived).toBeDefined();
    expect(waived?.value).toMatchObject({
      principal: 'release-owner',
      coverage: 'partial',
    });
  });

  it('an expired waiver refuses exactly like no waiver, naming the expiry', async () => {
    const { internals } = strictHarness(FINAL_PARTIAL);
    await expect(
      executeWorkflow(
        internals,
        makeOrchestratorWorkflow('audit the executor', {
          ...STRICT_OPTS,
          claimConsistency: {
            ...STRICT_OPTS.claimConsistency,
            waiver: {
              principal: 'release-owner',
              reason: 'a waiver from another era',
              expiresAt: '2000-01-01T00:00:00.000Z',
            },
          },
        }),
        undefined,
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining('expired at 2000-01-01T00:00:00.000Z') as unknown,
      data: { coveragePolicy: 'strict-final', coverage: 'partial' },
    });
  });
});
