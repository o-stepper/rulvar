import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { canonicalizeSchema, projectToJsonSchema } from '../l0/schema.js';
import type { ResolvedInvocation } from '../model/router.js';
import { recordingSink, scriptedAdapter, testCaps } from '../engine/test-harness.js';
import { isEscalated, runAgent, type AgentResult, type AgentStatus } from './agent-loop.js';
import { mergeUsageLimits } from './usage-limits.js';

const resolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });
const canonicalVerdict = canonicalizeSchema(projectToJsonSchema(verdictSchema));

describe('agent runtime v1 (M1-T06)', () => {
  it('returns a typed ok result for a plain text call', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hello world' }));
    const result = await runAgent({
      prompt: 'say hello',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('hello world');
    expect(result.turns).toBe(1);
    expect(result.usage.inputTokens).toBe(10);
    expect(result.error).toBeUndefined();
  });

  it('produces validated structured output through the native tier', async () => {
    const adapter = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }));
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'pass' });
    expectTypeOf(result).toEqualTypeOf<AgentResult<{ verdict: 'pass' | 'fail' }>>();
    // Native tier rides ChatRequest.schema.
    expect(adapter.calls[0]?.schema).toEqual(canonicalVerdict);
  });

  it('re-prompts at most twice on schema mismatch then returns kind schema-mismatch', async () => {
    const events = recordingSink();
    const adapter = scriptedAdapter(() => ({ text: '{"verdict":"maybe"}' }));
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      events,
    });
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('schema-mismatch');
    expect(result.error?.issues?.length).toBeGreaterThan(0);
    // Initial attempt plus exactly two re-prompts.
    expect(adapter.calls).toHaveLength(3);
    expect(result.turns).toBe(3);
    expect(events.ofType('agent:schema-retry')).toHaveLength(2);
  });

  it('recovers when a re-prompt produces valid output', async () => {
    const adapter = scriptedAdapter((_req, call) => ({
      text: call === 0 ? 'not json at all, sorry' : '{"verdict":"fail"}',
    }));
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'fail' });
    expect(result.turns).toBe(2);
  });

  it('serves the forced-tool tier from the synthesized emit_result call', async () => {
    const adapter = scriptedAdapter(() => ({
      toolCall: { name: 'emit_result', args: { verdict: 'pass' } },
      finish: 'tool-calls',
    }));
    const forcedCaps = testCaps({ structuredOutput: 'forced-tool' });
    const forcedAdapter = scriptedAdapter(
      () => ({
        toolCall: { name: 'emit_result', args: { verdict: 'pass' } },
        finish: 'tool-calls',
      }),
      { caps: forcedCaps },
    );
    void adapter;
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter: forcedAdapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'pass' });
    expect(forcedAdapter.calls[0]?.toolChoice).toEqual({ name: 'emit_result' });
    expect(forcedAdapter.calls[0]?.schema).toBeUndefined();
  });

  it('extracts JSON from prose through the prompt tier', async () => {
    const promptCaps = testCaps({ structuredOutput: 'prompt' });
    const adapter = scriptedAdapter(
      () => ({ text: 'Here is the answer:\n{"verdict":"pass"}\nHope that helps!' }),
      { caps: promptCaps },
    );
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'pass' });
    // The schema instruction was injected into the user message.
    const lastPart = adapter.calls[0]?.messages[0]?.parts.at(-1);
    expect(lastPart?.type === 'text' && lastPart.text.includes('JSON Schema')).toBe(true);
  });

  it('writes status limit when maxTurns expires', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'not json' }));
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 1 }),
    });
    expect(result.status).toBe('limit');
    expect(result.turns).toBe(1);
    expect(result.output).toBeNull();
  });

  it('writes status limit when the per-agent wall clock expires', async () => {
    let clock = 0;
    const adapter = scriptedAdapter(() => ({ text: 'not json' }));
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter,
      resolved,
      limits: mergeUsageLimits({ timeoutMs: 100 }),
      now: () => {
        clock += 60;
        return clock;
      },
    });
    expect(result.status).toBe('limit');
  });

  it('maps a refusal finish to AgentError kind terminal, never a null projection', async () => {
    const adapter = scriptedAdapter(() => ({
      finish: {
        reason: 'refusal',
        refusal: { provider: 'fake', stopDetails: { category: 'safety' } },
      },
    }));
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'do something refused',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      events,
    });
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('terminal');
    expect(result.error?.retryable).toBe(false);
    const errorEvents = events.ofType('agent:error');
    expect(JSON.stringify(errorEvents[0])).toContain('safety');
  });

  it('maps context-window-exceeded to a terminal error', async () => {
    const adapter = scriptedAdapter(() => ({ finish: 'context-window-exceeded' }));
    const result = await runAgent({
      prompt: 'huge',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('terminal');
  });

  it('classifies stream error events with retry metadata', async () => {
    const adapter = scriptedAdapter(() => ({
      error: {
        code: 'agent',
        message: '429',
        retryable: true,
        data: { kind: 'rate-limit', retryAfterMs: 3000 },
      },
    }));
    const slept: number[] = [];
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      retry: {
        sleep: (ms) => {
          slept.push(ms);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('error');
    expect(result.error).toEqual({ kind: 'rate-limit', retryable: true, retryAfterMs: 3000 });
    // The Appendix A default retried the retryable class before the
    // terminal (M4-T05); retryAfterMs replaced the computed delays.
    expect(adapter.calls).toHaveLength(3);
    expect(slept).toEqual([3000, 3000]);
  });

  it('severs an idle stream as a retryable transport error, not limit', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'partial', hangMs: 5_000 }));
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved,
      limits: mergeUsageLimits({ streamIdleTimeoutMs: 25 }),
    });
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('transport');
    expect(result.error?.retryable).toBe(true);
  });

  it('turns a Usage-invariant violation into a typed transport error', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'ok',
      usage: { inputTokens: 1, cacheReadTokens: 5, cacheWriteTokens: 5, outputTokens: 0 },
    }));
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('transport');
    expect(result.error?.retryable).toBe(false);
  });

  it('runs a separate extract invocation when configured', async () => {
    const loopAdapter = scriptedAdapter(() => ({ text: 'analysis prose' }));
    const extractAdapter = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }), {
      id: 'extractor',
    });
    const extractResolved: ResolvedInvocation = {
      ref: 'extractor:mini',
      adapterId: 'extractor',
      model: 'mini',
      canonical: { kind: 'model', model: 'extractor:mini', effort: 'low' },
      scrubs: [],
    };
    const result = await runAgent({
      prompt: 'analyze then extract',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter: loopAdapter,
      resolved,
      extract: { adapter: extractAdapter, resolved: extractResolved },
      limits: mergeUsageLimits(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'pass' });
    // The loop turn saw no schema; the extract call carried it.
    expect(loopAdapter.calls[0]?.schema).toBeUndefined();
    expect(extractAdapter.calls[0]?.schema).toEqual(canonicalVerdict);
    expect(result.turns).toBe(2);
  });

  it('persists the canonical transcript', async () => {
    const blobs = new Map<string, Uint8Array>();
    const adapter = scriptedAdapter(() => ({ text: 'answer' }));
    const result = await runAgent({
      prompt: 'question',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      transcript: {
        mintRef: () => 'run/t0',
        put: (ref, blob) => {
          blobs.set(ref, blob);
          return Promise.resolve();
        },
      },
    });
    expect(result.transcriptRef).toBe('run/t0');
    const transcript = JSON.parse(new TextDecoder().decode(blobs.get('run/t0'))) as {
      messages: Array<{ role: string }>;
    };
    expect(transcript.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('type-level: AgentStatus vocabulary and isEscalated narrowing', () => {
    expectTypeOf<AgentStatus>().toEqualTypeOf<
      'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated'
    >();
    const result = { status: 'ok', output: null } as unknown as AgentResult<string>;
    if (isEscalated(result)) {
      expectTypeOf(result.escalation).not.toBeUndefined();
    }
    expect(isEscalated(result)).toBe(false);
  });
});
