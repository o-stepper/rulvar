import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from './index.js';
import { createEngine, defineWorkflow, renderProgress } from './index.js';

describe('@lurker/lurker umbrella (M1-T10)', () => {
  it('re-exports the core surface', () => {
    expect(typeof createEngine).toBe('function');
    expect(typeof defineWorkflow).toBe('function');
  });

  it('renders progress lines from a workflow event stream', async () => {
    const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const base = { runId: 'r1', ts: '2026-07-07T00:00:00.000Z' };
    const events: WorkflowEvent[] = [
      { ...base, seq: 0, spanId: 's0', type: 'run:start', workflow: 'review', resumed: false },
      { ...base, seq: 1, spanId: 's1', parentSpanId: 's0', type: 'phase:start', phase: 'scan' },
      {
        ...base,
        seq: 2,
        spanId: 's2',
        parentSpanId: 's1',
        type: 'agent:start',
        agentType: 'reviewer',
        model: 'fake:model',
        role: 'loop',
      },
      {
        ...base,
        seq: 3,
        spanId: 's2',
        parentSpanId: 's1',
        type: 'agent:end',
        agentType: 'reviewer',
        status: 'ok',
        usage,
        costUsd: 0.0123,
        entryRef: 1,
      },
      { ...base, seq: 4, spanId: 's0', type: 'log', level: 'info', msg: 'halfway' },
      { ...base, seq: 5, spanId: 's0', type: 'log', level: 'debug', msg: 'hidden' },
      {
        ...base,
        seq: 6,
        spanId: 's0',
        type: 'budget:update',
        spentUsd: 0.0123,
        remainingUsd: 0.9877,
        committedReserveUsd: 0,
      },
      { ...base, seq: 7, spanId: 's0', type: 'run:end', status: 'ok', totalUsd: 0.0123 },
    ];
    async function* stream(): AsyncIterable<WorkflowEvent> {
      for (const event of events) {
        yield await Promise.resolve(event);
      }
    }
    const lines: string[] = [];
    await renderProgress(stream(), { write: (line) => lines.push(line) });
    expect(lines).toEqual([
      'run r1 started: review',
      'phase: scan',
      'agent reviewer -> fake:model (loop)',
      'agent reviewer ok (0.0123 USD, 5 out tokens)',
      '[info] halfway',
      'budget: spent 0.0123 USD, remaining 0.9877 USD',
      'run finished: ok (total 0.0123 USD)',
    ]);
  });
});
