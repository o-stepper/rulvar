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
