/**
 * Weighted tool units and per-tool call caps (RV-210 close-out).
 * Reproduced on published 1.54.0: both UsageLimits fields were silently
 * dropped words (even malformed values passed validation), so a host
 * could bound only the TOTAL call count, never "at most N reads" or
 * "reads cost double". These tests pin the contract: a per-tool cap
 * denies the excess call pre-dispatch (visible, never terminal, no
 * budget consumed), the weighted unit budget terminates as status
 * 'limit' exactly like maxToolCalls, the summary reports both, and the
 * intake validation rejects malformed values as typed ConfigErrors.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ConfigError } from '../l0/errors.js';
import { createCtx } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter } from '../engine/test-harness.js';
import { tool } from '../tools/tool.js';
import type { AgentResult } from './agent-loop.js';
import { mergeUsageLimits, validateUsageLimits } from './usage-limits.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

const echoTool = (name: string) =>
  tool({
    name,
    description: `${name} tool`,
    parameters: z.strictObject({ q: z.string() }),
    execute: (input) => Promise.resolve({ tool: name, q: (input as { q: string }).q }),
  });

describe('maxCallsPerTool (RV-210 close-out)', () => {
  it('denies the excess call pre-dispatch and the run still finishes ok', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: { q: 'a' } },
              { name: 'read', args: { q: 'b' } },
              { name: 'read', args: { q: 'c' } },
              { name: 'grep', args: { q: 'x' } },
            ],
          }
        : { text: 'done' },
    );
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('bounded reads', {
        limits: { maxToolCalls: 10, maxCallsPerTool: { read: 2 } },
        tools: [echoTool('read'), echoTool('grep')],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    const ends = events.ofType('tool:end') as Array<{
      toolName: string;
      outcome: string;
      guard?: string;
    }>;
    expect(ends.filter((e) => e.toolName === 'read' && e.outcome === 'ok')).toHaveLength(2);
    const denied = ends.filter((e) => e.outcome === 'denied');
    expect(denied).toEqual([
      expect.objectContaining({ toolName: 'read', guard: 'per-tool-cap' }),
    ]);
    // The unrelated tool is untouched and the denial consumed no budget.
    expect(ends.filter((e) => e.toolName === 'grep' && e.outcome === 'ok')).toHaveLength(1);
    expect(result.exploration).toMatchObject({
      toolCallsUsed: 3,
      deniedToolCap: 1,
      byTool: { read: 2, grep: 1 },
    });
  });

  it('a cap of 0 bans the tool outright', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'read', args: { q: 'a' } } } : { text: 'gave up' },
    );
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('banned tool', {
        limits: { maxCallsPerTool: { read: 0 } },
        tools: [echoTool('read')],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.exploration).toMatchObject({ toolCallsUsed: 0, deniedToolCap: 1 });
  });
});

describe('toolUnits (RV-210 close-out)', () => {
  it('weighted costs terminate the loop as a plain limit when the budget is reached', async () => {
    const adapter = scriptedAdapter((_req, call) => ({
      toolCall: { name: call % 2 === 0 ? 'read' : 'note', args: { q: `q${String(call)}` } },
    }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('unit budget', {
        limits: { maxTurns: 12, toolUnits: { max: 5, costs: { read: 2, note: 0 } } },
        tools: [echoTool('read'), echoTool('note')],
        result: 'full',
      }),
    );
    // read(2) note(0) read(4) note(4) read(6 -> spent >= 5 blocks the NEXT call)
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.exploration).toMatchObject({ toolUnitsUsed: 6, toolCallsUsed: 5 });
  });

  it('an unlisted tool costs 1 unit', async () => {
    const adapter = scriptedAdapter(() => ({ toolCall: { name: 'read', args: { q: 'same' } } }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('default cost', {
        limits: { maxTurns: 8, toolUnits: { max: 3 } },
        tools: [echoTool('read')],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.exploration).toMatchObject({ toolUnitsUsed: 3, toolCallsUsed: 3 });
  });
});

describe('the intake validation and the layer merge', () => {
  it('rejects malformed values as typed ConfigErrors', () => {
    expect(() => validateUsageLimits({ toolUnits: { max: -5 } }, 'site')).toThrow(ConfigError);
    expect(() => validateUsageLimits({ toolUnits: { max: 2.5 } }, 'site')).toThrow(ConfigError);
    expect(() =>
      validateUsageLimits({ toolUnits: { max: 4, costs: { read: -1 } } }, 'site'),
    ).toThrow(ConfigError);
    expect(() =>
      validateUsageLimits({ toolUnits: [] as unknown as { max: number } }, 'site'),
    ).toThrow(ConfigError);
    expect(() =>
      validateUsageLimits({ maxCallsPerTool: { read: 1.5 } }, 'site'),
    ).toThrow(ConfigError);
    expect(() =>
      validateUsageLimits(
        { maxCallsPerTool: 3 as unknown as Record<string, number> },
        'site',
      ),
    ).toThrow(ConfigError);
    // Valid shapes pass, including the 0 sentinels.
    validateUsageLimits(
      { maxCallsPerTool: { read: 0 }, toolUnits: { max: 1, costs: { note: 0 } } },
      'site',
    );
  });

  it('merges per layer as whole-object replacement, like every other field', () => {
    const merged = mergeUsageLimits(
      { toolUnits: { max: 9 } },
      { toolUnits: { max: 5, costs: { read: 2 } }, maxCallsPerTool: { read: 3 } },
      undefined,
    );
    expect(merged.toolUnits).toEqual({ max: 9 });
    expect(merged.maxCallsPerTool).toEqual({ read: 3 });
    const engineOnly = mergeUsageLimits(undefined, undefined, {
      maxCallsPerTool: { grep: 1 },
    });
    expect(engineOnly.maxCallsPerTool).toEqual({ grep: 1 });
    expect(engineOnly.toolUnits).toBeUndefined();
  });
});
