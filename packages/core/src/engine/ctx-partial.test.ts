/**
 * The structured terminal partial through the engine (RV-210 close-out).
 * Reproduced on published 1.54.0: a 'limit' terminal carried nothing of
 * the collected work; the recorded progress report was lost. The
 * contract: a limit terminal keeps the LAST successful report_progress
 * call as AgentResult.partial, a final boundary checkpoint pins the
 * message window (written only when a report exists, so runs without the
 * tool stay byte-identical), and a replay rebuilds the identical partial
 * from that checkpoint with zero live calls.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AgentResult } from '../runtime/agent-loop.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { progressReportTool } from '../tools/progress.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

const noop = (executions: unknown[]) =>
  tool({
    name: 'noop',
    description: 'does nothing',
    parameters: z.strictObject({}),
    execute: () => {
      executions.push(1);
      return Promise.resolve('noop');
    },
  });

const REPORT = {
  facts: ['the cache doubles at dawn'],
  evidence: ['cache.ts:12'],
  questions: ['who resets it?'],
};

/** Turn 0 reports, later turns burn noops into the maxToolCalls cap. */
const reportingAdapter = () =>
  scriptedAdapter((_req, call) =>
    call === 0
      ? { toolCall: { name: 'report_progress', args: REPORT } }
      : { toolCall: { name: 'noop', args: {} } },
  );

describe('the structured terminal partial (RV-210 close-out)', () => {
  it('a limit terminal keeps the last successful report as result.partial', async () => {
    const executions: unknown[] = [];
    const { internals } = makeInternals({
      adapters: [reportingAdapter()],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('collect', {
        limits: { maxTurns: 8, maxToolCalls: 2 },
        tools: [progressReportTool(), noop(executions)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.partial).toEqual({ ...REPORT });
    // The terminal journaled a checkpoint ref so replay reads the same window.
    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'limit');
    expect(terminal?.checkpointRef).toBeDefined();
  });

  it('a memoized limit (the exploration abort) replays the identical partial, zero live calls', async () => {
    // A plain cap-expiry limit re-runs by the disposition predicate
    // (memoize-limit without the stamp), so the DIRECT-layer replay
    // identity claim is pinned on the memoized abort; the orchestrator
    // recovery identity is pinned in salvage.test.ts.
    const circleAdapter = () =>
      scriptedAdapter((_req, call) =>
        call === 0
          ? { toolCall: { name: 'report_progress', args: REPORT } }
          : { toolCall: { name: 'same', args: { q: 'page' } } },
      );
    const samePage = (executions: unknown[]) =>
      tool({
        name: 'same',
        description: 'always the same page',
        parameters: z.strictObject({ q: z.string() }),
        execute: () => {
          executions.push(1);
          return Promise.resolve({ page: 'identical' });
        },
      });
    // The partial restores from the terminal CHECKPOINT, so the replay
    // shares the transcript store exactly like a real resume does.
    const transcripts = new InMemoryTranscriptStore();
    const { internals, store } = makeInternals({
      adapters: [circleAdapter()],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const live = fullResult(
      await createCtx(internals).agent('collect', {
        limits: { maxTurns: 12, maxNoNewEvidenceCalls: 2 },
        tools: [progressReportTool(), samePage([])],
        result: 'full',
      }),
    );
    expect(live.status).toBe('limit');
    expect(live.abortClass).toBe('exploration');
    expect(live.partial).toEqual({ ...REPORT });
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = circleAdapter();
    const replayExecutions: unknown[] = [];
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('collect', {
        limits: { maxTurns: 12, maxNoNewEvidenceCalls: 2 },
        tools: [progressReportTool(), samePage(replayExecutions)],
        result: 'full',
      }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayExecutions).toHaveLength(0);
    expect(replayed.status).toBe('limit');
    expect(replayed.partial).toEqual(live.partial);
  });

  it('a limit terminal without any report stays bare', async () => {
    const adapter = scriptedAdapter(() => ({ toolCall: { name: 'noop', args: {} } }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('burn out', {
        limits: { maxTurns: 8, maxToolCalls: 2 },
        tools: [noop([])],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.partial).toBeUndefined();
  });

  it('an ok terminal never carries a partial (the finish IS the result)', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'report_progress', args: REPORT } }
        : { text: 'the full answer' },
    );
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('finishes fine', {
        limits: { maxTurns: 8, maxToolCalls: 4 },
        tools: [progressReportTool()],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.partial).toBeUndefined();
  });

  it('the exploration abort keeps the partial too (both are limit terminals)', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'report_progress', args: REPORT } }
        : { toolCall: { name: 'same', args: { q: 'page' } } },
    );
    const samePage = tool({
      name: 'same',
      description: 'always the same page',
      parameters: z.strictObject({ q: z.string() }),
      execute: () => Promise.resolve({ page: 'identical' }),
    });
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('circles', {
        limits: { maxTurns: 12, maxNoNewEvidenceCalls: 2, maxRepeatedToolSignature: 5 },
        tools: [progressReportTool(), samePage],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('exploration');
    expect(result.partial).toEqual({ ...REPORT });
  });
});
