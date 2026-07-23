/**
 * Compaction pipeline tests (M4-T03): the threshold check, the summary
 * replacement, the loop integration with long fake transcripts, the
 * checkpointed points, and the no-re-summarize-on-resume acceptance
 * (M4-T03).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CheckpointState } from '../journal/checkpoint.js';
import type { Msg } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import {
  COMPACTION_SUMMARY_PREFIX,
  compactMessages,
  shouldCompact,
  summarizeInstruction,
} from './compaction.js';
import { mergeUsageLimits } from './usage-limits.js';

const loopResolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

const sumResolved: ResolvedInvocation = {
  ref: 'sum:small',
  adapterId: 'sum',
  model: 'small',
  canonical: { kind: 'model', model: 'sum:small' },
  scrubs: [],
};

const clock = tool({
  name: 'clock',
  description: 'tells the time',
  parameters: z.strictObject({}),
  execute: () => Promise.resolve('12:00'),
});

function runtimeOf(defs: ToolDef[]): ToolRuntime {
  return {
    defs,
    contracts: defs.map((def) => toolContract(def)),
    contextFor: (toolName) => ({
      runId: 'run-1',
      spanId: `span-${toolName}`,
      agent: { agentType: '' },
      cwd: process.cwd(),
      isolation: 'none',
      signal: new AbortController().signal,
      log: () => undefined,
    }),
  };
}

describe('shouldCompact / compactMessages (unit)', () => {
  it('trips at the threshold fraction of the context window', () => {
    const base = { contextWindow: 200_000 };
    expect(
      shouldCompact({ lastTurnUsage: { inputTokens: 159_999, outputTokens: 0 }, ...base }),
    ).toBe(false);
    expect(
      shouldCompact({ lastTurnUsage: { inputTokens: 159_999, outputTokens: 1 }, ...base }),
    ).toBe(true);
    expect(
      shouldCompact({
        lastTurnUsage: { inputTokens: 90_000, outputTokens: 0 },
        contextWindow: 200_000,
        threshold: 0.45,
      }),
    ).toBe(true);
  });

  it('replaces everything after the first message with one user summary', () => {
    const messages: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'the task' }] },
      { role: 'assistant', parts: [{ type: 'text', text: 'turn 1' }] },
      { role: 'tool', parts: [{ type: 'tool-result', id: 'c1', name: 'clock', result: 'x' }] },
    ];
    const compacted = compactMessages(messages, 'what happened so far');
    expect(compacted).toHaveLength(2);
    expect(compacted[0]).toBe(messages[0]);
    expect(compacted[1]?.role).toBe('user');
    const text = compacted[1]?.parts[0];
    expect(text?.type === 'text' && text.text).toBe(
      `${COMPACTION_SUMMARY_PREFIX}\nwhat happened so far`,
    );
  });
});

describe('compaction in the agent loop (M4-T03)', () => {
  const bigTurnUsage = { inputTokens: 170_000, outputTokens: 10 };

  it('fires summarize at the boundary, compacts, checkpoints the point, and resumes compact', async () => {
    const loop = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'clock', args: {} }, usage: bigTurnUsage }
        : { text: 'done' },
    );
    const summarizer = scriptedAdapter(() => ({ text: 'compact state of the work' }), {
      id: 'sum',
    });
    const states: CheckpointState[] = [];
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'do the long thing',
      adapter: loop,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([clock]),
      summarize: { adapter: summarizer, resolved: sumResolved },
      checkpoint: {
        load: () => Promise.resolve(undefined),
        save: (state) => {
          states.push(state);
          return Promise.resolve();
        },
      },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');

    // The summarize request: projected transcript + instruction, the
    // contracts present with toolChoice none.
    expect(summarizer.calls).toHaveLength(1);
    const sumReq = summarizer.calls[0];
    expect(sumReq?.toolChoice).toBe('none');
    expect(sumReq?.tools?.map((t) => t.name)).toEqual(['clock']);
    const lastPart = sumReq?.messages.at(-1)?.parts[0];
    const instruction = summarizeInstruction().parts[0];
    expect(lastPart?.type === 'text' && instruction.type === 'text' && lastPart.text).toBe(
      instruction.type === 'text' ? instruction.text : '',
    );

    // The next loop turn saw ONLY the compacted history.
    expect(loop.calls).toHaveLength(2);
    expect(loop.calls[1]?.messages).toHaveLength(2);
    expect(loop.calls[1]?.messages.map((m) => m.role)).toEqual(['user', 'user']);
    const summaryPart = loop.calls[1]?.messages[1]?.parts[0];
    expect(
      summaryPart?.type === 'text' && summaryPart.text.startsWith(COMPACTION_SUMMARY_PREFIX),
    ).toBe(true);

    // The boundary checkpoint carries the compaction point (the turn
    // number of the summarize invocation) and the compact messages.
    const last = states.at(-1);
    expect(last?.compaction).toEqual([2]);
    expect(last?.messages).toHaveLength(2);
    // One agent:start; the compaction is its own paired phase
    // activation (the RV-207 contract).
    expect(events.ofType('agent:start').map((e) => e.role)).toEqual(['loop']);
    expect(events.ofType('agent:phase:start').map((e) => e.role)).toEqual(['loop', 'summarize']);
    expect(events.ofType('agent:phase:end').map((e) => e.role)).toEqual(['summarize', 'loop']);

    // Resume from that checkpoint: the history is already compact, the
    // run finishes without any re-summarize (acceptance).
    const resumedLoop = scriptedAdapter(() => ({ text: 'done after resume' }));
    const resumedSummarizer = scriptedAdapter(() => ({ text: 'never' }), { id: 'sum' });
    const resumed = await runAgent({
      prompt: 'do the long thing',
      adapter: resumedLoop,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([clock]),
      summarize: { adapter: resumedSummarizer, resolved: sumResolved },
      checkpoint: {
        load: () => Promise.resolve(states.at(-1)),
        save: () => Promise.resolve(),
      },
    });
    expect(resumed.status).toBe('ok');
    expect(resumed.output).toBe('done after resume');
    expect(resumedSummarizer.calls).toHaveLength(0);
    expect(resumedLoop.calls[0]?.messages).toHaveLength(2);
  });

  it('a profile threshold overrides the 0.8 default', async () => {
    const loop = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'clock', args: {} }, usage: { inputTokens: 50_000, outputTokens: 5 } }
        : { text: 'done' },
    );
    const summarizer = scriptedAdapter(() => ({ text: 'small summary' }), { id: 'sum' });
    const result = await runAgent({
      prompt: 'p',
      adapter: loop,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([clock]),
      summarize: { adapter: summarizer, resolved: sumResolved },
      compaction: { threshold: 0.2 },
    });
    expect(result.status).toBe('ok');
    // 50_005 >= 0.2 * 200_000: the lowered threshold fired; the default
    // would not have (50_005 < 160_000).
    expect(summarizer.calls).toHaveLength(1);
  });

  it('a failed summarize disables compaction for the run instead of failing paid work', async () => {
    const loop = scriptedAdapter((_req, call) =>
      call <= 1
        ? { toolCall: { name: 'clock', args: {} }, usage: bigTurnUsage }
        : { text: 'survived' },
    );
    // Non-retryable (task-class) so the failure is immediate; retryable
    // summarize failures first ride RetryPolicy like any dispatch.
    const summarizer = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'summarizer down', retryable: false },
    }));
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'p',
      adapter: loop,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([clock]),
      summarize: { adapter: summarizer, resolved: sumResolved },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('survived');
    // One attempt only: the second boundary skipped the disabled pipeline.
    expect(summarizer.calls).toHaveLength(1);
    const warns = events.ofType('log').filter((e) => e.level === 'warn');
    expect(warns.some((e) => String(e.msg).includes('compaction disabled'))).toBe(true);
    // The transcript never compacted.
    expect(loop.calls[2]?.messages.length).toBeGreaterThan(2);
  });

  it('never fires without tools reaching a boundary or below threshold', async () => {
    const loop = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'clock', args: {} } } : { text: 'done' },
    );
    const summarizer = scriptedAdapter(() => ({ text: 'never' }), { id: 'sum' });
    const result = await runAgent({
      prompt: 'p',
      adapter: loop,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([clock]),
      summarize: { adapter: summarizer, resolved: sumResolved },
    });
    expect(result.status).toBe('ok');
    expect(summarizer.calls).toHaveLength(0);
  });
});
