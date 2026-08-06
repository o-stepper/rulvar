/**
 * The first-class prompt-cache policy (RV2006, the third parity
 * rerun's unreachable caching). ChatRequest.cacheHint existed and the
 * Anthropic adapter compiled it into cache_control, but nothing in
 * the core ever populated it: every turn of the parity workers'
 * ~550k-token contexts re-paid the full input rate, cacheReadTokens 0
 * across the whole run, and the $6 envelope sized on OpenAI's
 * implicit server cache was incomparable on Anthropic. The loop now
 * compiles the hint on every turn: breakpoints after tools, after
 * system, and after the deepest message (sliding with the history),
 * default ON exactly where the adapter declared
 * ModelCaps.promptCaching 'explicit', byte-identical wire everywhere
 * else, with opt-out and TTL through defaults.cache, profile.cache,
 * and the per-call opts.
 */
import { describe, expect, it } from 'vitest';

import type { CacheHint, ChatRequest } from '../l0/messages.js';
import { tool } from '../tools/tool.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter, testCaps, type ScriptedTurn } from './test-harness.js';

const echo = tool({
  name: 'echo',
  description: 'echoes its input back',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { value: { type: 'string' } },
  },
  execute: (input) => Promise.resolve(input),
});

/** One tool turn then a text finish: exactly two loop dispatches. */
function twoTurnAdapter(options?: { caps?: ReturnType<typeof testCaps> }) {
  return scriptedAdapter(
    (req: ChatRequest, call: number): ScriptedTurn => {
      void req;
      if (call === 0) {
        return { toolCall: { name: 'echo', args: { value: 'ping' } } };
      }
      return {
        text: 'done',
        // The Usage invariant: inputTokens is the FULL prompt size
        // INCLUDING cache reads and writes.
        usage: { inputTokens: 200, outputTokens: 5, cacheReadTokens: 120, cacheWriteTokens: 30 },
      };
    },
    options?.caps === undefined ? undefined : { caps: options.caps },
  );
}

const CACHED_WF = defineWorkflow({ name: 'cached' }, async (ctx) => {
  const result = await ctx.agent('use the echo tool once, then stop', {
    tools: [echo],
    result: 'full',
  });
  return { status: result.status, usage: result.usage };
});

function hintOf(req: ChatRequest | undefined): CacheHint | undefined {
  return req?.cacheHint;
}

describe('the prompt-cache policy (RV2006)', () => {
  it('attaches sliding breakpoints by DEFAULT on explicit-caching adapters', async () => {
    const adapter = twoTurnAdapter({ caps: testCaps({ promptCaching: 'explicit' }) });
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(CACHED_WF, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.calls).toHaveLength(2);

    const first = hintOf(adapter.calls[0]);
    expect(first).toBeDefined();
    expect(first?.breakpoints[0]).toEqual({ after: 'tools', ttl: '5m' });
    expect(first?.breakpoints[1]).toEqual({ after: 'system', ttl: '5m' });
    const firstDeepest = first?.breakpoints[2]?.after as { messageIndex: number };
    expect(firstDeepest.messageIndex).toBe((adapter.calls[0]?.messages.length ?? 0) - 1);

    // The deepest breakpoint SLIDES: the second turn's history grew by
    // the assistant turn and the tool result, and the boundary moved
    // with it, so the provider re-reads the cached prefix and writes
    // only the extension.
    const second = hintOf(adapter.calls[1]);
    const secondDeepest = second?.breakpoints[2]?.after as { messageIndex: number };
    expect(secondDeepest.messageIndex).toBe((adapter.calls[1]?.messages.length ?? 0) - 1);
    expect(secondDeepest.messageIndex).toBeGreaterThan(firstDeepest.messageIndex);

    // The echo-cache accounting rides unchanged: the reported cache
    // read and write tokens land in the result usage.
    const value = outcome.value as { usage: { cacheReadTokens: number; cacheWriteTokens: number } };
    expect(value.usage.cacheReadTokens).toBe(120);
    expect(value.usage.cacheWriteTokens).toBe(30);
  });

  it('attaches NOTHING on adapters without the explicit declaration', async () => {
    const adapter = twoTurnAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(CACHED_WF, undefined).result;
    expect(outcome.status).toBe('ok');
    for (const call of adapter.calls) {
      expect(call.cacheHint).toBeUndefined();
    }
  });

  it("mode 'off' is the opt-out, engine-wide", async () => {
    const adapter = twoTurnAdapter({ caps: testCaps({ promptCaching: 'explicit' }) });
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' }, cache: { mode: 'off' } },
    });
    const outcome = await engine.run(CACHED_WF, undefined).result;
    expect(outcome.status).toBe('ok');
    for (const call of adapter.calls) {
      expect(call.cacheHint).toBeUndefined();
    }
  });

  it('the profile TTL rides the breakpoints and the call opts win over it', async () => {
    const adapter = twoTurnAdapter({ caps: testCaps({ promptCaching: 'explicit' }) });
    const engine = createEngine({
      adapters: [adapter],
      defaults: {
        routing: { loop: 'fake:model' },
        profiles: { warm: { description: 'hour-long cache', cache: { ttl: '1h' } } },
      },
    });
    const wf = defineWorkflow({ name: 'ttl' }, async (ctx) => {
      await ctx.agent('one hinted call', { agentType: 'warm', tools: [echo] });
      await ctx.agent('one silenced call', { agentType: 'warm', cache: { mode: 'off' } });
      return 'ok';
    });
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    // The first agent's dispatches carry the profile TTL.
    const hinted = adapter.calls.filter((call) => call.cacheHint !== undefined);
    expect(hinted.length).toBeGreaterThanOrEqual(2);
    for (const call of hinted) {
      for (const breakpoint of call.cacheHint?.breakpoints ?? []) {
        expect(breakpoint.ttl).toBe('1h');
      }
    }
    // The per-call 'off' silenced the second agent entirely.
    const silenced = adapter.calls[adapter.calls.length - 1];
    expect(silenced?.cacheHint).toBeUndefined();
  });
});
