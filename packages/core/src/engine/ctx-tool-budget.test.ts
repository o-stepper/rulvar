/**
 * The tool budget pressure snapshot through the engine (RV304): a capped
 * invocation carries used/cap (and the extension's grants) on the full
 * AgentResult and the live agent:end, and the invocation table passes it
 * through. Since RV509 the snapshot has a durable subset: an extension
 * grant and the finalization-window entry journal as decision entries of
 * the existing vocabulary, a crash-resume restores them from the journal
 * (the counts alone cannot always prove them), and a replay rebuilds the
 * journal-backed fields with zero adapter calls. The snapshot itself
 * still never journals; grant-free runs stay byte-identical.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { checkpointRefFor, encodeCheckpoint, type CheckpointState } from '../journal/checkpoint.js';
import { deriveContentKey, type IdentityInput } from '../journal/identity.js';
import { EMPTY_SCHEMA_HASH } from '../l0/schema.js';
import type { WorkflowEvent } from '../l0/events.js';
import type { Msg } from '../l0/messages.js';
import { reduceInvocationTable } from '../l0/telemetry-reduce.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import { toolBudgetExtensionNoticeText } from '../runtime/exploration.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { resolveToolset } from '../tools/toolset-hash.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

const pager = (executions: unknown[]) =>
  tool({
    name: 'read',
    description: 'reads a page',
    parameters: z.strictObject({ page: z.number() }),
    execute: (input) => {
      executions.push(input);
      return Promise.resolve({ content: `page ${String(input.page)}` });
    },
  });

/** Decision entries carrying the given decisionType, value-parsed. */
const decisionsOf = (
  entries: ReadonlyArray<{ kind: string; value?: unknown }>,
  decisionType: string,
): unknown[] =>
  entries
    .filter((entry) => entry.kind === 'decision')
    .map((entry) => entry.value as { decisionType?: string })
    .filter((value) => value.decisionType === decisionType);

describe('the tool budget pressure snapshot through the engine (RV304)', () => {
  it('rides the full result, the live agent:end, and the invocation table; the grant journals its decision', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: { page: 1 } },
              { name: 'read', args: { page: 2 } },
              { name: 'read', args: { page: 3 } },
            ],
          }
        : { text: 'done' },
    );
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('research the repo', {
        limits: {
          maxToolCalls: 2,
          toolBudgetExtension: { increment: 2, maxExtensions: 1 },
        },
        tools: [pager(executions)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(executions).toHaveLength(3);
    const expected = { used: 3, cap: 4, extensionsGranted: 1 };
    expect(result.toolBudget).toEqual(expected);

    const ends = events.ofType('agent:end');
    expect(ends).toEqual([expect.objectContaining({ toolBudget: expected })]);
    const table = reduceInvocationTable(events.all as unknown as WorkflowEvent[]);
    expect(table.agents[0]?.toolBudget).toEqual(expected);

    // The snapshot never journals; the GRANT does (RV509), as one
    // decision entry of the existing vocabulary bound to the dispatch.
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    for (const entry of entries) {
      expect(JSON.stringify(entry)).not.toContain('toolBudget');
    }
    const dispatch = entries.find((entry) => entry.kind === 'agent' && entry.status === 'running');
    expect(decisionsOf(entries, 'tool_budget_extension')).toEqual([
      {
        decisionType: 'tool_budget_extension',
        targetRef: dispatch?.seq,
        grant: 1,
        maxExtensions: 1,
        toolCallsUsed: 2,
        cap: 4,
      },
    ]);
  });
});

describe('the durable tool budget summary (RV509)', () => {
  it('a crash after the grant resumes with the grant restored from the journal, never re-announced', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const PROMPT = 'research the repo';
    const executions: unknown[] = [];
    const pagerTool = pager(executions);
    const toolset = await resolveToolset([pagerTool], { runId: 'test-run' }, undefined, new Set());
    const identity: IdentityInput = {
      kind: 'agent',
      agentType: '',
      modelSpec: { kind: 'model', model: 'fake:model' },
      prompt: PROMPT,
      schemaHash: EMPTY_SCHEMA_HASH,
      toolsetHash: toolset.hash,
      isolation: 'none',
    };

    // Simulated crash: a dangling agent dispatch, the journaled grant
    // decision, and a checkpoint whose executed count sits exactly AT
    // the base cap. The count alone cannot prove the grant (2 is not
    // beyond 2); only the decision entry can restore it.
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key: deriveContentKey(identity),
      kind: 'agent',
      spanId: 's0',
    });
    await seed.internals.replayer.appendSinglePhase({
      scope: '',
      key: '',
      kind: 'decision',
      status: 'ok',
      spanId: 's0',
      value: {
        decisionType: 'tool_budget_extension',
        targetRef: running.seq,
        grant: 1,
        maxExtensions: 1,
        toolCallsUsed: 2,
        cap: 4,
      },
    });
    const history: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: PROMPT }] },
      {
        role: 'assistant',
        parts: [
          { type: 'tool-call', id: 'a', name: 'read', args: { page: 1 } },
          { type: 'tool-call', id: 'b', name: 'read', args: { page: 2 } },
        ],
      },
      {
        role: 'tool',
        parts: [
          { type: 'tool-result', id: 'a', name: 'read', result: { content: 'page 1' } },
          { type: 'tool-result', id: 'b', name: 'read', result: { content: 'page 2' } },
        ],
      },
      { role: 'user', parts: [{ type: 'text', text: toolBudgetExtensionNoticeText(1, 1, 2, 4) }] },
    ];
    const checkpoint: CheckpointState = {
      v: 1,
      messages: history,
      turns: 1,
      usage: { inputTokens: 20, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 2,
      schemaAttempts: 0,
      compaction: [],
    };
    await transcripts.put(checkpointRefFor('test-run', running.seq), encodeCheckpoint(checkpoint));
    const prior = await seed.store.load('test-run');

    // Resume: the restored grant funds two more executed calls; nothing
    // is re-granted, so the model sees exactly the one restored notice
    // and the journal keeps exactly the one decision.
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: { page: 3 } },
              { name: 'read', args: { page: 4 } },
            ],
          }
        : { text: 'done' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const result = fullResult(
      await createCtx(internals).agent(PROMPT, {
        limits: {
          maxToolCalls: 2,
          toolBudgetExtension: { increment: 2, maxExtensions: 1 },
        },
        tools: [pagerTool],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(executions).toHaveLength(2);
    expect(result.toolBudget).toEqual({ used: 4, cap: 4, extensionsGranted: 1 });
    for (const call of adapter.calls) {
      const notices = (call as { messages: Msg[] }).messages
        .filter((msg) => msg.role === 'user')
        .flatMap((msg) => msg.parts)
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .filter((part) => part.text.startsWith('Tool budget extended:'));
      expect(notices).toHaveLength(1);
    }
    await internals.replayer.flush();
    expect(decisionsOf(internals.replayer.snapshot(), 'tool_budget_extension')).toHaveLength(1);
  });

  it('a replay rebuilds the journal-backed summary with zero adapter calls', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const executions: unknown[] = [];
    const liveAdapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: { page: 1 } },
              { name: 'read', args: { page: 2 } },
              { name: 'read', args: { page: 3 } },
            ],
          }
        : { text: 'done' },
    );
    const { internals, store } = makeInternals({
      adapters: [liveAdapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const opts = {
      limits: {
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      },
      memoizeOutcome: true,
      result: 'full',
    } as const;
    const live = fullResult(
      await createCtx(internals).agent('research the repo', {
        ...opts,
        tools: [pager(executions)],
      }),
    );
    expect(live.toolBudget).toEqual({ used: 3, cap: 4, extensionsGranted: 1 });
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = scriptedAdapter(() => ({ text: 'never' }));
    const replayExecutions: unknown[] = [];
    const { internals: resumed, events } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('research the repo', {
        ...opts,
        tools: [pager(replayExecutions)],
      }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayExecutions).toHaveLength(0);
    expect(replayed.status).toBe('ok');
    expect(replayed.toolBudget).toEqual(live.toolBudget);
    const ends = events.ofType('agent:end');
    expect(ends).toEqual([expect.objectContaining({ toolBudget: live.toolBudget })]);
  });

  it('the window entry journals once and replays into the summary', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const executions: unknown[] = [];
    const liveAdapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'read', args: { page: 1 } } } : { text: 'done' },
    );
    const { internals, store } = makeInternals({
      adapters: [liveAdapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const opts = {
      limits: {
        maxToolCalls: 3,
        finalizationWindow: { reserveCalls: 2, allow: ['read'] as string[] },
      },
      memoizeOutcome: true,
      result: 'full',
    } as const;
    const live = fullResult(
      await createCtx(internals).agent('wrap up', { ...opts, tools: [pager(executions)] }),
    );
    expect(live.status).toBe('ok');
    expect(live.toolBudget).toEqual({ used: 1, cap: 3, finalizationWindowEntered: true });
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const dispatch = entries.find((entry) => entry.kind === 'agent' && entry.status === 'running');
    expect(decisionsOf(entries, 'finalization_window_entry')).toEqual([
      {
        decisionType: 'finalization_window_entry',
        targetRef: dispatch?.seq,
        remaining: 2,
        reserveCalls: 2,
        budget: 'tool calls',
      },
    ]);
    const prior = await store.load('test-run');

    const replayAdapter = scriptedAdapter(() => ({ text: 'never' }));
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('wrap up', { ...opts, tools: [pager([])] }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    // The journal-backed fields restore; the cap is configuration
    // derived and stays live-only fidelity when no grant journaled it.
    expect(replayed.toolBudget).toEqual({ used: 1, finalizationWindowEntered: true });
  });

  it('a grant-free capped run journals no decision entries at all', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'read', args: { page: 1 } } } : { text: 'done' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('read one page', {
        limits: {
          maxToolCalls: 5,
          toolBudgetExtension: { increment: 2, maxExtensions: 1 },
          finalizationWindow: { reserveCalls: 2, allow: ['read'] },
        },
        tools: [pager(executions)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    await internals.replayer.flush();
    const decisions = internals.replayer.snapshot().filter((entry) => entry.kind === 'decision');
    expect(decisions).toEqual([]);
  });
});
