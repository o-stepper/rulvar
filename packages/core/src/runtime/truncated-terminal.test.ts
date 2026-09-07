import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ConfigError } from '../l0/errors.js';
import type { Msg } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import { mergeUsageLimits, validateUsageLimits } from './usage-limits.js';

const resolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

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

const finishTool = () =>
  tool({
    name: 'finish',
    description: 'the terminal tool',
    parameters: z.strictObject({ result: z.string() }),
    execute: () => Promise.resolve('unused'),
  });

const echoTool = () =>
  tool({
    name: 'echo',
    description: 'echoes',
    parameters: z.strictObject({ text: z.string() }),
    execute: (input) => Promise.resolve(input),
  });

const toolResultsOf = (req: { messages: Msg[] }, name: string): Record<string, unknown>[] =>
  req.messages
    .filter((msg) => msg.role === 'tool')
    .flatMap((msg) => msg.parts)
    .filter(
      (part): part is { type: 'tool-result'; id: string; name: string; result: unknown } =>
        part.type === 'tool-result' && part.name === name,
    )
    .map((part) => part.result as Record<string, unknown>);

const CUT_TEXT =
  "the turn ended at its output token allowance (finish reason 'max-tokens') before the " +
  "arguments for 'finish' closed: 22 characters arrived; the turn produced 15000 output " +
  'tokens (10061 of them reasoning) against an allowance of 15000; shorten the result, split ' +
  'it across calls, lower the reasoning effort, or raise limits.maxOutputTokensPerTurn ' +
  '(https://docs.rulvar.com/guide/agents#output-truncation)';

describe('a truncated terminal call is named as a cut (RV4904, the tenth comparison experiment)', () => {
  // The coordinator's tenth provider call closed at exactly 15000
  // output tokens, 10061 of them reasoning, with the finish arguments
  // still streaming; the adapter delivered {__unparsed}, the loop said
  // "failed validation", and the repair re paid the whole document
  // under the same allowance.
  const cutFinish = {
    toolCall: { name: 'finish', args: { __unparsed: '{"result": "a long doc' } },
    finish: 'max-tokens' as const,
    usage: { outputTokens: 15_000, reasoningTokens: 10_061 },
  };

  it('the rejection names the cut with its arithmetic, once, beside the schema line', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? cutFinish : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 4, maxOutputTokensPerTurn: 15_000 }),
      tools: runtimeOf([finishTool()]),
      terminalTool: { name: 'finish' },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    expect(result.schemaRejectedTerminalExchanges).toBe(1);
    expect(result.truncatedTerminalExchanges).toBe(1);
    const [rejection] = toolResultsOf(adapter.calls[1], 'finish');
    expect(rejection?.error).toBe("the 'finish' call failed validation");
    expect(rejection?.truncation).toBe(CUT_TEXT);
    expect(events.ofType('log').map((event) => event.msg)).toContain(CUT_TEXT);
    const ends = events.ofType('tool:end');
    expect(ends[0]).toMatchObject({ outcome: 'error', errorCode: 'truncated-arguments' });
  });

  it('an ordinary unparsed rejection keeps its exact bytes', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'finish', args: { __unparsed: '{"result": "a long doc' } } }
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 4, maxOutputTokensPerTurn: 15_000 }),
      tools: runtimeOf([finishTool()]),
      terminalTool: { name: 'finish' },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.schemaRejectedTerminalExchanges).toBe(1);
    expect(result.truncatedTerminalExchanges).toBeUndefined();
    const [rejection] = toolResultsOf(adapter.calls[1], 'finish');
    expect(rejection).not.toHaveProperty('truncation');
    expect(events.ofType('tool:end')[0]).not.toHaveProperty('errorCode');
  });

  it('a cut on an ordinary tool is named the same way', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCall: { name: 'echo', args: { __unparsed: '{"text": "a long' } },
            finish: 'max-tokens' as const,
            usage: { outputTokens: 400 },
          }
        : { text: 'done' },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 4 }),
      tools: runtimeOf([echoTool()]),
      events,
    });
    expect(result.status).toBe('ok');
    const [rejection] = toolResultsOf(adapter.calls[1], 'echo');
    expect(rejection?.error).toBe("arguments for 'echo' failed validation");
    expect(rejection?.truncation).toBe(
      "the turn ended at its output token allowance (finish reason 'max-tokens') before the " +
        "arguments for 'echo' closed: 16 characters arrived; the turn produced 400 output " +
        'tokens against the adapter default allowance; shorten the result, split it across ' +
        'calls, lower the reasoning effort, or raise limits.maxOutputTokensPerTurn ' +
        '(https://docs.rulvar.com/guide/agents#output-truncation)',
    );
    expect(events.ofType('tool:end')[0]).toMatchObject({ errorCode: 'truncated-arguments' });
  });

  it('the granted repair turn requests repairTurnMaxOutputTokens; every other turn keeps its cap', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? cutFinish : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxOutputTokensPerTurn: 100,
        repairTurnMaxOutputTokens: 4000,
      }),
      tools: runtimeOf([finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(adapter.calls.map((req) => req.maxOutputTokens)).toEqual([100, 4000]);
    // The cut names the allowance the turn actually had.
    const [rejection] = toolResultsOf(adapter.calls[1], 'finish');
    expect(String(rejection?.truncation)).toContain('against an allowance of 100');

    const plain = scriptedAdapter((_req, call) =>
      call === 0 ? cutFinish : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    await runAgent({
      prompt: 'go',
      adapter: plain,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 4, maxOutputTokensPerTurn: 100 }),
      tools: runtimeOf([finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(plain.calls.map((req) => req.maxOutputTokens)).toEqual([100, 100]);
  });

  it('rejects a malformed repairTurnMaxOutputTokens typed', () => {
    expect(() => validateUsageLimits({ repairTurnMaxOutputTokens: 0 }, 'limits')).toThrow(
      ConfigError,
    );
  });
});
