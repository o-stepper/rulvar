/**
 * The tool budget pressure snapshot through the engine (RV304): a capped
 * invocation carries used/cap (and the extension's grants) on the full
 * AgentResult and the live agent:end, the invocation table passes it
 * through, and the journal stays byte free of it: live telemetry only,
 * exactly like transportRetries.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { WorkflowEvent } from '../l0/events.js';
import { reduceInvocationTable } from '../l0/telemetry-reduce.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import { tool } from '../tools/tool.js';
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

describe('the tool budget pressure snapshot through the engine (RV304)', () => {
  it('rides the full result, the live agent:end, and the invocation table, never the journal', async () => {
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

    // The snapshot never journals: the terminal entry is byte free of it.
    await internals.replayer.flush();
    for (const entry of internals.replayer.snapshot()) {
      expect(JSON.stringify(entry)).not.toContain('toolBudget');
    }
  });
});
