import { describe, expect, it } from 'vitest';
import {
  canonicalizeLadder,
  createEngine,
  InMemoryStore,
  makeOrchestratorWorkflow,
  tool,
} from '@lurker/core';
import type { JournalEntry, LadderSpec } from '@lurker/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';
import { clampStartTier, executingRungOf, ladderTriggerOf } from './ladder.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

const TWO_RUNGS: LadderSpec = {
  rungs: [
    { model: 'fake:cheap', effort: 'low', maxTurns: 1, maxTokens: 1000 },
    { model: 'fake:strong', effort: 'high', maxTurns: 4, maxTokens: 2000 },
  ],
  startTier: 0,
  escalateOn: ['limit'],
};

describe('ladder canonicalization (docs/04, section 12; FR-119)', () => {
  it('validates the declaration once: judge rungs, efforts, bounds', () => {
    // FR-119: an undeclared judge rung is a ConfigError.
    expect(() =>
      canonicalizeLadder({ ...TWO_RUNGS, acceptance: [{ kind: 'judge', rung: 5 }] }),
    ).toThrow(/judge rung 5/);
    // A declared judge rung resolves.
    const declared = canonicalizeLadder({ ...TWO_RUNGS, acceptance: [{ kind: 'judge', rung: 1 }] });
    expect(declared.rungs[1]?.model).toBe('fake:strong');
    // Every rung must resolve an explicit effort.
    expect(() =>
      canonicalizeLadder({
        rungs: [{ model: 'fake:x', maxTurns: 1, maxTokens: 10 }],
        startTier: 0,
        escalateOn: ['error'],
      }),
    ).toThrow(/resolves no effort/);
    // The chain effort fills absent rung efforts.
    expect(
      canonicalizeLadder(
        { rungs: [{ model: 'fake:x', maxTurns: 1, maxTokens: 10 }], startTier: 0, escalateOn: [] },
        { chainEffort: 'medium' },
      ).rungs[0]?.effort,
    ).toBe('medium');
    expect(() => canonicalizeLadder({ ...TWO_RUNGS, startTier: 2 })).toThrow(/startTier/);
    expect(() =>
      canonicalizeLadder({ ...TWO_RUNGS, acceptance: [{ kind: 'spot-check', fraction: 0 }] }),
    ).toThrow(/fraction/);
  });

  it('clamps the orchestrator hint and the executing rung', () => {
    const ladder = canonicalizeLadder(TWO_RUNGS);
    expect(clampStartTier(ladder, undefined)).toBe(0);
    expect(clampStartTier(ladder, 7)).toBe(1);
    expect(clampStartTier(ladder, -3)).toBe(0);
    expect(executingRungOf(ladder, 0, 0)).toBe(0);
    expect(executingRungOf(ladder, 0, 1)).toBe(1);
    // Strictly monotone, hard-clamped at the top: no demotions exist.
    expect(executingRungOf(ladder, 1, 5)).toBe(1);
  });

  it('classifies terminal statuses into the typed triggers', () => {
    expect(ladderTriggerOf({ status: 'error', error: { kind: 'schema-mismatch' } })).toBe(
      'schema-exhausted',
    );
    expect(ladderTriggerOf({ status: 'error', error: { kind: 'transport' } })).toBe('error');
    expect(ladderTriggerOf({ status: 'limit' })).toBe('limit');
    // The engine no-progress abort is FIRST-CLASS, never plain limit.
    expect(ladderTriggerOf({ status: 'limit', abortClass: 'no-progress' })).toBe('no-progress');
    expect(ladderTriggerOf({ status: 'cancelled' })).toBeUndefined();
    expect(ladderTriggerOf({ status: 'ok' })).toBeUndefined();
  });
});

/** The orchestrator script shared by the integration runs. */
function orchestratorScript(
  agentType: string,
): (req: import('@lurker/core').ChatRequest) => ScriptedTurn | undefined {
  let phase = 0;
  return (req) => {
    if (agentTypeOf(req) !== '') {
      return undefined;
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType, prompt: 'climb' } }],
            rationale: 'one climber',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'end' } } };
  };
}

function ladderVerdictsOf(entries: readonly JournalEntry[]): Array<Record<string, unknown>> {
  return entries
    .filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'ladder-verdict',
    )
    .map((entry) => entry.value as Record<string, unknown>);
}

function finalStatusOf(entries: readonly JournalEntry[]): string | undefined {
  let status: string | undefined;
  for (const entry of entries) {
    if (entry.kind !== 'plan.decision') {
      continue;
    }
    const ops = (entry.value as { ops?: Array<{ kind: string; to?: string }> }).ops ?? [];
    for (const op of ops) {
      if (op.kind === 'set_node_status' && op.to !== undefined) {
        status = op.to;
      }
    }
  }
  return status;
}

describe('ModelLadder integration (M7-T10)', () => {
  it('raises a rung on a declared trigger and finishes on the strong rung', async () => {
    const echo = tool({
      name: 'echo',
      description: 'echo',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => Promise.resolve('ok'),
    });
    const orchestrator = orchestratorScript('climber');
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      // Rung 1 (cheap): a tool call every turn hits the 1-turn rung cap
      // (trigger 'limit'). Rung 2 (strong): finishes with text.
      if (req.model === 'cheap') {
        return { toolCall: { name: 'echo', args: {} } };
      }
      return { text: 'strong done' };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          climber: { description: 'climbs', tools: [echo], model: { ladder: TWO_RUNGS } },
        },
      },
    });
    const handle = orchestratePlanned(engine, 'ladder run', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const verdicts = ladderVerdictsOf(entries);
    expect(verdicts).toHaveLength(1);
    const verdict = verdicts[0] as {
      trigger: string;
      raisesRung: boolean;
      rungIndexAfter: number;
      rungsRemainingAfter: number;
      nextAttempt?: { lineage?: { relation?: string }; rungIndex?: number };
      admissions?: Array<{ decision?: { verdict?: { spawnUnitsAfter?: number } } }>;
    };
    expect(verdict.trigger).toBe('limit');
    expect(verdict.raisesRung).toBe(true);
    expect(verdict.rungIndexAfter).toBe(1);
    expect(verdict.rungsRemainingAfter).toBe(0);
    // The rung retry continues the SAME logical task (docs/03, 10.1 row 4).
    expect(verdict.nextAttempt?.lineage?.relation).toBe('rung-retry');
    expect(verdict.nextAttempt?.rungIndex).toBe(1);
    // The rung RESPAWN debited a spawn unit through the embedded
    // admission (docs/07, 11.3 b): 128 - add_task - respawn = 126.
    expect(verdict.admissions?.[0]?.decision?.verdict?.spawnUnitsAfter).toBe(126);

    // Both rungs served: the cheap rung then the strong rung, with the
    // concrete per-rung models and efforts on the wire.
    const climberCalls = adapter.calls.filter((req) => agentTypeOf(req) === 'climber');
    expect(climberCalls.map((req) => req.model)).toEqual(['cheap', 'strong']);
    expect(climberCalls.map((req) => req.effort)).toEqual(['low', 'high']);
    expect(finalStatusOf(entries)).toBe('done');

    // Crash-resume on a FRESH engine over the same store: everything
    // forward matches with zero live calls and no duplicate entries
    // (completed rungs are never repaid; the half-escalated-ladder
    // shape's replay half).
    const resumedAdapter = scriptedAdapter(() => {
      throw new Error('resume must not go live');
    });
    const resumedEngine = createEngine({
      adapters: [resumedAdapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          climber: { description: 'climbs', tools: [echo], model: { ladder: TWO_RUNGS } },
        },
      },
    });
    const resumed = resumedEngine.resume(
      handle.runId,
      makeOrchestratorWorkflow('ladder run', { budget: { capUsd: 5 }, extension: planRunner({}) }),
    );
    const resumedOutcome = await resumed.result;
    expect(resumedOutcome.status).toBe('ok');
    expect(resumedAdapter.calls).toHaveLength(0);
    expect((await store.load(handle.runId)).length).toBe(entries.length);
  });

  it('fails closed when acceptance never passes and the ladder tops out', async () => {
    const ladder: LadderSpec = {
      ...TWO_RUNGS,
      escalateOn: ['verify-failed'],
      acceptance: [{ kind: 'mechanical', profile: 'has-artifacts' }],
    };
    const orchestrator = orchestratorScript('climber');
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      // Every rung finishes ok but produces NO artifacts.
      return { text: `attempt on ${req.model}` };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { climber: { description: 'climbs', model: { ladder } } },
        gates: {
          'has-artifacts': (artifacts) => ({
            pass: artifacts.length > 0,
            detail: 'artifact-grounded acceptance',
          }),
        },
      },
    });
    const handle = orchestratePlanned(engine, 'verify run', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const gateVerdicts = entries.filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'gate-verdict',
    );
    // One failing mechanical verdict per attempt, journaled BEFORE the
    // ladder decision (the fold consumes only journaled values).
    expect(gateVerdicts).toHaveLength(2);
    for (const entry of gateVerdicts) {
      expect((entry.value as { pass?: boolean }).pass).toBe(false);
    }
    const verdicts = ladderVerdictsOf(entries);
    expect(verdicts.map((value) => [value.raisesRung, value.reason ?? 'raise'])).toEqual([
      [true, 'raise'],
      [false, 'top_rung'],
    ]);
    // An ok attempt whose acceptance failed lands failed, never done.
    expect(finalStatusOf(entries)).toBe('failed');
  });

  it('journals the denial and takes the fallback path on a budget-denied rung', async () => {
    const echo = tool({
      name: 'echo',
      description: 'echo',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => Promise.resolve('ok'),
    });
    const orchestrator = orchestratorScript('climber');
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      return { toolCall: { name: 'echo', args: {} } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          climber: { description: 'climbs', tools: [echo], model: { ladder: TWO_RUNGS } },
        },
      },
    });
    // ONE spawn unit: the add_task admission consumes it; the rung
    // respawn is then denied by the frozen vector (docs/07, 11.3).
    const handle = orchestratePlanned(engine, 'denied run', {
      budget: { capUsd: 5 },
      plan: { limits: { maxTotalSpawns: 1 } },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const denied = entries.find((entry) => entry.kind === 'termination.denied');
    expect(denied).toBeDefined();
    expect((denied?.value as { resource?: string } | undefined)?.resource).toBe('spawnUnits');
    const verdicts = ladderVerdictsOf(entries);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]?.raisesRung).toBe(false);
    expect(verdicts[0]?.reason).toBe('respawn_denied');
    // The denial precedes the verdict: strictly before the typed
    // fallback surfaces (docs/07, 11.3).
    const verdictSeq = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'ladder-verdict',
    )?.seq;
    expect(denied?.seq).toBeLessThan(verdictSeq ?? -1);
    expect(finalStatusOf(entries)).toBe('failed');
  });

  it('spot-checks through the journaled draw and raises on a failing judge', async () => {
    const ladder: LadderSpec = {
      ...TWO_RUNGS,
      escalateOn: ['verify-failed'],
      acceptance: [{ kind: 'spot-check', fraction: 1 }],
    };
    const orchestrator = orchestratorScript('climber');
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      const prompt = JSON.stringify(req.messages);
      if (prompt.includes('acceptance judge')) {
        // The judge runs on the TOP rung and fails the cheap attempt,
        // passes the strong one.
        const pass = prompt.includes('attempt on strong');
        return { text: JSON.stringify({ pass, reason: pass ? 'good' : 'weak' }) };
      }
      return { text: `attempt on ${req.model}` };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { climber: { description: 'climbs', model: { ladder } } },
      },
    });
    const handle = orchestratePlanned(engine, 'spot run', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const gateVerdicts = entries
      .filter(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType === 'gate-verdict',
      )
      .map((entry) => entry.value as { pass: boolean; spotCheck?: { selected: boolean } });
    expect(gateVerdicts).toHaveLength(2);
    // fraction 1: every draw selects; the journaled draw rides the verdict.
    expect(gateVerdicts.every((value) => value.spotCheck?.selected === true)).toBe(true);
    expect(gateVerdicts.map((value) => value.pass)).toEqual([false, true]);
    // The judges served on the TOP rung model.
    const judgeCalls = adapter.calls.filter((req) =>
      JSON.stringify(req.messages).includes('acceptance judge'),
    );
    expect(judgeCalls).toHaveLength(2);
    expect(judgeCalls.every((req) => req.model === 'strong')).toBe(true);
    expect(finalStatusOf(entries)).toBe('done');
  });
});

describe('half-escalated ladder resume (M7-T10)', () => {
  it('continues the ACTIVE rung on resume without repaying completed rungs', async () => {
    const echo = tool({
      name: 'echo',
      description: 'echo',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => Promise.resolve('ok'),
    });
    const profiles = {
      climber: { description: 'climbs', tools: [echo], model: { ladder: TWO_RUNGS } },
    } as const;
    const orchestrator = orchestratorScript('climber');
    // Life 1: rung 1 hits its cap (completed, paid); rung 2 HANGS. The
    // crash is simulated by truncating the journal at the rung-2 dispatch
    // root: some rungs terminal, the active rung dangling mid-attempt
    // (the half-escalated-ladder cassette shape).
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      if (req.model === 'cheap') {
        return { toolCall: { name: 'echo', args: {} } };
      }
      return { hangUntilAborted: true };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles,
      },
    });
    const handle = orchestratePlanned(engine, 'half ladder', { budget: { capUsd: 5 } });
    for (;;) {
      if (adapter.calls.some((req) => req.model === 'strong')) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    // The strong rung is live on the wire: snapshot the crash prefix
    // BEFORE the graceful teardown writes anything further.
    const atCrash = await store.load(handle.runId);
    await handle.cancel('teardown');
    await handle.result;

    const verdictSeq = atCrash.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'ladder-verdict',
    )?.seq;
    expect(verdictSeq).toBeDefined();
    const rungTwoRoot = atCrash.find(
      (entry) =>
        entry.kind === 'agent' && entry.status === 'running' && entry.seq > (verdictSeq ?? 0),
    );
    expect(rungTwoRoot).toBeDefined();
    const crashStore = new InMemoryStore();
    for (const meta of await store.listRuns()) {
      if (meta.runId === handle.runId) {
        await crashStore.putMeta(meta);
      }
    }
    for (const entry of atCrash) {
      if (entry.seq <= (rungTwoRoot?.seq ?? 0)) {
        await crashStore.append(handle.runId, entry);
      }
    }
    const settledAttemptsOf = (list: readonly JournalEntry[]): number =>
      list.filter(
        (entry) =>
          entry.kind === 'agent' && entry.status !== 'running' && entry.scope.includes('plan/'),
      ).length;
    const cheapAttempts = settledAttemptsOf(atCrash);

    // Life 2: the DANGLING strong attempt redispatches live and
    // completes; the cheap rung is never re-paid and the raising verdict
    // never duplicates.
    const orchestrator2 = orchestratorScript('climber');
    const resumedAdapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator2(req);
      if (scripted !== undefined) {
        return scripted;
      }
      if (req.model === 'cheap') {
        throw new Error('the completed cheap rung must never be repaid');
      }
      return { text: 'strong done' };
    });
    const resumedEngine = createEngine({
      adapters: [resumedAdapter],
      stores: { journal: crashStore },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles,
      },
    });
    const resumed = resumedEngine.resume(
      handle.runId,
      makeOrchestratorWorkflow('half ladder', { budget: { capUsd: 5 }, extension: planRunner({}) }),
    );
    const outcome = await resumed.result;
    expect(outcome.status).toBe('ok');
    const entries = await crashStore.load(handle.runId);
    expect(ladderVerdictsOf(entries)).toHaveLength(1);
    expect(finalStatusOf(entries)).toBe('done');
    // The resumed life served ONLY the strong rung live.
    expect(resumedAdapter.calls.some((req) => req.model === 'cheap')).toBe(false);
    expect(resumedAdapter.calls.some((req) => req.model === 'strong')).toBe(true);
    // The completed cheap attempt kept its single terminal; the resumed
    // life added exactly the strong terminal.
    expect(settledAttemptsOf(entries)).toBe(cheapAttempts + 1);
  });
});
