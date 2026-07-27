/**
 * The engine-level terminal-at-exhausted-budget scenario (RV306, judge
 * P0.3 of the seventh comparison experiment): the unit suite proves the
 * dispatch mechanics (tool-dispatch.test.ts), this file proves the SAME
 * shapes through a real engine run with the journal underneath: the
 * terminal finish dispatches after the cap, its validator rejection
 * travels back, the repair lands, batch neighbors get the typed skip,
 * and the non-terminal control still settles 'limit'.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Msg } from '../l0/messages.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import { tool } from '../tools/tool.js';
import { createCtx, type AgentOpts } from './ctx.js';
import { kTerminalTool, type InternalAgentHooks } from './internal.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const fullResult = (value: unknown): AgentResult<unknown> => value as AgentResult<unknown>;

const readTool = (executions: { count: number }) =>
  tool({
    name: 'read',
    description: 'reads evidence',
    parameters: z.strictObject({}),
    execute: () => {
      executions.count += 1;
      return Promise.resolve({ page: executions.count });
    },
  });

const finishTool = () =>
  tool({
    name: 'finish',
    description: 'the terminal tool',
    parameters: z.strictObject({ result: z.string() }),
    execute: () => Promise.resolve('unused: the interception ends the loop'),
  });

const rejectShort = (call: { result: unknown }) =>
  Promise.resolve(
    typeof call.result === 'string' && call.result.length >= 20
      ? { ok: true as const }
      : {
          ok: false as const,
          feedback: { error: 'the result is below the minimum; repair and call finish again' },
        },
  );

const optsOf = (
  executions: { count: number },
  limits: AgentOpts['limits'],
): AgentOpts & InternalAgentHooks & { result: 'full' } => ({
  limits,
  tools: [readTool(executions), finishTool()],
  result: 'full',
  [kTerminalTool]: { name: 'finish', validate: rejectShort },
});

describe('terminal admission at the exhausted budget through the engine (RV306)', () => {
  it('the finish dispatches after the cap, the rejection travels, and the repair settles ok in the journal', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return {
          toolCalls: [
            { name: 'read', args: {} },
            { name: 'read', args: {} },
          ],
        };
      }
      if (call === 1) {
        return { toolCall: { name: 'finish', args: { result: 'too short' } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'the expanded repaired final' } } };
    });
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent(
        'gather evidence and finish',
        optsOf(executions, { maxTurns: 4, maxToolCalls: 2 }),
      ),
    );
    expect(result.status).toBe('ok');
    expect(result.output).toBe('the expanded repaired final');
    expect(executions.count).toBe(2);

    // The admission is loud: the engine logged the exemption, and the
    // terminal tool actually STARTED twice after the cap (the rejected
    // exchange and the accepted repair).
    const logs = events.ofType('log') as Array<{ msg: string }>;
    expect(logs.some((entry) => entry.msg.includes('admitted at the exhausted tool budget'))).toBe(
      true,
    );
    const finishStarts = events
      .ofType('tool:start')
      .filter((entry) => (entry as { toolName?: string }).toolName === 'finish');
    expect(finishStarts).toHaveLength(2);
    const finishEnds = events
      .ofType('tool:end')
      .filter((entry) => (entry as { toolName?: string }).toolName === 'finish')
      .map((entry) => (entry as { outcome?: string }).outcome);
    expect(finishEnds).toEqual(['error', 'ok']);

    // The engine journaled the invocation as an ordinary ok terminal.
    await internals.replayer.flush();
    const agentEntries = internals.replayer
      .snapshot()
      .filter((entry) => entry.kind === 'agent' && entry.status !== 'running');
    expect(agentEntries).toHaveLength(1);
    expect(agentEntries[0]?.status).toBe('ok');
  });

  it('a batch neighbor beside the admitted terminal gets the typed skip, visible to the repair turn', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return {
          toolCalls: [
            { name: 'read', args: {} },
            { name: 'read', args: {} },
          ],
        };
      }
      if (call === 1) {
        return {
          toolCalls: [
            { name: 'read', args: {} },
            { name: 'finish', args: { result: 'too short' } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'the expanded repaired final' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent(
        'gather evidence and finish',
        optsOf(executions, { maxTurns: 4, maxToolCalls: 2 }),
      ),
    );
    expect(result.status).toBe('ok');
    // The third read never executed; its slot was answered typed.
    expect(executions.count).toBe(2);
    const repairView = (adapter.calls[2] as { messages: Msg[] }).messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .filter(
        (
          part,
        ): part is {
          type: 'tool-result';
          id: string;
          name: string;
          result: unknown;
          isError?: boolean;
        } => part.type === 'tool-result',
      );
    const skipped = repairView.find(
      (part) =>
        part.name === 'read' &&
        (part.result as { skipped?: boolean } | undefined)?.skipped === true,
    );
    expect(skipped?.isError).toBe(true);
    expect(skipped?.result).toMatchObject({ limiter: 'maxToolCalls', skipped: true });
    expect(repairView.some((part) => part.name === 'finish' && part.isError === true)).toBe(true);
  });

  it('the control: only non-terminal calls at the cap still journal as limit', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter(() => ({
      toolCalls: [
        { name: 'read', args: {} },
        { name: 'read', args: {} },
      ],
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent(
        'gather evidence and finish',
        optsOf(executions, { maxTurns: 3, maxToolCalls: 2 }),
      ),
    );
    expect(result.status).toBe('limit');
    expect(executions.count).toBe(2);
    await internals.replayer.flush();
    const agentEntries = internals.replayer
      .snapshot()
      .filter((entry) => entry.kind === 'agent' && entry.status !== 'running');
    expect(agentEntries).toHaveLength(1);
    expect(agentEntries[0]?.status).toBe('limit');
  });
});
