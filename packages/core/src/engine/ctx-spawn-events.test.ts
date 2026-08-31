/**
 * Spawn admission telemetry on the direct dispatch path (RV4806, the
 * ninth experiment's observability asymmetry). A plain `ctx.agent`
 * dispatch committed a budget reserve with no `spawn:admitted`, so the
 * one admission boundary a plain workflow uses was invisible; the
 * refusal was equally silent. One admitted event per spawn stands:
 * dispatches an orchestrating layer tracks by handle, and dispatches
 * carrying a lineage decision, keep their single existing announcement.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError } from '../l0/errors.js';
import { createCtx, defineWorkflow, executeWorkflow } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

describe('direct dispatch spawn telemetry (RV4806)', () => {
  it('a plain dispatch announces its budget admission at the dispatch entry', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'ok' }));
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
    });
    await createCtx(internals).agent('plain work', { estCost: 0.4 });
    const admitted = events.ofType('spawn:admitted');
    expect(admitted).toHaveLength(1);
    await internals.replayer.flush();
    const dispatch = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'running');
    expect(admitted[0]).toMatchObject({
      entryRef: dispatch?.seq,
      verdict: 'admit',
      reserveUsd: 0.4,
    });
    // No lineage layer minted a logical task id for a plain dispatch.
    expect(admitted[0]?.logicalTaskId).toBeUndefined();
    expect(admitted[0]?.replayed).toBeUndefined();
  });

  it('a budget refusal announces spawn:rejected with the typed code', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'never' }));
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 0.001,
    });
    await expect(createCtx(internals).agent('too big', { estCost: 1 })).rejects.toThrow(
      BudgetExhaustedError,
    );
    const rejected = events.ofType('spawn:rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ code: 'budget_exhausted' });
    // Nothing was journaled for the refused dispatch: no entryRef,
    // exactly the config-gate shape.
    expect(rejected[0]?.entryRef).toBeUndefined();
    expect(adapter.calls).toHaveLength(0);
  });

  it('a journaled rerun re-announces with the replayed marker, never as fresh', async () => {
    const crash = { now: true };
    const store = (() => {
      const adapter = scriptedAdapter((_req, call) =>
        call === 0 && crash.now
          ? {
              usage: { inputTokens: 100, outputTokens: 0 },
              error: { code: 'server', message: 'upstream fault', retryable: false },
            }
          : { text: 'ok' },
      );
      return { adapter };
    })();
    const first = makeInternals({
      adapters: [store.adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
    });
    await expect(createCtx(first.internals).agent('probe', { estCost: 0.4 })).rejects.toThrow();
    await first.internals.replayer.flush();
    const prior = await first.store.load('test-run');

    crash.now = false;
    const resumed = makeInternals({
      adapters: [store.adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
      priorEntries: prior,
    });
    await createCtx(resumed.internals).agent('probe', { estCost: 0.4 });
    const admitted = resumed.events.ofType('spawn:admitted');
    expect(admitted).toHaveLength(1);
    expect(admitted[0]?.replayed).toBe(true);
    expect(admitted[0]?.reserveUsd).toBe(0.4);
  });

  it('a ctx.workflow child announces once, with its verdict reserve', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'ok' }));
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
      flatReserveUsd: 0.5,
    });
    const kid = defineWorkflow({ name: 'kid' }, (ctx) => ctx.step('quiet', () => 'done'));
    const parent = defineWorkflow({ name: 'parent' }, async (ctx) => ctx.workflow(kid, undefined));
    await executeWorkflow(internals, parent, undefined);
    const admitted = events.ofType('spawn:admitted');
    // Exactly the workflow child's announcement: the child body
    // dispatches no agents, and the parent workflow is the run root,
    // not a spawn.
    expect(admitted).toHaveLength(1);
    expect(admitted[0]?.reserveUsd).toBe(0.5);
    expect(admitted[0]?.logicalTaskId).toBeDefined();
  });
});
