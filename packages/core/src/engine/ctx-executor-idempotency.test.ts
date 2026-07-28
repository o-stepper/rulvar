/**
 * The isolated-executor idempotency key binds to the logical invocation
 * (v1.59.x review P0.4): two distinct calls in one run, even with
 * byte-identical arguments, get distinct keys so external deduplication
 * never folds two intended effects; while an at-least-once resume of the
 * SAME logical call keeps its key so the retry folds to effectively-once.
 */
import { describe, expect, it } from 'vitest';

import { checkpointRefFor, encodeCheckpoint, type CheckpointState } from '../journal/checkpoint.js';
import { deriveContentKey, type IdentityInput } from '../journal/identity.js';
import { EMPTY_SCHEMA_HASH } from '../l0/schema.js';
import type { Json } from '../l0/json.js';
import type { Msg } from '../l0/messages.js';
import type { IsolatedExecRequest, ToolExecutorProvider } from '../l0/spi/executor.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { resolveToolset } from '../tools/toolset-hash.js';
import { deriveExecIdempotencyKey, deriveExecIdempotencyKeyV2 } from '../runtime/executor.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

/** An external tool: dispatch routes to the registered provider. */
const charge = tool({
  name: 'charge',
  description: 'charges the customer (a real side effect)',
  parameters: {},
  executor: 'subprocess',
  executorSpec: { command: 'unused' },
  execute: () => Promise.reject(new Error('must not run in process')),
});

/** Records the idempotency key handed to each dispatch. */
function recordingExecutor(keys: string[]): { subprocess: ToolExecutorProvider } {
  return {
    subprocess: {
      run: (request: IsolatedExecRequest): Promise<Json> => {
        keys.push(request.ctx.idempotencyKey);
        return Promise.resolve({ ok: true });
      },
    },
  };
}

describe('isolated-executor idempotency key binds to the logical invocation (P0.4)', () => {
  it('gives two calls with identical arguments distinct keys within one agent', async () => {
    const keys: string[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'charge', args: {} },
              { name: 'charge', args: {} },
            ],
          }
        : { text: 'done' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      executors: recordingExecutor(keys),
    });
    const ctx = createCtx(internals);
    await ctx.agent('charge twice', { tools: [charge] });
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('gives two different agents distinct keys for the same call', async () => {
    const keys: string[] = [];
    // Distinct prompts so the two agent entries have distinct content keys
    // (identical calls would replay, not re-dispatch).
    const adapter = scriptedAdapter((req) =>
      req.messages.some((m) => m.role === 'tool')
        ? { text: 'done' }
        : { toolCalls: [{ name: 'charge', args: {} }] },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      executors: recordingExecutor(keys),
    });
    const ctx = createCtx(internals);
    await ctx.agent('alpha invoice', { tools: [charge] });
    await ctx.agent('beta invoice', { tools: [charge] });
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('keeps the key stable across an at-least-once resume of the same call', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const PROMPT = 'charge once after the restored turns';

    // The agent's content key for this exact call shape. The executor tag
    // never enters the toolset hash, so registering it only satisfies the
    // resolve-time check; the hash is identical either way.
    const toolset = await resolveToolset(
      [charge],
      { runId: 'test-run' },
      undefined,
      new Set(['subprocess']),
    );
    const identity: IdentityInput = {
      kind: 'agent',
      agentType: '',
      modelSpec: { kind: 'model', model: 'fake:model' },
      prompt: PROMPT,
      schemaHash: EMPTY_SCHEMA_HASH,
      toolsetHash: toolset.hash,
      isolation: 'none',
    };
    const key = deriveContentKey(identity);

    // Simulated crash: a dangling agent dispatch (running, no terminal)
    // and a durable checkpoint with two tool calls already used.
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    const history: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: PROMPT }] },
      { role: 'assistant', parts: [{ type: 'tool-call', id: 'a', name: 'charge', args: {} }] },
      {
        role: 'tool',
        parts: [{ type: 'tool-result', id: 'a', name: 'charge', result: { ok: true } }],
      },
      { role: 'assistant', parts: [{ type: 'tool-call', id: 'b', name: 'charge', args: {} }] },
      {
        role: 'tool',
        parts: [{ type: 'tool-result', id: 'b', name: 'charge', result: { ok: true } }],
      },
    ];
    const checkpoint: CheckpointState = {
      v: 1,
      messages: history,
      turns: 2,
      usage: { inputTokens: 20, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 2,
      schemaAttempts: 0,
      compaction: [],
    };
    await transcripts.put(checkpointRefFor('test-run', running.seq), encodeCheckpoint(checkpoint));
    const prior = await seed.store.load('test-run');

    // Resume: exactly one more live turn charges again as the THIRD tool
    // call (restored turns are never re-called, so call 0 is the live one).
    const keys: string[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCalls: [{ name: 'charge', args: {} }] } : { text: 'settled' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
      executors: recordingExecutor(keys),
    });
    const ctx = createCtx(internals);
    await ctx.agent(PROMPT, { tools: [charge] });

    // The resumed dispatch charged once (the third call), and its key is
    // the deterministic function of the REUSED agent seq and the ordinal
    // CONTINUED from the checkpoint (2 restored + 1), so an at-least-once
    // retry of this same logical call would derive the identical key.
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe(deriveExecIdempotencyKey('test-run', running.seq, 3, 'charge', {}));
  });
});

describe('incarnation-scoped derivation (RV403)', () => {
  it('scopes the key to the generation token under derivation 2', async () => {
    // Two incarnations of the same logical call, differing ONLY in the
    // generation token, must never share a key; one incarnation repeats
    // its own key exactly.
    const perGenesis = async (genesis: string): Promise<string> => {
      const keys: string[] = [];
      const adapter = scriptedAdapter((_req, call) =>
        call === 0 ? { toolCalls: [{ name: 'charge', args: {} }] } : { text: 'done' },
      );
      const { internals } = makeInternals({
        adapters: [adapter],
        routing: { loop: 'fake:model' },
        executors: recordingExecutor(keys),
        execKey: { version: 2, genesis },
      });
      const ctx = createCtx(internals);
      await ctx.agent('charge once', { tools: [charge] });
      expect(keys).toHaveLength(1);
      return keys[0];
    };
    const genA = await perGenesis('gen-a');
    const genARepeat = await perGenesis('gen-a');
    const genB = await perGenesis('gen-b');
    expect(genARepeat).toBe(genA);
    expect(genB).not.toBe(genA);
  });

  it('keeps the version 2 key stable across an at-least-once resume', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const PROMPT = 'charge once after the restored turns';
    const toolset = await resolveToolset(
      [charge],
      { runId: 'test-run' },
      undefined,
      new Set(['subprocess']),
    );
    const identity: IdentityInput = {
      kind: 'agent',
      agentType: '',
      modelSpec: { kind: 'model', model: 'fake:model' },
      prompt: PROMPT,
      schemaHash: EMPTY_SCHEMA_HASH,
      toolsetHash: toolset.hash,
      isolation: 'none',
    };
    const key = deriveContentKey(identity);

    // Simulated crash mid-agent, exactly like the v1 twin above.
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    const history: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: PROMPT }] },
      { role: 'assistant', parts: [{ type: 'tool-call', id: 'a', name: 'charge', args: {} }] },
      {
        role: 'tool',
        parts: [{ type: 'tool-result', id: 'a', name: 'charge', result: { ok: true } }],
      },
    ];
    const checkpoint: CheckpointState = {
      v: 1,
      messages: history,
      turns: 1,
      usage: { inputTokens: 20, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 1,
      schemaAttempts: 0,
      compaction: [],
    };
    await transcripts.put(checkpointRefFor('test-run', running.seq), encodeCheckpoint(checkpoint));
    const prior = await seed.store.load('test-run');

    // The resumed segment of a derivation 2 run: the same restored seq
    // and continued ordinal, plus the CARRIED generation token, derive
    // the exact version 2 key, so the at-least-once fold still holds.
    const keys: string[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCalls: [{ name: 'charge', args: {} }] } : { text: 'settled' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
      executors: recordingExecutor(keys),
      execKey: { version: 2, genesis: 'gen-resume' },
    });
    const ctx = createCtx(internals);
    await ctx.agent(PROMPT, { tools: [charge] });
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe(
      deriveExecIdempotencyKeyV2('test-run', 'gen-resume', running.seq, 2, 'charge', {}),
    );
  });
});
