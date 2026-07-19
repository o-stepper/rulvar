/**
 * Spawn-admission event parity (v1.22.0 review P2-5): every admission
 * boundary emits spawn:admitted / spawn:rejected, recovered decisions
 * emit with the replayed marker, and no path double-emits on resume.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from '../l0/events.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { Replayer } from '../journal/replayer.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

type Spawned = Extract<WorkflowEvent, { type: 'spawn:admitted' | 'spawn:rejected' }>;

function collector(handle: {
  on<T extends WorkflowEvent['type']>(
    type: T,
    cb: (event: Extract<WorkflowEvent, { type: T }>) => void,
  ): () => void;
}): Spawned[] {
  const seen: Spawned[] = [];
  handle.on('spawn:admitted', (event) => seen.push(event));
  handle.on('spawn:rejected', (event) => seen.push(event));
  return seen;
}

describe('spawn admission event parity (v1.22.0 review P2-5)', () => {
  it('ctx.agent roots emit one spawn:admitted per lineage admission, entryRef on the decision', async () => {
    const store = new InMemoryStore({ quiet: true });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'done' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'two-roots' }, async (ctx) => {
      await ctx.agent('first', { approach: 'alpha' });
      await ctx.agent('second', { approach: 'beta' });
      return 'ok';
    });
    const handle = engine.run(wf, undefined, { runId: 'ROOTS' });
    const seen = collector(handle);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const admitted = seen.filter((event) => event.type === 'spawn:admitted');
    expect(admitted).toHaveLength(2);
    const entries = await store.load('ROOTS');
    for (const event of admitted) {
      const entry = entries.find((candidate) => candidate.seq === event.entryRef);
      expect(entry?.kind).toBe('decision');
      expect(event.replayed).toBeUndefined();
      expect(event.logicalTaskId).not.toBe('');
    }
  });

  it('resume never double-announces admissions; only the post-resume live one fires', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-spawnev-'));
    const store = new JsonlFileStore({ dir });
    const wf = defineWorkflow({ name: 'gated-roots' }, async (ctx) => {
      const first = await ctx.agent('before the gate', { approach: 'alpha' });
      await ctx.awaitExternal('gate');
      const second = await ctx.agent('after the gate', { approach: 'beta' });
      return [first, second].join('|');
    });
    const one = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'a' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle1 = one.run(wf, undefined, { runId: 'GATED' });
    const seen1 = collector(handle1);
    expect((await handle1.result).status).toBe('suspended');
    expect(seen1.filter((e) => e.type === 'spawn:admitted')).toHaveLength(1);

    const priorEntries = await store.load('GATED');
    const suspended = priorEntries.find((entry) => entry.kind === 'external');
    const offline = new Replayer({ runId: 'GATED', store, priorEntries });
    await offline.resolveSuspended(suspended?.seq ?? -1, { by: 'external', value: { ok: true } });

    const two = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'b' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle2 = two.resume('GATED', wf);
    const seen2 = collector(handle2);
    expect((await handle2.result).status).toBe('ok');
    // The pre-gate agent REPLAYS cleanly: its admission was announced
    // live in segment 1 and a pure value replay does not re-dispatch,
    // so nothing re-announces. Only the post-gate live admission fires.
    const admits2 = seen2.filter((event) => event.type === 'spawn:admitted');
    expect(admits2).toHaveLength(1);
    expect(admits2[0]?.replayed).toBeUndefined();
    // Per run: exactly two distinct admissions across both segments.
    const refs = [...seen1, ...seen2]
      .filter((event) => event.type === 'spawn:admitted')
      .map((event) => event.entryRef);
    expect(new Set(refs).size).toBe(2);
  });

  it('ctx.workflow children emit spawn:admitted with spawnUnitsAfter, and spawn:rejected on denial', async () => {
    const grand = defineWorkflow({ name: 'grand-wf' }, async (ctx) => {
      await ctx.agent('inside the grandchild');
      return 'grand-done';
    });
    const child = defineWorkflow({ name: 'child-wf' }, async (ctx) => {
      await ctx.agent('inside the child');
      return 'child-done';
    });
    const deepChild = defineWorkflow({ name: 'deep-child-wf' }, async (ctx) => {
      return ctx.workflow(grand, undefined);
    });
    const parent = defineWorkflow({ name: 'parent-wf' }, async (ctx) => {
      return ctx.workflow(child, undefined);
    });
    const okEngine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'x' }))],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const okHandle = okEngine.run(parent, undefined, { runId: 'WF-OK' });
    const okSeen = collector(okHandle);
    expect((await okHandle.result).status).toBe('ok');
    const admitted = okSeen.filter(
      (event) => event.type === 'spawn:admitted' && event.agentType === 'child-wf',
    );
    expect(admitted).toHaveLength(1);
    expect(admitted[0]?.type === 'spawn:admitted' && admitted[0].spawnUnitsAfter).toBeTypeOf(
      'number',
    );

    // Nesting past the default maxDepth (1) denies the grandchild: the
    // rejection now emits exactly one spawn:rejected with entryRef
    // (this path emitted nothing before v1.23).
    const deepParent = defineWorkflow({ name: 'deep-parent-wf' }, async (ctx) => {
      return ctx.workflow(deepChild, undefined);
    });
    const brokeEngine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'x' }))],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const brokeHandle = brokeEngine.run(deepParent, undefined, { runId: 'WF-NO' });
    const brokeSeen = collector(brokeHandle);
    const brokeOutcome = await brokeHandle.result;
    expect(brokeOutcome.status).not.toBe('ok');
    const rejected = brokeSeen.filter(
      (event) => event.type === 'spawn:rejected' && event.agentType === 'grand-wf',
    );
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.entryRef).toBeTypeOf('number');
  });
});
