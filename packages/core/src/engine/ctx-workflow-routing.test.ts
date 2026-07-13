/**
 * Workflow defaults: layer 3 of the resolution chain, under the call
 * override and the agent profile, over the engine defaults. The router
 * always had the slot and the model routing guide always documented the
 * layer; nothing could populate it, so a workflow could not carry a model
 * policy of its own.
 *
 * The layer rides the SCOPE, not the run, so it follows the call tree: a
 * child spawned through ctx.workflow contributes its own defaults inside
 * its scope and they stop at its boundary.
 */
import { describe, expect, it } from 'vitest';

import { defineWorkflow, executeWorkflow } from './ctx.js';
import { makeInternals, scriptedAdapter, testCaps } from './test-harness.js';

/** Two adapters so the resolved model is visible in the request stream. */
function twoAdapters() {
  const big = scriptedAdapter(() => ({ text: 'big' }), { id: 'big', caps: testCaps() });
  const small = scriptedAdapter(() => ({ text: 'small' }), { id: 'small', caps: testCaps() });
  return { big, small, adapters: [big, small] };
}

describe('workflow defaults (resolution chain layer 3)', () => {
  it('override the engine defaults for every agent in the workflow', async () => {
    const { big, small, adapters } = twoAdapters();
    const { internals } = makeInternals({ adapters, routing: { loop: 'big:model' } });

    const cheap = defineWorkflow(
      { name: 'cheap', routing: { loop: 'small:model' } },
      async (ctx) => {
        await ctx.agent('one');
        await ctx.agent('two');
        return 'done';
      },
    );
    await executeWorkflow(internals, cheap, undefined);

    // The engine said big; the workflow says small, and it wins.
    expect(small.calls).toHaveLength(2);
    expect(big.calls).toHaveLength(0);
  });

  it('lose to the agent profile and to the call override', async () => {
    const { big, small, adapters } = twoAdapters();
    const { internals } = makeInternals({
      adapters,
      routing: { loop: 'small:model' },
      profiles: { pricey: { model: 'big:model' } },
    });

    const wf = defineWorkflow({ name: 'w', routing: { loop: 'small:model' } }, async (ctx) => {
      await ctx.agent('by profile', { agentType: 'pricey' }); // profile beats workflow
      await ctx.agent('by call', { model: 'big:model' }); // call beats workflow
      await ctx.agent('by workflow'); // nothing above it: workflow wins
      return 'done';
    });
    await executeWorkflow(internals, wf, undefined);

    expect(big.calls).toHaveLength(2);
    expect(small.calls).toHaveLength(1);
  });

  it('follow the call tree: a child workflow contributes its OWN defaults', async () => {
    const { big, small, adapters } = twoAdapters();
    const { internals } = makeInternals({
      adapters,
      routing: { loop: 'big:model' },
      workflows: {},
    });

    const child = defineWorkflow({ name: 'child', routing: { loop: 'small:model' } }, async (ctx) =>
      ctx.agent('inside the child'),
    );
    const parent = defineWorkflow({ name: 'parent' }, async (ctx) => {
      await ctx.agent('before the child'); // parent declares nothing: engine default
      await ctx.workflow(child, undefined); // the child's own layer applies
      await ctx.agent('after the child'); // and stops at its boundary
      return 'done';
    });
    await executeWorkflow(internals, parent, undefined);

    expect(small.calls).toHaveLength(1); // exactly the call inside the child
    expect(big.calls).toHaveLength(2); // both calls in the parent
  });

  it('are per role, like every other layer', async () => {
    const { big, small, adapters } = twoAdapters();
    const { internals } = makeInternals({
      adapters,
      routing: { loop: 'big:model', summarize: 'big:model', extract: 'big:model' },
    });

    // Only summarize moves; the loop keeps resolving through the engine.
    const wf = defineWorkflow({ name: 'w', routing: { summarize: 'small:model' } }, async (ctx) =>
      ctx.agent('loop stays big'),
    );
    await executeWorkflow(internals, wf, undefined);

    expect(big.calls).toHaveLength(1);
    expect(small.calls).toHaveLength(0); // summarize did not fire; routing it changed nothing else
  });

  it('a workflow that declares nothing changes nothing', async () => {
    const { big, small, adapters } = twoAdapters();
    const { internals } = makeInternals({ adapters, routing: { loop: 'big:model' } });

    const silent = defineWorkflow({ name: 'silent' }, async (ctx) => ctx.agent('one'));
    await executeWorkflow(internals, silent, undefined);

    expect(big.calls).toHaveLength(1);
    expect(small.calls).toHaveLength(0);
  });
});
