/**
 * The minimal line printer sanitizes every emitted line (v1.21.0 review
 * P2-1): an untrusted provider/tool/log string cannot inject a control
 * sequence or a second physical line.
 */
import { describe, expect, it } from 'vitest';
import type { WorkflowEvent } from '@rulvar/core';

import { renderProgress } from './render-progress.js';

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
    return (n <= 0x1f && n !== 0x0a) || (n >= 0x7f && n <= 0x9f);
  });

describe('renderProgress terminal safety', () => {
  it('neutralizes control characters in every field and preserves visible text', async () => {
    const lines: string[] = [];
    async function* stream(): AsyncGenerator<WorkflowEvent> {
      await Promise.resolve();
      yield ev({ type: 'run:start', workflow: `wf${EVIL}`, resumed: false }, 'root');
      yield ev({ type: 'phase:start', phase: `p${EVIL}` }, 'root');
      yield ev(
        {
          type: 'agent:start',
          agentType: `w${EVIL}`,
          label: EVIL,
          model: `m${EVIL}`,
          role: 'loop',
        },
        'a1',
      );
      yield ev(
        {
          type: 'agent:error',
          agentType: 'w',
          error: { message: EVIL, code: 'agent', retryable: false },
          willRetry: false,
        },
        'a1',
      );
      yield ev({ type: 'log', level: 'error', msg: EVIL }, 'root');
      yield ev({ type: 'run:end', status: 'ok', totalUsd: 0 }, 'root');
    }
    await renderProgress(stream(), { write: (l) => lines.push(l) });
    for (const line of lines) {
      expect(line).not.toContain(ESC);
      // renderProgress hands the sink one line at a time; each must be a
      // single physical line with no control byte.
      expect(line.split('\n')).toHaveLength(1);
      expect(badByteInLine(line), JSON.stringify(line)).toBe(false);
    }
    const joined = lines.join('\n');
    expect(joined).toContain('ERR');
    expect(joined).toContain('INJECT');
  });

  it('leaves clean lines byte-identical', async () => {
    const lines: string[] = [];
    async function* stream(): AsyncGenerator<WorkflowEvent> {
      await Promise.resolve();
      yield ev({ type: 'run:start', workflow: 'panel', resumed: false }, 'root');
      yield ev({ type: 'run:end', status: 'ok', totalUsd: 0.5 }, 'root');
    }
    await renderProgress(stream(), { write: (l) => lines.push(l) });
    expect(lines[0]).toBe('run R1 started: panel');
    expect(lines.at(-1)).toBe('run finished: ok (total 0.5000 USD)');
  });
});
