/**
 * Finalize synthesis and the completed separate-extract invocation
 * (M4-T01): the loop-level halves of the role trigger protocol. The
 * firing decisions themselves are unit-tested in model/roles.test.ts;
 * the ctx-layer wiring in engine/ctx-roles.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { canonicalizeSchema, projectToJsonSchema } from '../l0/schema.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter, testCaps } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import { EMIT_RESULT_TOOL } from './structured-output.js';
import { mergeUsageLimits } from './usage-limits.js';

const loopResolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

const otherResolved = (ref: `${string}:${string}`): ResolvedInvocation => {
  const colon = ref.indexOf(':');
  return {
    ref,
    adapterId: ref.slice(0, colon),
    model: ref.slice(colon + 1),
    canonical: { kind: 'model', model: ref },
    scrubs: [],
  };
};

const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });
const canonicalVerdict = canonicalizeSchema(projectToJsonSchema(verdictSchema));

const lookup = tool({
  name: 'lookup',
  description: 'looks up a fact',
  parameters: z.strictObject({ topic: z.string() }),
  execute: () => Promise.resolve({ fact: 'fine' }),
});

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

describe('finalize synthesis (M4-T01)', () => {
  it('runs one synthesis with toolChoice none over the full transcript; its text is the output', async () => {
    const loopAdapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'lookup', args: { topic: 'weather' } } }
        : { text: 'raw notes' },
    );
    const finalizeAdapter = scriptedAdapter(() => ({ text: 'polished synthesis' }), {
      id: 'strong',
    });
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'research the weather',
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup]),
      finalize: { adapter: finalizeAdapter, resolved: otherResolved('strong:big') },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('polished synthesis');
    // Two loop turns plus the synthesis.
    expect(result.turns).toBe(3);
    expect(loopAdapter.calls).toHaveLength(2);
    expect(finalizeAdapter.calls).toHaveLength(1);
    const synthesisReq = finalizeAdapter.calls[0];
    expect(synthesisReq?.toolChoice).toBe('none');
    // The tool-bearing transcript carries the contracts.
    expect(synthesisReq?.tools?.map((t) => t.name)).toEqual(['lookup']);
    // The full transcript rode along: prompt, tool turn, tool results,
    // final loop turn. (The harness records the live array, so the
    // synthesis itself appears appended after the fact; assert the
    // prefix, not the length.)
    expect(synthesisReq?.messages.slice(0, 4).map((m) => m.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
    ]);
    const starts = events.ofType('agent:start');
    expect(starts.map((e) => e.role)).toEqual(['loop', 'finalize']);
    expect(starts[1]?.model).toBe('strong:big');
  });

  it('with a schema, extract runs AFTER the synthesis over the transcript including it', async () => {
    const loopAdapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'lookup', args: { topic: 'weather' } } }
        : { text: 'raw notes' },
    );
    const finalizeAdapter = scriptedAdapter(() => ({ text: 'the verdict is pass' }), {
      id: 'strong',
    });
    const extractAdapter = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }), {
      id: 'cheap',
    });
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'judge the weather',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup]),
      finalize: { adapter: finalizeAdapter, resolved: otherResolved('strong:big') },
      extract: { adapter: extractAdapter, resolved: otherResolved('cheap:small') },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'pass' });
    expect(finalizeAdapter.calls).toHaveLength(1);
    expect(extractAdapter.calls).toHaveLength(1);
    // The extract request sees the synthesis message.
    const extractReq = extractAdapter.calls[0];
    const texts = extractReq?.messages.flatMap((m) =>
      m.parts.filter((p) => p.type === 'text').map((p) => p.text),
    );
    expect(texts).toContain('the verdict is pass');
    const starts = events.ofType('agent:start');
    expect(starts.map((e) => e.role)).toEqual(['loop', 'finalize', 'extract']);
    // The loop requests never carried the schema: it rides neither the
    // loop nor the synthesis when finalize is routed.
    for (const req of [...loopAdapter.calls, ...finalizeAdapter.calls]) {
      expect(req.schema).toBeUndefined();
    }
  });

  it('a synthesis wire error is terminal: no extract call follows', async () => {
    const loopAdapter = scriptedAdapter(() => ({ text: 'raw notes' }));
    const finalizeAdapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'boom', retryable: false },
    }));
    const extractAdapter = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }));
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup]),
      finalize: { adapter: finalizeAdapter, resolved: otherResolved('strong:big') },
      extract: { adapter: extractAdapter, resolved: otherResolved('cheap:small') },
    });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe('boom');
    expect(extractAdapter.calls).toHaveLength(0);
  });

  it('does not fire after an aborted loop (limit)', async () => {
    const loopAdapter = scriptedAdapter(() => ({
      toolCall: { name: 'lookup', args: { topic: 'more' } },
    }));
    const finalizeAdapter = scriptedAdapter(() => ({ text: 'never' }));
    const result = await runAgent({
      prompt: 'loop forever',
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(undefined, { maxTurns: 2 }),
      tools: runtimeOf([lookup]),
      finalize: { adapter: finalizeAdapter, resolved: otherResolved('strong:big') },
    });
    expect(result.status).toBe('limit');
    expect(finalizeAdapter.calls).toHaveLength(0);
  });
});

describe('separate extract over a tool-bearing transcript (M4-T01)', () => {
  it('carries the contracts with toolChoice none on the native tier', async () => {
    const loopAdapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'lookup', args: { topic: 'x' } } } : { text: 'done' },
    );
    const extractAdapter = scriptedAdapter(() => ({ text: '{"verdict":"fail"}' }), {
      id: 'cheap',
    });
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup]),
      extract: { adapter: extractAdapter, resolved: otherResolved('cheap:small') },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'fail' });
    const req = extractAdapter.calls[0];
    expect(req?.tools?.map((t) => t.name)).toEqual(['lookup']);
    expect(req?.toolChoice).toBe('none');
    expect(req?.schema).toEqual(canonicalVerdict);
  });

  it('the forced-tool tier appends emit_result and pins toolChoice to it', async () => {
    const loopAdapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'lookup', args: { topic: 'x' } } } : { text: 'done' },
    );
    const extractAdapter = scriptedAdapter(
      () => ({
        toolCall: { name: EMIT_RESULT_TOOL, args: { verdict: 'pass' } },
        finish: 'tool-calls',
      }),
      { id: 'cheap', caps: testCaps({ structuredOutput: 'forced-tool' }) },
    );
    const result = await runAgent({
      prompt: 'judge',
      schema: verdictSchema,
      canonicalSchema: canonicalVerdict,
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([lookup]),
      extract: { adapter: extractAdapter, resolved: otherResolved('cheap:small') },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toEqual({ verdict: 'pass' });
    const req = extractAdapter.calls[0];
    expect(req?.tools?.map((t) => t.name)).toEqual(['lookup', EMIT_RESULT_TOOL]);
    expect(req?.toolChoice).toEqual({ name: EMIT_RESULT_TOOL });
  });
});
