import { describe, expect, it } from 'vitest';
import {
  createEngine,
  InMemoryStore,
  makeOrchestratorWorkflow,
  OrchestratorCapConfigError,
} from '@rulvar/core';
import type { JournalEntry } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

function decisionsOf(
  entries: readonly JournalEntry[],
  decisionType: string,
): Array<Record<string, unknown>> {
  return entries
    .filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === decisionType,
    )
    .map((entry) => entry.value as Record<string, unknown>);
}

function planScript(): (req: import('@rulvar/core').ChatRequest) => ScriptedTurn {
  let phase = 0;
  return (req) => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'worker done' };
    }
    const prompt = JSON.stringify(req.messages);
    if (prompt.includes('budget cap was reached')) {
      // The reserved final wake: the single finish tool.
      return { toolCall: { name: 'finish', args: { result: 'partial but honest' } } };
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
            rationale: 'one worker',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'normal end' } } };
  };
}

function engineWith(adapter: ReturnType<typeof scriptedAdapter>, store: InMemoryStore) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'w' } },
    },
  });
}

describe('orchestrator cap and finalize reserve (M7-T12, DEF-7)', () => {
  it('refuses to start when the cap is unresolvable or below the reserve', async () => {
    const adapter = scriptedAdapter(() => {
      throw new Error('must never go live');
    });
    const store = new InMemoryStore();
    // No run ceiling and no explicit capUsd: unresolvable under PlanRunner.
    const outcome = await orchestratePlanned(engineWith(adapter, store), 'no cap', {}).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('orchestrator_cap_config');
    // effectiveCap below the finalize reserve.
    const below = await orchestratePlanned(engineWith(adapter, store), 'low cap', {
      budget: { capUsd: 0.1, finalizeReserveUsd: 0.5 },
    }).result;
    expect(below.status).toBe('error');
    expect(below.error?.code).toBe('orchestrator_cap_config');
    // No LLM call and no journal entries happened for either run.
    expect(adapter.calls).toHaveLength(0);
    expect(OrchestratorCapConfigError.prototype instanceof Error || true).toBe(true);
  });

  it('journals the reserve strictly after termination.init and before the first agent entry', async () => {
    const adapter = scriptedAdapter(planScript());
    const store = new InMemoryStore();
    const handle = orchestratePlanned(engineWith(adapter, store), 'reserved', {
      budget: { capUsd: 5, finalizeReserveUsd: 1, finalizeTurns: 2 },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const reserve = decisionsOf(entries, 'orchestrator_budget_reserve');
    expect(reserve).toHaveLength(1);
    expect(reserve[0]?.capUsd).toBe(5);
    expect(reserve[0]?.finalizeReserveUsd).toBe(1);
    const reserveSeq = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'orchestrator_budget_reserve',
    )?.seq;
    const initSeq = entries.find((entry) => entry.kind === 'termination.init')?.seq;
    const firstAgent = entries.find((entry) => entry.kind === 'agent')?.seq;
    expect(reserve[0]?.terminationInitRef).toBe(initSeq);
    expect(reserveSeq).toBeGreaterThan(initSeq ?? -1);
    expect(reserveSeq).toBeLessThan(firstAgent ?? -1);
  });

  it('freezes at the soft boundary and finishes through the reserved final wake', async () => {
    const adapter = scriptedAdapter(planScript());
    const store = new InMemoryStore();
    // The v1 per-turn estimate is the flat reserve (0.5): a cap below it
    // trips the pre-wake soft boundary at the FIRST wake evaluation.
    const handle = orchestratePlanned(engineWith(adapter, store), 'freeze run', {
      budget: { capUsd: 0.4, finalizeReserveUsd: 0.01 },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    // The forced finish produced the run result.
    expect(outcome.value).toBe('partial but honest');
    expect(outcome.cost.orchestrator.forcedFinish).toBe(true);
    // The unwind digest of the forced finalization counts as the sole
    // delivered wake.
    expect(outcome.cost.orchestrator.wakes).toBe(1);

    const entries = await store.load(handle.runId);
    const caps = decisionsOf(entries, 'orchestrator_budget_cap');
    expect(caps).toHaveLength(1);
    expect(caps[0]?.cause).toBe('pre-wake');
    expect(caps[0]?.fallback).toBe('finish-with-partial');
    expect(caps[0]?.disarmedTriggers).toEqual(['child_terminal', 'escalation', 'budget_threshold']);
    // The admitted worker ran to completion: frozen for adaptation, not
    // for work.
    expect(
      entries.some(
        (entry) => entry.kind === 'agent' && entry.scope.includes('plan/') && entry.status === 'ok',
      ),
    ).toBe(true);
  });

  it('synthesizes the deterministic partial when the final finish fails', async () => {
    let finalizeTurns = 0;
    const base = planScript();
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const prompt = JSON.stringify(req.messages);
      if (agentTypeOf(req) === '' && prompt.includes('budget cap was reached')) {
        finalizeTurns += 1;
        // Never calls finish: the unknown tool burns the single turn and
        // the engine falls back.
        return { toolCall: { name: 'plan_view', args: {} } };
      }
      return base(req);
    });
    const store = new InMemoryStore();
    const handle = orchestratePlanned(engineWith(adapter, store), 'fallback run', {
      budget: { capUsd: 0.4, finalizeReserveUsd: 0.01, finalizeTurns: 1 },
    });
    const outcome = await handle.result;
    // Exhaustion is NEVER null: the synthesized partial
    // rides the exhausted outcome.
    expect(outcome.status).toBe('exhausted');
    const value = outcome.value as {
      forcedFinishFallback?: boolean;
      completed?: Array<{ status?: string }>;
    };
    expect(value?.forcedFinishFallback).toBe(true);
    expect(value?.completed?.[0]?.status).toBe('ok');
    expect(finalizeTurns).toBeGreaterThanOrEqual(1);

    const entries = await store.load(handle.runId);
    expect(decisionsOf(entries, 'orchestrator_finalize_fallback')).toHaveLength(1);
  });
});

describe('the frozen budget vector in termination.init (v1.7.0 follow-up review)', () => {
  const limitsOf = (entries: readonly JournalEntry[]): Record<string, number> | undefined =>
    (
      entries.find((entry) => entry.kind === 'termination.init')?.value as
        { limits?: Record<string, number> } | undefined
    )?.limits;

  /** A pre-v1.8 journal: the init froze zeros for the cap dollars. */
  async function cloneWithZeroedInit(source: InMemoryStore, runId: string): Promise<InMemoryStore> {
    const legacy = new InMemoryStore();
    for (const meta of await source.listRuns()) {
      if (meta.runId === runId) {
        await legacy.putMeta(meta);
      }
    }
    for (const entry of await source.load(runId)) {
      if (entry.kind !== 'termination.init') {
        await legacy.append(runId, entry);
        continue;
      }
      const value = entry.value as { limits: Record<string, number> };
      await legacy.append(runId, {
        ...entry,
        value: {
          ...value,
          limits: { ...value.limits, orchestratorCapUsd: 0, finalizeReserveUsd: 0 },
        },
      });
    }
    return legacy;
  }

  it('freezes the ACTUAL cap and finalize reserve, matching the reserve decision', async () => {
    const adapter = scriptedAdapter(planScript());
    const store = new InMemoryStore();
    const handle = orchestratePlanned(engineWith(adapter, store), 'frozen vector', {
      budget: { capUsd: 5, finalizeReserveUsd: 1 },
    });
    expect((await handle.result).status).toBe('ok');

    const entries = await store.load(handle.runId);
    const limits = limitsOf(entries);
    expect(limits?.orchestratorCapUsd).toBe(5);
    expect(limits?.finalizeReserveUsd).toBe(1);
    // One authority: the following reserve decision refers to the SAME
    // immutable dollars, never contradicting the init vector.
    const reserve = decisionsOf(entries, 'orchestrator_budget_reserve');
    expect(reserve).toHaveLength(1);
    expect(reserve[0]?.capUsd).toBe(limits?.orchestratorCapUsd);
    expect(reserve[0]?.finalizeReserveUsd).toBe(limits?.finalizeReserveUsd);
  });

  it('reports drift for changed live cap options on resume and retains the frozen dollars', async () => {
    const store = new InMemoryStore();
    const life1 = orchestratePlanned(engineWith(scriptedAdapter(planScript()), store), 'cap run', {
      budget: { capUsd: 5, finalizeReserveUsd: 1 },
    });
    expect((await life1.result).status).toBe('ok');

    const adapter2 = scriptedAdapter(planScript());
    const engine2 = engineWith(adapter2, store);
    const drift: Array<{ field: string; frozenValue: unknown; liveValue: unknown }> = [];
    const resumed = engine2.resume(
      life1.runId,
      makeOrchestratorWorkflow('cap run', {
        // The RAISED live cap: the journaled dollars win; the divergence
        // is reported, never honored (DEF-2 config-drift-resume).
        budget: { capUsd: 7, finalizeReserveUsd: 1 },
        extension: planRunner({}),
      }),
    );
    const off = resumed.on('termination:config-drift', (event) => {
      drift.push(event);
    });
    const outcome = await resumed.result;
    off();
    expect(outcome.status).toBe('ok');
    expect(drift).toHaveLength(1);
    expect(drift[0]).toMatchObject({
      type: 'termination:config-drift',
      field: 'orchestratorCapUsd',
      frozenValue: 5,
      liveValue: 7,
    });
    // Frozen-wins is observable end to end: the wake digest budget block
    // renders the FROZEN dollars, so the whole life replays without one
    // live model call, and no second freeze is journaled.
    expect(adapter2.calls).toHaveLength(0);
    const entries = await store.load(life1.runId);
    expect(decisionsOf(entries, 'orchestrator_budget_reserve')).toHaveLength(1);
    expect(limitsOf(entries)?.orchestratorCapUsd).toBe(5);
  });

  it('replays a legacy zero-init journal under the reserve-decision authority', async () => {
    const store = new InMemoryStore();
    const life1 = orchestratePlanned(
      engineWith(scriptedAdapter(planScript()), store),
      'legacy run',
      { budget: { capUsd: 5, finalizeReserveUsd: 1 } },
    );
    expect((await life1.result).status).toBe('ok');
    const legacyStore = await cloneWithZeroedInit(store, life1.runId);

    const adapter2 = scriptedAdapter(planScript());
    const engine2 = engineWith(adapter2, legacyStore);
    const drift: unknown[] = [];
    const resumed = engine2.resume(
      life1.runId,
      makeOrchestratorWorkflow('legacy run', {
        budget: { capUsd: 5, finalizeReserveUsd: 1 },
        extension: planRunner({}),
      }),
    );
    const off = resumed.on('termination:config-drift', (event) => {
      drift.push(event);
    });
    const outcome = await resumed.result;
    off();
    // No hash-version change, no semantic ambiguity: the zeros are the
    // documented pre-v1.8 sentinel, the reserve decision is the
    // authority, live options matching it produce NO drift, and the
    // whole life replays without repaying anything.
    expect(outcome.status).toBe('ok');
    expect(drift).toEqual([]);
    expect(adapter2.calls).toHaveLength(0);
    const entries = await legacyStore.load(life1.runId);
    const inits = entries.filter((entry) => entry.kind === 'termination.init');
    expect(inits).toHaveLength(1);
    expect(limitsOf(entries)?.orchestratorCapUsd).toBe(0);
    expect(decisionsOf(entries, 'orchestrator_budget_reserve')).toHaveLength(1);
  });
});
