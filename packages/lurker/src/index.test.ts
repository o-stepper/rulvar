import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from './index.js';
import { checkFloors, ConfigError, createEngine, defineWorkflow, renderProgress } from './index.js';
import { recommendedDefaults } from './defaults.js';

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

describe('quality floors and umbrella opinions (M4-T09)', () => {
  it('core ships no named model strings; opinions live only here', () => {
    const coreSrc = fileURLToPath(new URL('../../core/src', import.meta.url));
    const offenders: string[] = [];
    const namedModel = /claude-|gpt-\d|grok-|gemini-/i;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        // Shipped code only: identity fixtures in tests legitimately use
        // realistic-looking refs and are never published.
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
          continue;
        }
        if (namedModel.test(readFileSync(path, 'utf8'))) {
          offenders.push(path);
        }
      }
    };
    walk(coreSrc);
    expect(offenders).toEqual([]);
  });

  it('recommendedDefaults pins strong orchestrate/plan floors that the router enforces', () => {
    expect(recommendedDefaults.floors.byRole?.orchestrate?.allow?.length).toBeGreaterThan(0);
    expect(() =>
      checkFloors({
        ref: 'openai:gpt-5.4-mini',
        role: 'orchestrate',
        floors: recommendedDefaults.floors,
      }),
    ).toThrow(ConfigError);
    expect(() =>
      checkFloors({
        ref: 'anthropic:claude-fable-5',
        role: 'orchestrate',
        floors: recommendedDefaults.floors,
      }),
    ).not.toThrow();
  });
});
