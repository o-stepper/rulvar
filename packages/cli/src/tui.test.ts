/**
 * The CLI event-line renderer sanitizes untrusted fields (v1.21.0 review
 * P2-1): a provider/tool/log string cannot inject a control sequence or a
 * second physical line into CLI output.
 */
import { describe, expect, it } from 'vitest';
import type { WorkflowEvent } from '@rulvar/core';

import { renderEventLine } from './tui.js';

const ESC = String.fromCharCode(0x1b);
const CR = String.fromCharCode(0x0d);
const EVIL = `ERR${CR}\n${ESC}[2J${ESC}[31mINJECT`;

let seq = 0;
function ev(body: Record<string, unknown>, span = 's1'): WorkflowEvent {
  seq += 1;
  return {
    runId: 'R1',
    seq,
    ts: '2026-01-01T00:00:00.000Z',
    spanId: span,
    ...body,
  } as unknown as WorkflowEvent;
}

const badByteInLine = (line: string): boolean =>
  [...line].some((c) => {
    const n = c.charCodeAt(0);
    return n <= 0x1f || (n >= 0x7f && n <= 0x9f);
  });

describe('renderEventLine terminal safety', () => {
  const CASES: WorkflowEvent[] = [
    ev({ type: 'run:start', workflow: EVIL, resumed: false }, 'root'),
    ev({ type: 'phase:start', phase: EVIL }, 'root'),
    ev({ type: 'agent:start', agentType: EVIL, label: EVIL, model: EVIL, role: 'loop' }, 'a1'),
    ev(
      {
        type: 'agent:error',
        agentType: 'w',
        error: { message: EVIL, code: 'agent', retryable: false },
        willRetry: false,
      },
      'a1',
    ),
    ev({ type: 'tool:start', toolName: EVIL }, 'a1'),
    ev({ type: 'approval:pending', toolName: EVIL, entryRef: 1 }, 'a1'),
    ev({ type: 'log', level: 'error', msg: EVIL }, 'root'),
  ];

  it.each(CASES)('neutralizes control characters in $type', (event) => {
    const line = renderEventLine(event);
    expect(line).toBeDefined();
    expect(line).not.toContain(ESC);
    expect(badByteInLine(line as string)).toBe(false);
    // Never a second physical line.
    expect((line as string).split('\n')).toHaveLength(1);
  });

  it('leaves a clean event line byte-identical', () => {
    const line = renderEventLine(ev({ type: 'phase:start', phase: 'gather' }, 'root'));
    expect(line).toBe('phase gather');
  });

  it('renders the RV-207 phase pair and retry facts', () => {
    const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };
    expect(
      renderEventLine(
        ev(
          {
            type: 'agent:phase:start',
            agentType: 'reviewer',
            role: 'extract',
            model: 'fake:extract',
            invocation: 2,
          },
          'a1',
        ),
      ),
    ).toBe('agent reviewer extract phase on fake:extract');
    expect(
      renderEventLine(
        ev(
          {
            type: 'agent:phase:end',
            agentType: 'reviewer',
            role: 'loop',
            model: 'fake:model',
            invocation: 1,
            durationMs: 59,
            usage,
            costUsd: 0.01,
            outcome: 'ok',
            retries: 2,
          },
          'a1',
        ),
      ),
    ).toBe('agent reviewer loop phase ok ($0.0100, 15 tok, 59ms, 2 retries)');
    expect(
      renderEventLine(
        ev(
          {
            type: 'agent:end',
            agentType: 'reviewer',
            status: 'ok',
            usage,
            costUsd: 0.012,
            entryRef: 2,
            retryCount: 2,
          },
          'a1',
        ),
      ),
    ).toBe('agent reviewer ok ($0.0120, 15 tok, 2 retries)');
  });
});

describe('malformed external events (v1.22.0 review P2-3)', () => {
  it('renderEventLine tolerates bare and wrong-typed recognized events', () => {
    const hostile = {
      toString(): string {
        throw new Error('never coerce me');
      },
    };
    const malformed = [
      { runId: 'R1', seq: 0, ts: 't', spanId: 's0', type: 'run:start' },
      {
        runId: 'R1',
        seq: 1,
        ts: 't',
        spanId: 's1',
        type: 'agent:end',
        status: 7,
        costUsd: 'x',
        usage: 'no',
      },
      { runId: 'R1', seq: 2, ts: 't', spanId: 's1', type: 'agent:error', error: 'flat' },
      {
        runId: 'R1',
        seq: 3,
        ts: 't',
        spanId: 's1',
        type: 'tool:end',
        outcome: hostile,
        durationMs: 'slow',
      },
      {
        runId: 'R1',
        seq: 4,
        ts: 't',
        spanId: 's1',
        type: 'approval:pending',
        toolName: hostile,
        entryRef: 'x',
      },
      { runId: 'R1', seq: 5, ts: 't', spanId: 's0', type: 'log', level: 'error', msg: hostile },
      { runId: 'R1', seq: 6, ts: 't', spanId: 's0', type: 'run:end' },
    ] as unknown as WorkflowEvent[];
    for (const event of malformed) {
      expect(() => renderEventLine(event)).not.toThrow();
    }
  });
});
