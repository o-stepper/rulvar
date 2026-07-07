import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Part } from '../l0/messages.js';
import type { ToolContext, ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import { ModelRetry } from './model-retry.js';
import { mergeUsageLimits } from './usage-limits.js';

const resolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

function runtimeOf(defs: ToolDef[], contexts?: ToolContext[]): ToolRuntime {
  return {
    defs,
    contracts: defs.map((def) => toolContract(def)),
    contextFor: (toolName) => {
      const ctx: ToolContext = {
        runId: 'run-1',
        spanId: `span-${toolName}`,
        agent: { agentType: '' },
        cwd: process.cwd(),
        isolation: 'none',
        signal: new AbortController().signal,
        log: () => undefined,
      };
      contexts?.push(ctx);
      return ctx;
    },
  };
}

function toolResults(req: { messages: Array<{ role: string; parts: Part[] }> }): Part[] {
  return req.messages
    .filter((msg) => msg.role === 'tool')
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'tool-result');
}

describe('agent loop tool dispatch (M3-T01)', () => {
  it('executes a tool call, feeds the result back, and finishes on the next turn', async () => {
    const seen: unknown[] = [];
    const contexts: ToolContext[] = [];
    const lookup = tool({
      name: 'lookup',
      description: 'looks up a fact',
      parameters: z.strictObject({ topic: z.string() }),
      execute: (input, ctx) => {
        seen.push(input, ctx.spanId);
        return Promise.resolve({ fact: `${input.topic} is fine` });
      },
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'lookup', args: { topic: 'weather' } } }
        : { text: 'the weather is fine' },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'check the weather',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup], contexts),
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('the weather is fine');
    expect(result.turns).toBe(2);
    expect(seen).toEqual([{ topic: 'weather' }, 'span-lookup']);
    // The second request carries the tool result for the model.
    const results = toolResults(adapter.calls[1]);
    expect(results).toEqual([
      {
        type: 'tool-result',
        id: 'id-0-0',
        name: 'lookup',
        result: { fact: 'weather is fine' },
      },
    ]);
    // The wire request declares the contract, not the definition.
    expect(adapter.calls[0]?.tools).toEqual([toolContract(lookup)]);
    expect(events.ofType('tool:start')).toHaveLength(1);
    expect(events.ofType('tool:end')).toEqual([
      expect.objectContaining({ toolName: 'lookup', outcome: 'ok' }),
    ]);
  });

  it('surfaces argument-validation failure as an error tool result, never a throw', async () => {
    const lookup = tool({
      name: 'lookup',
      description: 'x',
      parameters: z.strictObject({ topic: z.string() }),
      execute: () => Promise.resolve('never reached'),
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'lookup', args: { topic: 42 } } } : { text: 'recovered' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup]),
    });
    expect(result.status).toBe('ok');
    const results = toolResults(adapter.calls[1]);
    expect(results[0]).toMatchObject({ isError: true });
    expect((results[0] as { result: { issues: string[] } }).result.issues.length).toBeGreaterThan(
      0,
    );
  });

  it('an unknown tool name yields an error tool result', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'ghost', args: {} } } : { text: 'done' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([]),
    });
    expect(result.status).toBe('ok');
    const results = toolResults(adapter.calls[1]);
    expect(results[0]).toMatchObject({
      isError: true,
      result: { error: "unknown tool 'ghost'" },
    });
  });

  it('converts ModelRetry into an error tool result and marks exhaustion beyond the bound', async () => {
    const flaky = tool({
      name: 'flaky',
      description: 'always requests a retry',
      parameters: {},
      execute: () => {
        throw new ModelRetry('try again with a narrower query', { data: { hint: 'narrow' } });
      },
    });
    const adapter = scriptedAdapter((_req, call) =>
      call < 3 ? { toolCall: { name: 'flaky', args: {} } } : { text: 'gave up politely' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([flaky]),
    });
    expect(result.status).toBe('ok');
    const first = toolResults(adapter.calls[1])[0] as { result: Record<string, unknown> };
    const second = toolResults(adapter.calls[2])[1] ?? toolResults(adapter.calls[2])[0];
    const third = toolResults(adapter.calls[3]).at(-1) as {
      result: Record<string, unknown>;
    };
    expect(first.result).toEqual({
      error: 'try again with a narrower query',
      data: { hint: 'narrow' },
    });
    expect(second).toMatchObject({ isError: true });
    // Third consecutive conversion exceeds the default bound of 2.
    expect(third.result.retriesExhausted).toBe(true);
  });

  it('a throwing execute becomes an error tool result and the loop proceeds', async () => {
    const boom = tool({
      name: 'boom',
      description: 'explodes',
      parameters: {},
      execute: () => {
        throw new Error('kaboom');
      },
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'boom', args: {} } } : { text: 'survived' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([boom]),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('survived');
    const results = toolResults(adapter.calls[1]);
    expect(results[0]).toMatchObject({ isError: true, result: { error: 'kaboom' } });
  });

  it('a non-serializable tool result is surfaced to the model as an error result', async () => {
    const leaky = tool({
      name: 'leaky',
      description: 'returns a class instance',
      parameters: {},
      execute: () => Promise.resolve(new Map([['a', 1]])),
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'leaky', args: {} } } : { text: 'noted' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([leaky]),
    });
    expect(result.status).toBe('ok');
    const results = toolResults(adapter.calls[1]);
    expect(results[0]).toMatchObject({ isError: true });
    expect(String((results[0] as { result: { error: string } }).result.error)).toContain(
      'not JSON-serializable',
    );
  });

  it('maxToolCalls expiry is terminal limit with already-executed results standing', async () => {
    let executions = 0;
    const counting = tool({
      name: 'count',
      description: 'counts',
      parameters: {},
      execute: () => {
        executions += 1;
        return Promise.resolve(executions);
      },
    });
    const adapter = scriptedAdapter(() => ({
      toolCalls: [
        { name: 'count', args: {} },
        { name: 'count', args: {} },
      ],
    }));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxToolCalls: 3 }),
      tools: runtimeOf([counting]),
    });
    expect(result.status).toBe('limit');
    // Turn 1 executes calls 1 and 2; turn 2 executes call 3 and hits the cap.
    expect(executions).toBe(3);
    expect(result.turns).toBe(2);
  });

  it('several tool calls in one turn execute in source order into one tool message', async () => {
    const order: string[] = [];
    const first = tool({
      name: 'first',
      description: 'a',
      parameters: {},
      execute: () => {
        order.push('first');
        return Promise.resolve(1);
      },
    });
    const second = tool({
      name: 'second',
      description: 'b',
      parameters: {},
      execute: () => {
        order.push('second');
        return Promise.resolve(2);
      },
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'first', args: {} },
              { name: 'second', args: {} },
            ],
          }
        : { text: 'done' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([first, second]),
    });
    expect(result.status).toBe('ok');
    expect(order).toEqual(['first', 'second']);
    const toolMessages = (
      adapter.calls[1] as { messages: Array<{ role: string }> }
    ).messages.filter((msg) => msg.role === 'tool');
    expect(toolMessages).toHaveLength(1);
  });
});
