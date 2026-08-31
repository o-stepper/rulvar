/**
 * The direct dispatch reserve bracket (RV4801, the ninth experiment P0).
 * Admission commits the allowance clamped reserve (min of the raw
 * estimate and the chain's allowance headroom), so the settle must
 * release exactly that committed clamp: releaseReserve subtracts the
 * given amount from EVERY account on the chain with a floor of zero per
 * account, and releasing the raw estimate instead erased SIBLING
 * reservations on shared ancestor accounts. The bracket is also a
 * finally: a throw between admission and the slot settle (the worktree
 * acquire, the dispatch append) must return the committed reserve
 * instead of parking it for the rest of the run.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { IsolationProvider } from '../l0/spi/isolation.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { createCtx, defineWorkflow, executeWorkflow } from './ctx.js';
import { makeInternals, scriptedAdapter, testCaps } from './test-harness.js';

/** Polls until the predicate holds; the suite runs on real timers. */
async function until(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 5000 && !predicate(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  expect(predicate()).toBe(true);
}

/**
 * An adapter that parks any request whose prompt mentions 'parked'
 * until open() is called; everything else finishes immediately. This
 * keeps a sibling's reservation LIVE while the clamped child settles,
 * deterministically.
 */
function gatedAdapter(): ProviderAdapter & { open: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    id: 'fake',
    open: () => release(),
    caps: () => testCaps(),
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      if (JSON.stringify(req.messages).includes('parked')) {
        await gate;
      }
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    },
  };
}

describe('the direct dispatch reserve bracket (RV4801)', () => {
  it('the settle of a clamped child releases the clamp, not the raw estimate', async () => {
    // Root ceiling 10; the child workflow admits at the 0.5 flat
    // reserve with a 0.3 x 10 = 3.0 allowance ceiling. Sibling A holds
    // 0.4 live; sibling B estimates 50, which clamps to the allowance
    // headroom 3.0 - 0.4 = 2.6. Committed walks 0.5, 0.9, 3.5; B's
    // settle must land it back on 0.9. Before the bracket it released
    // the raw 50 and floored every account to ZERO with A still live:
    // money promised to A vanished from projected admission.
    const adapter = gatedAdapter();
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
      flatReserveUsd: 0.5,
      childBudgetFraction: 0.3,
    });
    let committedAfterClampedSettle = Number.NaN;
    const kid = defineWorkflow({ name: 'kid' }, async (ctx) => {
      const parked = ctx.agent('parked work', { estCost: 0.4 });
      await until(() => internals.budget.committedReserveUsd >= 0.9 - 1e-9);
      await ctx.agent('clamped work', { estCost: 50 });
      committedAfterClampedSettle = internals.budget.committedReserveUsd;
      adapter.open();
      await parked;
      return 'done';
    });
    const parent = defineWorkflow({ name: 'parent' }, async (ctx) => ctx.workflow(kid, undefined));

    const value = await executeWorkflow(internals, parent, undefined);
    expect(value).toBe('done');

    // The clamp actually applied: the peak is 0.5 + 0.4 + 2.6, not a
    // refusal of the raw 50 against the root.
    const trail = events
      .ofType('budget:update')
      .map((event) => event.committedReserveUsd as number);
    expect(Math.max(...trail)).toBeCloseTo(3.5, 9);
    // The sibling's reservation survived the clamped settle.
    expect(committedAfterClampedSettle).toBeCloseTo(0.9, 9);
    // Everything released once the tree settled: no double release
    // needed the floor, no leak survived it.
    expect(internals.budget.committedReserveUsd).toBe(0);
  });

  it('a throw between admission and the slot settle returns the committed reserve', async () => {
    // The worktree acquire sits between admitSpawn and the dispatch;
    // its throw used to skip the release entirely, parking the 6 USD
    // reserve for the rest of the run and starving later admission.
    const failing: IsolationProvider = {
      acquire: () => Promise.reject(new Error('acquire exploded')),
    };
    const adapter = scriptedAdapter(() => ({ text: 'ok' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
      isolation: failing,
    });
    const ctx = createCtx(internals);
    await expect(
      ctx.agent('doomed work', { estCost: 6, isolation: { kind: 'worktree' } }),
    ).rejects.toThrow('acquire exploded');
    expect(internals.budget.committedReserveUsd).toBe(0);
    // Head on: the returned reserve admits the next spawn (6 + 6 would
    // not fit the 10 ceiling with the leak parked).
    await ctx.agent('follow up work', { estCost: 6 });
    expect(internals.budget.committedReserveUsd).toBe(0);
    expect(adapter.calls).toHaveLength(1);
  });

  it('a journaled rerun releases the recovered clamp it committed', async () => {
    // Segment 1: the clamped child errors after burning 0.0001 USD and
    // the run ends errored. The resume reruns it as RECOVERED with the
    // clamp recomputed against the recorded allowance; its settle must
    // release that same clamp, landing committed back on the child
    // workflow's own live 0.5 reserve instead of flooring it to zero.
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const crash = { now: true };
    const make = () =>
      createEngine({
        adapters: [
          scriptedAdapter((_req, call) =>
            call === 0 && crash.now
              ? {
                  usage: { inputTokens: 100, outputTokens: 0 },
                  error: { code: 'server', message: 'upstream fault', retryable: false },
                }
              : { text: 'ok', usage: { inputTokens: 10, outputTokens: 5 } },
          ),
        ],
        stores: { journal: store, transcripts },
        defaults: { routing: { loop: 'fake:model' } },
      });
    const kid = defineWorkflow({ name: 'kid' }, async (ctx) => {
      // Strict policy: the segment 1 provider error throws out of the
      // await, journaling error terminals for the agent and the child.
      return ctx.agent('clamped rerun work', { estCost: 50 });
    });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => ctx.workflow(kid, undefined));

    const first = await make().run(wf, undefined, {
      runId: 'RESERVE-RERUN-CLAMP',
      budgetUsd: 10,
    }).result;
    expect(first.status).toBe('error');

    crash.now = false;
    const handle = make().resume('RESERVE-RERUN-CLAMP', wf);
    const trail: number[] = [];
    const drain = (async () => {
      for await (const event of handle.events) {
        if (event.type === 'budget:update') {
          trail.push((event as { committedReserveUsd: number }).committedReserveUsd);
        }
      }
    })();
    const resumed = await handle.result;
    await drain;
    expect(resumed.status).toBe('ok');

    // The recovered clamp admitted (well above the 0.5 child reserve,
    // well below the raw 50), and its settle released exactly it.
    const peak = Math.max(...trail);
    expect(peak).toBeGreaterThan(2);
    expect(peak).toBeLessThan(4);
    const afterSettle = trail[trail.lastIndexOf(peak) + 1];
    expect(afterSettle).toBeCloseTo(0.5, 6);
  });
});
