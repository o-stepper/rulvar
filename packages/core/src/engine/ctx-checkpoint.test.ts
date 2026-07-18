import { describe, expect, it } from 'vitest';

import {
  checkpointRefFor,
  decodeCheckpoint,
  encodeCheckpoint,
  type CheckpointState,
} from '../journal/checkpoint.js';
import { deriveContentKey, type IdentityInput } from '../journal/identity.js';
import { EMPTY_SCHEMA_HASH } from '../l0/schema.js';
import type { Msg } from '../l0/messages.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { resolveToolset } from '../tools/toolset-hash.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const PROMPT = 'check the weather twice';

const lookup = tool({
  name: 'lookup',
  description: 'looks up a fact',
  parameters: {},
  execute: () => Promise.resolve({ fact: 'sunny' }),
});

/** The exact spawn identity ctx.agent derives for this call shape. */
async function spawnKey(): Promise<string> {
  const toolset = await resolveToolset([lookup], { runId: 'test-run' });
  const identity: IdentityInput = {
    kind: 'agent',
    agentType: '',
    modelSpec: { kind: 'model', model: 'fake:model' },
    prompt: PROMPT,
    schemaHash: EMPTY_SCHEMA_HASH,
    toolsetHash: toolset.hash,
    isolation: 'none',
  };
  return deriveContentKey(identity);
}

/** Canonical history after two paid tool turns. */
function twoTurnHistory(): Msg[] {
  return [
    { role: 'user', parts: [{ type: 'text', text: PROMPT }] },
    {
      role: 'assistant',
      parts: [{ type: 'tool-call', id: 'id-0-0', name: 'lookup', args: {} }],
    },
    {
      role: 'tool',
      parts: [{ type: 'tool-result', id: 'id-0-0', name: 'lookup', result: { fact: 'sunny' } }],
    },
    {
      role: 'assistant',
      parts: [{ type: 'tool-call', id: 'id-1-0', name: 'lookup', args: {} }],
    },
    {
      role: 'tool',
      parts: [{ type: 'tool-result', id: 'id-1-0', name: 'lookup', result: { fact: 'sunny' } }],
    },
  ];
}

function midFlightCheckpoint(): CheckpointState {
  return {
    v: 1,
    messages: twoTurnHistory(),
    turns: 2,
    usage: { inputTokens: 20, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
    toolCallsUsed: 2,
    schemaAttempts: 0,
    compaction: [],
  };
}

describe('turn-boundary checkpoints through ctx.agent (M3-T02)', () => {
  it('writes a checkpoint at every tool boundary and stamps checkpointRef on the terminal', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const adapter = scriptedAdapter((_req, call) =>
      call < 2 ? { toolCall: { name: 'lookup', args: {} } } : { text: 'sunny twice' },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const ctx = createCtx(internals);
    const output = await ctx.agent(PROMPT, { tools: [lookup] });
    expect(output).toBe('sunny twice');
    await internals.replayer.flush();

    const entries = await store.load('test-run');
    const running = entries.find((e) => e.kind === 'agent' && e.status === 'running');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(running).toBeDefined();
    expect(terminal?.checkpointRef).toBe(checkpointRefFor('test-run', running?.seq ?? -1));

    const blob = await transcripts.get(terminal?.checkpointRef ?? '');
    expect(blob).not.toBeNull();
    const checkpoint = decodeCheckpoint(blob ?? new Uint8Array());
    // The last saved boundary is after the second tool execution.
    expect(checkpoint?.turns).toBe(2);
    expect(checkpoint?.toolCallsUsed).toBe(2);
    expect(checkpoint?.messages.filter((m) => m.role === 'tool')).toHaveLength(2);
  });

  it('kill-and-resume re-enters at the last turn boundary with zero re-paid turns', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const key = await spawnKey();

    // Simulated crash: the dispatch is journaled, no terminal exists, and
    // the last boundary checkpoint is durable.
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    await transcripts.put(
      checkpointRefFor('test-run', running.seq),
      encodeCheckpoint(midFlightCheckpoint()),
    );
    const prior = await seed.store.load('test-run');

    const adapter = scriptedAdapter(() => ({ text: 'sunny twice' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const ctx = createCtx(internals);
    const output = await ctx.agent(PROMPT, { tools: [lookup] });
    expect(output).toBe('sunny twice');

    // Exactly ONE live model call: turns 1-2 were restored, never re-paid.
    expect(adapter.calls).toHaveLength(1);
    // The restored canonical history reached the model verbatim (the
    // recorded request shares the live message array, so only the
    // restored prefix is asserted).
    const requestMessages = adapter.calls[0]?.messages ?? [];
    expect(requestMessages[0]?.parts).toEqual([{ type: 'text', text: PROMPT }]);
    expect(requestMessages.slice(0, 5).map((msg) => msg.role)).toEqual(
      twoTurnHistory().map((msg) => msg.role),
    );

    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    // Restored two turns plus the one live turn; usage folds both.
    expect(terminal?.usage).toEqual({
      inputTokens: 30,
      outputTokens: 15,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    // A pre-split aggregate checkpoint restores onto the primary (role,
    // model) pair, so this single-pair call writes no slices at all.
    expect(terminal?.usageByModel).toBeUndefined();
  });

  it('restores checkpointed (role, model) slices with their roles intact (v1.19.0 review P1-2)', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const key = await spawnKey();
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    // The crashed run had already paid a mid-loop compaction: its
    // checkpoint carries a loop slice and a summarize slice.
    const checkpoint = midFlightCheckpoint();
    checkpoint.usageByModel = [
      {
        servedBy: 'fake:model',
        usage: { inputTokens: 15, outputTokens: 8, cacheReadTokens: 0, cacheWriteTokens: 0 },
        role: 'loop',
      },
      {
        servedBy: 'fake:model',
        usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
        role: 'summarize',
      },
    ];
    await transcripts.put(checkpointRefFor('test-run', running.seq), encodeCheckpoint(checkpoint));
    const prior = await seed.store.load('test-run');

    const adapter = scriptedAdapter(() => ({ text: 'sunny twice' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const ctx = createCtx(internals);
    const output = await ctx.agent(PROMPT, { tools: [lookup] });
    expect(output).toBe('sunny twice');
    expect(adapter.calls).toHaveLength(1);

    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    // The live turn (10 in, 5 out) merges into the restored loop slice;
    // the summarize slice survives verbatim under its own role.
    expect(terminal?.usageByModel).toEqual([
      {
        servedBy: 'fake:model',
        usage: { inputTokens: 25, outputTokens: 13, cacheReadTokens: 0, cacheWriteTokens: 0 },
        role: 'loop',
      },
      {
        servedBy: 'fake:model',
        usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
        role: 'summarize',
      },
    ]);
  });

  it('an unreadable checkpoint falls back to a full redispatch (at-least-once floor)', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const key = await spawnKey();
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    const corrupted = encodeCheckpoint(midFlightCheckpoint());
    corrupted[0] = 0x7f;
    await transcripts.put(checkpointRefFor('test-run', running.seq), corrupted);
    const prior = await seed.store.load('test-run');

    const adapter = scriptedAdapter((_req, call) =>
      call < 2 ? { toolCall: { name: 'lookup', args: {} } } : { text: 'sunny twice' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const ctx = createCtx(internals);
    const output = await ctx.agent(PROMPT, { tools: [lookup] });
    expect(output).toBe('sunny twice');
    // The unknown format byte is never trusted: the turn sequence reruns.
    expect(adapter.calls).toHaveLength(3);
  });

  it('a replayed agent recovers turns and re-emits tool events from its checkpoint', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const adapter = scriptedAdapter((_req, call) =>
      call < 2 ? { toolCall: { name: 'lookup', args: {} } } : { text: 'sunny twice' },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    await createCtx(internals).agent(PROMPT, { tools: [lookup] });
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = scriptedAdapter(() => ({ text: 'never called' }));
    const { internals: resumed, events } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const ctx = createCtx(resumed);
    const result = (await ctx.agent(PROMPT, {
      tools: [lookup],
      result: 'full',
    })) as { status: string; turns: number };
    expect(result.status).toBe('ok');
    expect(replayAdapter.calls).toHaveLength(0);
    // Turns recovered from the last boundary checkpoint (two tool turns).
    expect(result.turns).toBe(2);
    const toolEnds = events.ofType('tool:end');
    expect(toolEnds).toHaveLength(2);
    expect(toolEnds.every((event) => event.outcome === 'ok')).toBe(true);
  });
});
