import { describe, expect, it } from 'vitest';
import { ConfigError, createEngine, InMemoryStore } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import { RevisionGuards, type GuardVerdictValue } from './guards.js';
import { agentTypeOf, lastToolError, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

describe('RevisionGuards constructor validation (v1.34.0 review P2-3)', () => {
  it.each([Number.NaN, 0, -1, 1.5])('refuses droppedRevisionLimit %s', (limit) => {
    // Unvalidated, a NaN limit made `streak < limit` permanently false
    // and the dropped guard tripped on the FIRST landed revision.
    expect(() => new RevisionGuards({ droppedRevisionLimit: limit })).toThrow(ConfigError);
    expect(() => new RevisionGuards({ droppedRevisionLimit: limit })).toThrow(
      /droppedRevisionLimit must be a positive integer/,
    );
  });

  it.each([Number.NaN, 0, 1.5])('refuses maxOscillationsPerKey %s', (limit) => {
    expect(() => new RevisionGuards({ maxOscillationsPerKey: limit })).toThrow(
      /maxOscillationsPerKey must be a positive integer/,
    );
  });

  it.each([Number.NaN, -1, 1.5])('refuses stallReplanCap %s', (cap) => {
    // Unvalidated, a NaN cap made `stallReplans !== cap + 1` permanently
    // true and the stall guard never fired at all.
    expect(() => new RevisionGuards({ stallReplanCap: cap })).toThrow(
      /stallReplanCap must be a nonnegative integer/,
    );
  });

  it.each([Number.NaN, 0, 1.2])('refuses maxAbandonedNetUsdFraction %s', (fraction) => {
    expect(() => new RevisionGuards({ maxAbandonedNetUsdFraction: fraction })).toThrow(
      /maxAbandonedNetUsdFraction must be a fraction in \(0, 1\]/,
    );
  });

  it('accepts the documented boundaries (stallReplanCap 0 means no stall replans)', () => {
    expect(
      () =>
        new RevisionGuards({
          droppedRevisionLimit: 1,
          maxOscillationsPerKey: 1,
          stallReplanCap: 0,
          maxAbandonedNetUsdFraction: 1,
        }),
    ).not.toThrow();
    const guards = new RevisionGuards({ stallReplanCap: 0 });
    expect(guards.onStallReplan()).toMatchObject({ guard: 'stall-replan-cap' });
  });
});

describe('RevisionGuards unit (docs/07, 3.8)', () => {
  it('fires the streak fallback exactly once at the limit', () => {
    const guards = new RevisionGuards({ droppedRevisionLimit: 3 });
    expect(guards.onRevisionLanded(1)).toBeUndefined();
    expect(guards.onRevisionLanded(2)).toBeUndefined();
    const verdict = guards.onRevisionLanded(3);
    expect(verdict).toMatchObject({
      guard: 'dropped-revision-streak',
      fallback: 'finish-with-partial',
      streak: 3,
    });
    expect(guards.onRevisionLanded(4)).toBeUndefined();
    expect(guards.revisionsRejected).toBe(true);
    expect(guards.planFrozen).toBe(true);
  });

  it('counts oscillations only after a sever and freezes at the limit', () => {
    const guards = new RevisionGuards();
    // A first add with no prior sever is not an oscillation.
    expect(guards.onReAdd('sig-a')).toBeUndefined();
    guards.onSevered('sig-a');
    expect(guards.onReAdd('sig-a')).toBeUndefined();
    guards.onSevered('sig-a');
    const verdict = guards.onReAdd('sig-a');
    expect(verdict).toMatchObject({
      guard: 'oscillation-freeze',
      fallback: 'freeze-key',
      approachSigCoarse: 'sig-a',
      oscillationCount: 2,
    });
    expect(guards.isFrozenSignature('sig-a')).toBe(true);
    // Distinct signatures stay independent (ACROSS LTID boundaries the
    // key is the coarse signature, never the lineage).
    expect(guards.isFrozenSignature('sig-b')).toBe(false);
  });

  it('rebuilds state from journaled verdicts (replay path)', () => {
    const guards = new RevisionGuards();
    guards.absorbVerdict({
      decisionType: 'guard-verdict',
      guard: 'oscillation-freeze',
      fallback: 'freeze-key',
      approachSigCoarse: 'sig-x',
      oscillationCount: 2,
    });
    guards.absorbVerdict({
      decisionType: 'guard-verdict',
      guard: 'dropped-revision-streak',
      fallback: 'reject-revision',
      streak: 3,
    });
    expect(guards.isFrozenSignature('sig-x')).toBe(true);
    expect(guards.state.engaged).toBe('reject-revision');
    expect(guards.planFrozen).toBe(false);
    expect(guards.revisionsRejected).toBe(true);
  });

  it('caps stall replans per run', () => {
    const guards = new RevisionGuards({ stallReplanCap: 2 });
    expect(guards.onStallReplan()).toBeUndefined();
    expect(guards.onStallReplan()).toBeUndefined();
    const verdict = guards.onStallReplan();
    expect(verdict).toMatchObject({ guard: 'stall-replan-cap', stallReplans: 2 });
    expect(guards.stallReplanExhausted).toBe(true);
  });
});

const EMPTY_PLAN_HASH = planHash(emptyPlan());
const DANGLING = 'Z'.repeat(26);

describe('RevisionGuards integration (bad-base-streak-terminates shape)', () => {
  it('journals ONE guard verdict at the limit and rejects further revisions', async () => {
    let phase = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'never spawned' };
      }
      phase += 1;
      if (phase <= 3) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: 'f'.repeat(64) },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'hallucinated' } }],
              rationale: `fabricated base ${String(phase)}`,
            },
          },
        };
      }
      if (phase === 4) {
        // The fourth revision is rejected by the engaged guard; the
        // model sees the typed tool error and finishes with a partial.
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'after freeze' } }],
              rationale: 'should be rejected',
            },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: { partial: true } } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'worker' } },
      },
    });
    const handle = orchestratePlanned(engine, 'streak test', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ partial: true });

    const entries = await store.load(handle.runId);
    const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
    // Exactly three journaled bad-base revisions: the fourth was rejected
    // by the engaged guard BEFORE journaling (and before debiting).
    expect(revisions).toHaveLength(3);
    const verdicts = entries.filter((entry) => {
      const value = entry.value as Partial<GuardVerdictValue> | undefined;
      return entry.kind === 'decision' && value?.decisionType === 'guard-verdict';
    });
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]?.value).toMatchObject({
      guard: 'dropped-revision-streak',
      fallback: 'finish-with-partial',
      streak: 3,
    });
    // The verdict entry precedes the rejection the model saw.
    const errorReq = adapter.calls.find((req) => lastToolError(req)?.includes('guards engaged'));
    expect(errorReq).toBeDefined();
  });
});

describe('oscillation detector integration (oscillation-freeze shape)', () => {
  it('freezes re-adds of a severed coarse signature at the limit', async () => {
    let phase = 0;
    const nodeIds: string[] = [];
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'worker done' };
      }
      phase += 1;
      const reviseArgs = (ops: unknown[], rationale: string): ScriptedTurn => ({
        toolCall: {
          name: 'plan_revise',
          args: { base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH }, ops, rationale },
        },
      });
      const recordAssigned = (): void => {
        for (const msg of req.messages) {
          for (const part of msg.parts) {
            if (part.type === 'tool-result') {
              const value = part.result as { assignedNodeIds?: Record<string, string> };
              const assigned = value?.assignedNodeIds?.['0'] ?? value?.assignedNodeIds?.[0];
              if (assigned !== undefined && !nodeIds.includes(assigned)) {
                nodeIds.push(assigned);
              }
            }
          }
        }
      };
      recordAssigned();
      if (phase === 1) {
        return reviseArgs(
          [
            {
              op: 'add_task',
              spec: { agentType: 'worker', prompt: 'attempt one' },
              deps: [DANGLING],
            },
          ],
          'add first',
        );
      }
      if (phase === 2) {
        return reviseArgs([{ op: 'cancel_task', nodeId: nodeIds[0] }], 'cancel first');
      }
      if (phase === 3) {
        return reviseArgs(
          [
            {
              op: 'add_task',
              spec: { agentType: 'worker', prompt: 'attempt two' },
              deps: [DANGLING],
            },
          ],
          'oscillation one',
        );
      }
      if (phase === 4) {
        return reviseArgs([{ op: 'cancel_task', nodeId: nodeIds[1] }], 'cancel second');
      }
      if (phase === 5) {
        // The second re-add reaches maxOscillationsPerKey (2): frozen.
        return reviseArgs(
          [
            {
              op: 'add_task',
              spec: { agentType: 'worker', prompt: 'attempt three' },
              deps: [DANGLING],
            },
          ],
          'oscillation two: freezes',
        );
      }
      if (phase === 6) {
        // A further re-add of the frozen signature drops admission_denied
        // with the embedded osc_guard verdict.
        return reviseArgs(
          [
            {
              op: 'add_task',
              spec: { agentType: 'worker', prompt: 'attempt four' },
              deps: [DANGLING],
            },
          ],
          'after freeze',
        );
      }
      return { toolCall: { name: 'finish', args: { result: 'frozen' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'worker' } },
      },
    });
    const handle = orchestratePlanned(engine, 'oscillation test', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const verdicts = entries.filter((entry) => {
      const value = entry.value as Partial<GuardVerdictValue> | undefined;
      return (
        entry.kind === 'decision' &&
        value?.decisionType === 'guard-verdict' &&
        value.guard === 'oscillation-freeze'
      );
    });
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]?.value).toMatchObject({ oscillationCount: 2 });

    // The post-freeze add dropped with the embedded osc_guard rejection.
    const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
    const last = revisions.at(-1)?.value as {
      outcomes: Array<{ kind: string; reason?: string }>;
      admissions: Array<{ decision: { verdict: { kind: string; reason?: { code: string } } } }>;
    };
    expect(last.outcomes[0]).toMatchObject({ kind: 'dropped', reason: 'admission_denied' });
    expect(last.admissions[0]?.decision.verdict.reason?.code).toBe('osc_guard');
    // The freeze verdict entry precedes the post-freeze revision entry.
    expect(verdicts[0].seq).toBeLessThan(revisions.at(-1)!.seq);
  });
});
