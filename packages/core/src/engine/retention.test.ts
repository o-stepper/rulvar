/**
 * M8-T04 engine integration: the delete cascade (no orphan transcripts),
 * ok-terminal checkpoint pruning with a replay-strict resume proving
 * pruned blobs are never needed again, the serialization hook as the one
 * policy point (raw store bytes differ, Engine.stores reads plaintext,
 * resume works over the hook), and default event masking end to end.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import type { WorkflowEvent } from '../l0/events.js';
import { MASKED_SECRET } from '../l0/serialization.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine, type CreateEngineOptions, type Engine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { tool } from '../tools/tool.js';
import { scriptedAdapter } from './test-harness.js';

const SECRET = 'sk-abc123def456ghi789jkl012';

const lookup = tool({
  name: 'lookup',
  description: 'looks up a fact',
  parameters: {},
  execute: () => Promise.resolve({ fact: 'sunny' }),
});

/** Two paid turns (tool call, then text): the loop writes a checkpoint. */
const tooled = defineWorkflow({ name: 'tooled' }, async (ctx) => {
  return ctx.agent('analyze with the tool', { tools: [lookup] });
});

function assemble(options?: {
  maskEvents?: boolean;
  serialization?: CreateEngineOptions['serialization'];
}): { engine: Engine; journal: InMemoryStore; transcripts: InMemoryTranscriptStore } {
  const journal = new InMemoryStore();
  const transcripts = new InMemoryTranscriptStore();
  const engine = createEngine({
    adapters: [
      scriptedAdapter((req, call) =>
        req.tools !== undefined && req.tools.length > 0 && call % 2 === 0
          ? { toolCall: { name: 'lookup', args: {} } }
          : { text: 'retention analysis' },
      ),
    ],
    stores: { journal, transcripts },
    defaults: { routing: { loop: 'fake:model' } },
    ...(options?.maskEvents === undefined ? {} : { redaction: { maskEvents: options.maskEvents } }),
    ...(options?.serialization === undefined ? {} : { serialization: options.serialization }),
  });
  return { engine, journal, transcripts };
}

const simple = defineWorkflow({ name: 'simple' }, async (ctx) => {
  return ctx.agent('analyze the data');
});

describe('M8-T04 retention and redaction', () => {
  it('deleteRun cascades: no orphan transcripts, no journal, no meta', async () => {
    const { engine, journal, transcripts } = assemble();
    const handle = engine.run(simple, undefined);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    // The run persisted blobs (transcript and/or checkpoint).
    expect((await transcripts.list(handle.runId)).length).toBeGreaterThan(0);
    expect((await journal.load(handle.runId)).length).toBeGreaterThan(0);

    await engine.deleteRun(handle.runId);

    expect(await transcripts.list(handle.runId)).toEqual([]);
    expect(await journal.load(handle.runId)).toEqual([]);
    expect((await journal.listRuns()).find((m) => m.runId === handle.runId)).toBeUndefined();
  });

  it('pruneRun deletes ok-terminal checkpoints only, and replay never misses them', async () => {
    const { engine, journal, transcripts } = assemble();
    const handle = engine.run(tooled, undefined);
    expect((await handle.result).status).toBe('ok');

    const entries = await journal.load(handle.runId);
    const terminal = entries.find(
      (entry) => entry.kind === 'agent' && entry.status === 'ok' && entry.checkpointRef,
    );
    expect(terminal).toBeDefined();
    const ref = (terminal as JournalEntry).checkpointRef as string;
    expect(await transcripts.get(ref)).not.toBeNull();

    const pruned = await engine.pruneRun(handle.runId);
    expect(pruned).toBeGreaterThan(0);
    expect(await transcripts.get(ref)).toBeNull();

    // A second prune is a no-op fixed point.
    expect(await engine.pruneRun(handle.runId)).toBe(0);

    // The pruned checkpoint is never needed again: a replay-strict
    // resume replays the whole run with zero live calls and zero misses.
    const resumed = engine.resume(handle.runId, tooled, { dryRun: true });
    const outcome = await resumed.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('retention analysis');
  });

  it('the serialization hook is one policy point: raw bytes differ, readers see plaintext', async () => {
    const encode = (e: JournalEntry): JournalEntry =>
      e.value === undefined
        ? e
        : { ...e, value: Buffer.from(JSON.stringify(e.value), 'utf8').toString('base64') };
    const decode = (e: JournalEntry): JournalEntry =>
      typeof e.value === 'string'
        ? { ...e, value: JSON.parse(Buffer.from(e.value, 'base64').toString('utf8')) as never }
        : e;
    const rot = (blob: Uint8Array): Uint8Array => blob.map((byte) => byte ^ 0x5a);
    const { engine, journal } = assemble({
      serialization: {
        journal: { toStored: encode, fromStored: decode },
        transcripts: {
          toStored: (_ref, blob) => rot(blob),
          fromStored: (_ref, blob) => rot(blob),
        },
      },
    });

    const handle = engine.run(simple, undefined);
    expect((await handle.result).status).toBe('ok');

    // RAW store: every journaled value is a base64 string.
    const rawEntries = await journal.load(handle.runId);
    const rawAgent = rawEntries.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(rawAgent?.value).toBeTypeOf('string');
    expect(rawAgent?.value as string).not.toContain('retention');

    // Engine.stores is the HOOKED wrapper: plaintext for every reader.
    const throughEngine = await engine.stores.journal.load(handle.runId);
    const decoded = throughEngine.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(decoded?.value).toBe('retention analysis');

    // Resume works over the hook (symmetric round-trip, zero live calls).
    const resumed = engine.resume(handle.runId, simple, { dryRun: true });
    expect((await resumed.result).value).toBe('retention analysis');
  });

  it('key-shaped strings are masked in emitted events by default; opt-out restores them', async () => {
    const leaky = defineWorkflow({ name: 'leaky' }, async (ctx) => {
      ctx.log('info', `connecting with ${SECRET}`);
      return ctx.agent('analyze the data');
    });

    const collect = async (
      engine: Engine,
    ): Promise<{ events: WorkflowEvent[]; status: string }> => {
      const handle = engine.run(leaky, undefined);
      const events: WorkflowEvent[] = [];
      const pump = (async () => {
        for await (const event of handle.events) {
          events.push(event);
        }
      })();
      const outcome = await handle.result;
      await pump;
      return { events, status: outcome.status };
    };

    const masked = await collect(assemble().engine);
    expect(masked.status).toBe('ok');
    const logs = masked.events.filter((event) => event.type === 'log');
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).toContain(MASKED_SECRET);
    expect(JSON.stringify(masked.events)).not.toContain(SECRET);

    const unmasked = await collect(assemble({ maskEvents: false }).engine);
    expect(JSON.stringify(unmasked.events)).toContain(SECRET);
  });
});

describe('pruneRun exact reference scan (v1.25.0 scale review P1-3)', () => {
  /** Minimal ok-terminal agent entry for SPI-built journals. */
  const terminal = (seq: number, over: Partial<JournalEntry>): JournalEntry => ({
    hashVersion: 2,
    seq,
    ref: 0,
    scope: 'root',
    key: `agent ${seq}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    spanId: `s${seq}`,
    startedAt: '2026-07-20T00:00:00.000Z',
    ...over,
  });

  it('a real chain of 12 tool agents prunes EVERY completed checkpoint (prefix collision regression)', async () => {
    const { engine, transcripts } = assemble();
    const chain = defineWorkflow({ name: 'chain12' }, async (ctx) => {
      for (let i = 0; i < 12; i += 1) {
        await ctx.agent(`step ${i}`, { tools: [lookup] });
      }
      return 'done';
    });
    const outcome = await engine.run(chain, undefined, { runId: 'prune-real' }).result;
    expect(outcome.status).toBe('ok');
    const before = (await transcripts.list('prune-real')).filter((ref) => ref.includes('/ckpt/'));
    expect(before).toHaveLength(12);
    // The seqs span one and two digits (0, 2, ..., 20, 22), so the old
    // substring scan kept ckpt/2 because ckpt/20 and ckpt/22 contain it.
    const pruned = await engine.pruneRun('prune-real');
    expect(pruned).toBe(12);
    const after = (await transcripts.list('prune-real')).filter((ref) => ref.includes('/ckpt/'));
    expect(after).toEqual([]);
    // The pruned checkpoints are never needed again: replay-strict
    // resume completes with zero live calls.
    const resumed = await engine.resume('prune-real', chain, { dryRun: true }).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('done');
  });

  it('refs that collide by prefix are pruned; exact nested and key references keep', async () => {
    const { engine, journal, transcripts } = assemble();
    const runId = 'prune-exact';
    const refs = {
      collides: `${runId}/ckpt/2`,
      collider: `${runId}/ckpt/20`,
      nestedKept: `${runId}/ckpt/21`,
      keyKept: `${runId}/ckpt/22`,
      substringOnly: `${runId}/ckpt/23`,
    };
    for (const ref of Object.values(refs)) {
      await transcripts.put(ref, new Uint8Array([1]));
    }
    await journal.append(runId, terminal(1, { checkpointRef: refs.collides }));
    await journal.append(runId, terminal(2, { checkpointRef: refs.collider }));
    await journal.append(runId, terminal(3, { checkpointRef: refs.nestedKept }));
    await journal.append(runId, terminal(4, { checkpointRef: refs.keyKept }));
    await journal.append(runId, terminal(5, { checkpointRef: refs.substringOnly }));
    // An unrelated entry referencing nestedKept EXACTLY inside a nested
    // value, keyKept as an object KEY, and substringOnly only as a
    // fragment of a longer prose string (not a reference).
    await journal.append(
      runId,
      terminal(6, {
        kind: 'step',
        status: 'ok',
        checkpointRef: undefined,
        value: {
          anchors: [{ boot: refs.nestedKept }],
          index: { [refs.keyKept]: true },
          note: `see ${refs.substringOnly} for detail`,
        },
      }),
    );
    const pruned = await engine.pruneRun(runId);
    const left = await transcripts.list(runId);
    // collides and collider both go (the old substring scan kept
    // collides because collider contains it); nestedKept and keyKept
    // stay (exact whole string references elsewhere); substringOnly
    // goes: a ref mentioned INSIDE a longer prose string is not a
    // structural reference, nothing boots from it.
    expect(pruned).toBe(3);
    expect(left.sort()).toEqual([refs.keyKept, refs.nestedKept].sort());
  });
});
