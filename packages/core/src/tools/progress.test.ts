/**
 * The stock progress tool and the terminal scan (RV-210 close-out).
 * The tool is stateless and deterministic (a verbatim repeated report is
 * a duplicate result digest to the exploration guards, by composition);
 * latestProgressReport pairs calls with SUCCESSFUL results by id and
 * normalizes the last one, mirroring the guard's restore posture.
 */
import { describe, expect, it } from 'vitest';

import type { Msg } from '../l0/messages.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import {
  latestProgressReport,
  PROGRESS_REPORT_TOOL_NAME,
  progressReportTool,
} from './progress.js';

const ctx = {} as ToolContext;

function reportMsgs(
  id: string,
  args: unknown,
  opts: { isError?: boolean; name?: string } = {},
): Msg[] {
  const name = opts.name ?? PROGRESS_REPORT_TOOL_NAME;
  return [
    { role: 'assistant', parts: [{ type: 'tool-call', id, name, args }] },
    {
      role: 'tool',
      parts: [
        {
          type: 'tool-result',
          id,
          name,
          result: { recorded: true },
          ...(opts.isError === true ? { isError: true } : {}),
        },
      ],
    },
  ];
}

describe('progressReportTool', () => {
  it('is a read-risk tool named report_progress with a deterministic counting result', async () => {
    const def = progressReportTool();
    expect(def.name).toBe(PROGRESS_REPORT_TOOL_NAME);
    expect(def.risk).toBe('read');
    const result = await def.execute(
      { facts: ['a', 'b'], evidence: ['x.ts:1'], questions: [] },
      ctx,
    );
    expect(result).toEqual({ recorded: true, facts: 2, evidence: 1, questions: 0 });
    // Byte-identical input, byte-identical output: guard composition.
    const again = await def.execute(
      { facts: ['a', 'b'], evidence: ['x.ts:1'], questions: [] },
      ctx,
    );
    expect(JSON.stringify(again)).toBe(JSON.stringify(result));
  });
});

describe('latestProgressReport', () => {
  it('returns the LAST successful report, normalized', () => {
    const messages: Msg[] = [
      ...reportMsgs('r1', { facts: ['first'] }),
      ...reportMsgs('r2', {
        facts: ['second', 7, 'third'],
        evidence: ['a.ts:3'],
        questions: ['why?'],
        note: 'halfway',
      }),
    ];
    expect(latestProgressReport(messages)).toEqual({
      facts: ['second', 'third'],
      evidence: ['a.ts:3'],
      questions: ['why?'],
      note: 'halfway',
    });
  });

  it('skips error results, foreign tools, and malformed args', () => {
    const messages: Msg[] = [
      ...reportMsgs('r1', { facts: ['kept'] }),
      ...reportMsgs('r2', { facts: ['denied'] }, { isError: true }),
      ...reportMsgs('r3', { facts: ['other tool'] }, { name: 'record_evidence' }),
      ...reportMsgs('r4', 'not an object'),
    ];
    expect(latestProgressReport(messages)).toEqual({
      facts: ['kept'],
      evidence: [],
      questions: [],
    });
  });

  it('returns undefined when no report exists', () => {
    expect(latestProgressReport([])).toBeUndefined();
    expect(
      latestProgressReport([
        { role: 'user', parts: [{ type: 'text', text: 'no tools here' }] },
      ]),
    ).toBeUndefined();
  });
});
