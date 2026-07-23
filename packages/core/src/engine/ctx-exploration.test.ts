/**
 * The exploration guard abort through the engine (RV-210): the tripped
 * no-new-evidence guard settles 'limit' with abortClass 'exploration',
 * journals its structured summary in the terminal error payload, and
 * memoizes like every engine-decided abort, so a resume replays the
 * same typed evidence with zero live calls. For an invocation the guard
 * merely observed (status ok), the summary is live telemetry only,
 * exactly like transportRetries.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AgentResult } from '../runtime/agent-loop.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

function samePage(executions: unknown[]) {
  return tool({
    name: 'search',
    description: 'searches the repository',
    parameters: z.strictObject({ q: z.string() }),
    execute: (input) => {
      executions.push(input);
      return Promise.resolve({ page: 'the same content every time' });
    },
  });
}

const oscillator = () =>
  scriptedAdapter((_req, call) =>
    call <= 2
      ? { toolCall: { name: 'search', args: { q: `query-${call}` } } }
      : { text: 'never reached' },
  );

const EXPECTED_SUMMARY = {
  toolCallsUsed: 3,
  distinctSignatures: 3,
  repeatedCalls: 0,
  duplicateResultCalls: 2,
  deniedRepeats: 0,
  byTool: { search: 3 },
};

describe('the exploration abort through the engine (RV-210)', () => {
  it('journals the summary with the abort and carries it on the live agent:end', async () => {
    const executions: unknown[] = [];
    const adapter = oscillator();
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('research the repo', {
        limits: { maxNoNewEvidenceCalls: 2 },
        tools: [samePage(executions)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('exploration');
    expect(result.exploration).toEqual(EXPECTED_SUMMARY);

    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'limit');
    expect(terminal?.memoizeOutcome).toBe(true);
    expect(terminal?.error?.data).toMatchObject({
      abortClass: 'exploration',
      exploration: EXPECTED_SUMMARY,
    });
    const ends = events.ofType('agent:end');
    expect(ends).toEqual([expect.objectContaining({ exploration: EXPECTED_SUMMARY })]);
  });

  it('replays the same typed evidence with zero live calls', async () => {
    const executions: unknown[] = [];
    const adapter = oscillator();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const live = fullResult(
      await createCtx(internals).agent('research the repo', {
        limits: { maxNoNewEvidenceCalls: 2 },
        tools: [samePage(executions)],
        result: 'full',
      }),
    );
    expect(live.abortClass).toBe('exploration');
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = oscillator();
    const replayExecutions: unknown[] = [];
    const { internals: resumed, events: replayEvents } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('research the repo', {
        limits: { maxNoNewEvidenceCalls: 2 },
        tools: [samePage(replayExecutions)],
        result: 'full',
      }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayExecutions).toHaveLength(0);
    expect(replayed.status).toBe('limit');
    expect(replayed.abortClass).toBe('exploration');
    expect(replayed.exploration).toEqual(EXPECTED_SUMMARY);
    const ends = replayEvents.ofType('agent:end');
    expect(ends).toEqual([expect.objectContaining({ exploration: EXPECTED_SUMMARY })]);
  });

  it('an ok invocation keeps the summary live-only, like transportRetries', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'search', args: { q: 'once' } } } : { text: 'done' },
    );
    const { internals, store, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('research the repo', {
        limits: { maxNoNewEvidenceCalls: 5 },
        tools: [samePage(executions)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.exploration).toMatchObject({ toolCallsUsed: 1, duplicateResultCalls: 0 });
    const liveEnd = events.ofType('agent:end')[0] as { exploration?: unknown };
    expect(liveEnd.exploration).toEqual(result.exploration);

    await internals.replayer.flush();
    const prior = await store.load('test-run');
    const { internals: resumed, events: replayEvents } = makeInternals({
      adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('research the repo', {
        limits: { maxNoNewEvidenceCalls: 5 },
        tools: [samePage([])],
        result: 'full',
      }),
    );
    expect(replayed.status).toBe('ok');
    // Nothing journaled it, so the replayed result and event omit it.
    expect(replayed.exploration).toBeUndefined();
    const replayEnd = replayEvents.ofType('agent:end')[0] as { exploration?: unknown };
    expect(replayEnd.exploration).toBeUndefined();
  });
});
