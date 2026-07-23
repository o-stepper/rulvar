/**
 * Exploration guards (RV-210, first slice). Reproduced on published
 * 1.51.0: an oscillating agent repeats the byte-identical tool call to
 * the hard cap with zero signal, duplicate pages never flag, the model
 * never sees a remaining count, and the terminal is a bare 'limit'.
 * These tests pin the guard vocabulary: the repeated-signature denial,
 * the no-new-evidence abort with its structured summary, and the soft
 * tool-budget notices.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { ConfigError } from '../l0/errors.js';
import type { Msg } from '../l0/messages.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import {
  crossedNoticeThresholds,
  ExplorationGuard,
  explorationTrackingEnabled,
  toolBudgetNoticeText,
} from './exploration.js';
import { mergeUsageLimits, validateUsageLimits } from './usage-limits.js';

const resolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

function runtimeOf(defs: Array<ReturnType<typeof tool>>): ToolRuntime {
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

function searchTool(executions: unknown[], result?: (input: { q: string }) => unknown) {
  return tool({
    name: 'search',
    description: 'searches the repository',
    parameters: z.strictObject({ q: z.string() }),
    execute: (input) => {
      executions.push(input);
      return Promise.resolve(result === undefined ? { hits: ['a.ts'] } : result(input));
    },
  });
}

const requestTexts = (calls: Array<{ messages: Msg[] }>): string[] =>
  calls.map((req) =>
    req.messages
      .flatMap((msg) => msg.parts)
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n'),
  );

describe('ExplorationGuard (unit)', () => {
  it('canonicalizes signatures: key order does not create a new signature', () => {
    const guard = new ExplorationGuard({ maxRepeatedToolSignature: 1 });
    expect(guard.afterExecute('search', { a: 1, b: 2 }, { page: 1 }, false)).toBe(false);
    const verdict = guard.beforeExecute('search', { b: 2, a: 1 });
    expect(verdict.deny).toBe(true);
    const summary = guard.summary(1);
    expect(summary.distinctSignatures).toBe(1);
    expect(summary.deniedRepeats).toBe(1);
  });

  it('the no-new-evidence chain: fresh evidence resets, error results are neutral', () => {
    const guard = new ExplorationGuard({ maxNoNewEvidenceCalls: 2 });
    expect(guard.afterExecute('read', { p: 1 }, 'page one', false)).toBe(false);
    expect(guard.afterExecute('read', { p: 2 }, 'page one', false)).toBe(false);
    // An error result neither lengthens nor resets the streak.
    expect(guard.afterExecute('read', { p: 3 }, { error: 'boom' }, true)).toBe(false);
    // Fresh evidence resets the streak.
    expect(guard.afterExecute('read', { p: 4 }, 'page two', false)).toBe(false);
    expect(guard.afterExecute('read', { p: 5 }, 'page one', false)).toBe(false);
    expect(guard.afterExecute('read', { p: 6 }, 'page two', false)).toBe(true);
    const summary = guard.summary(6);
    expect(summary.duplicateResultCalls).toBe(3);
    expect(summary.repeatedCalls).toBe(0);
    expect(summary.byTool).toEqual({ read: 6 });
  });

  it('values JCS cannot serialize fail open: unique signatures, fresh evidence', () => {
    const guard = new ExplorationGuard({
      maxRepeatedToolSignature: 1,
      maxNoNewEvidenceCalls: 1,
    });
    const weird = { fn: () => undefined };
    expect(guard.afterExecute('call', weird, weird, false)).toBe(false);
    expect(guard.beforeExecute('call', weird).deny).toBe(false);
    expect(guard.afterExecute('call', weird, weird, false)).toBe(false);
    expect(guard.summary(2).distinctSignatures).toBe(2);
  });

  it('restore() rebuilds from checkpoint messages, skipping error results', () => {
    const guard = new ExplorationGuard({ maxRepeatedToolSignature: 2 });
    const messages: Msg[] = [
      {
        role: 'assistant',
        parts: [
          { type: 'tool-call', id: 'a', name: 'search', args: { q: 'x' } },
          { type: 'tool-call', id: 'b', name: 'search', args: { q: 'x' } },
          { type: 'tool-call', id: 'c', name: 'search', args: { q: 'y' } },
        ],
      },
      {
        role: 'tool',
        parts: [
          { type: 'tool-result', id: 'a', name: 'search', result: { page: 1 } },
          { type: 'tool-result', id: 'b', name: 'search', result: { page: 1 } },
          { type: 'tool-result', id: 'c', name: 'search', result: 'denied', isError: true },
        ],
      },
    ];
    guard.restore(messages);
    // Two successful executions of the same signature: the cap of 2 is
    // spent, the third identical call is denied.
    expect(guard.beforeExecute('search', { q: 'x' }).deny).toBe(true);
    // The error-result call never executed, so its signature is free.
    expect(guard.beforeExecute('search', { q: 'y' }).deny).toBe(false);
    const summary = guard.summary(2);
    expect(summary).toMatchObject({
      distinctSignatures: 1,
      repeatedCalls: 1,
      duplicateResultCalls: 1,
    });
  });

  it('notice threshold math is ceil-based and the text carries exact counts', () => {
    expect(crossedNoticeThresholds(4, 10)).toEqual([]);
    expect(crossedNoticeThresholds(5, 10)).toEqual([0.5]);
    expect(crossedNoticeThresholds(8, 10)).toEqual([0.5, 0.8]);
    expect(crossedNoticeThresholds(1, 3)).toEqual([]);
    expect(crossedNoticeThresholds(2, 3)).toEqual([0.5]);
    expect(crossedNoticeThresholds(3, 3)).toEqual([0.5, 0.8]);
    expect(toolBudgetNoticeText(5, 10)).toBe(
      'Tool budget notice: 5 of 10 tool calls used; 5 remaining. Prioritize the highest ' +
        'value calls and finish with what you have.',
    );
    expect(explorationTrackingEnabled({})).toBe(false);
    expect(explorationTrackingEnabled({ toolBudgetNotices: true })).toBe(true);
    expect(explorationTrackingEnabled({ maxNoNewEvidenceCalls: 3 })).toBe(true);
  });
});

describe('exploration limits validation and merge', () => {
  it('rejects malformed guard fields as typed ConfigError at the intake site', () => {
    expect(() =>
      validateUsageLimits({ toolBudgetNotices: 'yes' as unknown as boolean }, 'RunOptions.limits'),
    ).toThrow(ConfigError);
    for (const bad of [0, 1.5, Number.NaN, -3]) {
      expect(() =>
        validateUsageLimits({ maxRepeatedToolSignature: bad }, 'RunOptions.limits'),
      ).toThrow(/RunOptions\.limits\.maxRepeatedToolSignature/);
      expect(() =>
        validateUsageLimits({ maxNoNewEvidenceCalls: bad }, 'RunOptions.limits'),
      ).toThrow(/RunOptions\.limits\.maxNoNewEvidenceCalls/);
    }
  });

  it('merges call over profile over engine like every other limit', () => {
    const merged = mergeUsageLimits(
      { maxRepeatedToolSignature: 2 },
      { maxRepeatedToolSignature: 5, toolBudgetNotices: true },
      { maxNoNewEvidenceCalls: 4 },
    );
    expect(merged.maxRepeatedToolSignature).toBe(2);
    expect(merged.toolBudgetNotices).toBe(true);
    expect(merged.maxNoNewEvidenceCalls).toBe(4);
  });
});

describe('exploration guards in the agent loop', () => {
  it('denies the repeated signature with a typed error result; the budget is not consumed', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call <= 2
        ? { toolCall: { name: 'search', args: { q: 'same' } } }
        : { text: 'done with what I have' },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'research',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxRepeatedToolSignature: 2, maxToolCalls: 10 }),
      tools: runtimeOf([searchTool(executions)]),
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done with what I have');
    // Two executions, the third identical call denied without dispatch.
    expect(executions).toHaveLength(2);
    const denied = events
      .ofType('tool:end')
      .filter((event) => (event as { outcome?: string }).outcome === 'denied');
    expect(denied).toEqual([
      expect.objectContaining({ toolName: 'search', guard: 'repeated-signature' }),
    ]);
    // The model saw the denial reason on its next turn.
    const texts = adapter.calls
      .flatMap((req) => req.messages)
      .flatMap((msg) => msg.parts)
      .filter((part) => part.type === 'tool-result')
      .map((part) => JSON.stringify(part.result));
    expect(texts.some((text) => text.includes('exploration guard'))).toBe(true);
    expect(result.exploration).toEqual({
      toolCallsUsed: 2,
      distinctSignatures: 1,
      repeatedCalls: 1,
      duplicateResultCalls: 1,
      deniedRepeats: 1,
      byTool: { search: 2 },
    });
    expect(result.abortClass).toBeUndefined();
  });

  it('aborts as the exploration class when consecutive calls return no new evidence', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call <= 2
        ? { toolCall: { name: 'search', args: { q: `query-${call}` } } }
        : { text: 'never reached' },
    );
    const result = await runAgent({
      prompt: 'research',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxNoNewEvidenceCalls: 2 }),
      // Every query returns the same page: duplicate evidence.
      tools: runtimeOf([searchTool(executions, () => ({ page: 'same content' }))]),
      events: recordingSink(),
    });
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('exploration');
    expect(result.error?.kind).toBe('terminal');
    expect(result.error?.retryable).toBe(false);
    expect(result.errorMessage).toContain('no new evidence');
    expect(result.errorMessage).toContain(
      'https://docs.rulvar.com/guide/agents#exploration-guards',
    );
    // Three distinct signatures executed; the paid work stands.
    expect(executions).toHaveLength(3);
    expect(result.exploration).toEqual({
      toolCallsUsed: 3,
      distinctSignatures: 3,
      repeatedCalls: 0,
      duplicateResultCalls: 2,
      deniedRepeats: 0,
      byTool: { search: 3 },
    });
  });

  it('soft budget notices fire once per threshold with the exact remaining count', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call <= 7 ? { toolCall: { name: 'search', args: { q: `q${call}` } } } : { text: 'finished' },
    );
    const result = await runAgent({
      prompt: 'research',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxToolCalls: 10, toolBudgetNotices: true }),
      // Unique content per call keeps every guard quiet.
      tools: runtimeOf([searchTool(executions, (input) => ({ page: input.q }))]),
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    expect(executions).toHaveLength(8);
    const texts = requestTexts(adapter.calls);
    const fifty = 'Tool budget notice: 5 of 10 tool calls used; 5 remaining';
    const eighty = 'Tool budget notice: 8 of 10 tool calls used; 2 remaining';
    // Before the 50% boundary: no notice anywhere.
    expect(texts[4]).not.toContain('Tool budget notice');
    // The request after the fifth executed call carries the 50% notice.
    expect(texts[5]).toContain(fifty);
    // The request after the eighth executed call carries the 80% one.
    expect(texts[8]).toContain(eighty);
    // Each threshold fired exactly once across the final history.
    const final = texts[texts.length - 1] ?? '';
    expect(final.split('Tool budget notice').length - 1).toBe(2);
    expect(result.exploration?.distinctSignatures).toBe(8);
  });

  it('one turn crossing both thresholds produces a single notice with the final counts', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: Array.from({ length: 8 }, (_, index) => ({
              name: 'search',
              args: { q: `q${index}` },
            })),
          }
        : { text: 'finished' },
    );
    const result = await runAgent({
      prompt: 'research',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxToolCalls: 10, toolBudgetNotices: true }),
      tools: runtimeOf([searchTool(executions, (input) => ({ page: input.q }))]),
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    const final = requestTexts(adapter.calls).at(-1) ?? '';
    expect(final.split('Tool budget notice').length - 1).toBe(1);
    expect(final).toContain('Tool budget notice: 8 of 10 tool calls used; 2 remaining');
  });

  it('notices without maxToolCalls are inert and warn out loud', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'search', args: { q: 'x' } } } : { text: 'done' },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'research',
      adapter,
      resolved,
      limits: mergeUsageLimits({ toolBudgetNotices: true }),
      tools: runtimeOf([searchTool(executions)]),
      events,
    });
    expect(result.status).toBe('ok');
    const warns = events
      .ofType('log')
      .filter((event) => String((event as { msg?: string }).msg).includes('toolBudgetNotices'));
    expect(warns).toHaveLength(1);
    expect(requestTexts(adapter.calls).join('\n')).not.toContain('Tool budget notice');
    // Tracking is on (the summary exists) even though the notice is inert.
    expect(result.exploration?.toolCallsUsed).toBe(1);
  });

  it('an unconfigured invocation carries no summary and no guard behavior', async () => {
    const executions: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call <= 3 ? { toolCall: { name: 'search', args: { q: 'same' } } } : { text: 'done' },
    );
    const result = await runAgent({
      prompt: 'research',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([searchTool(executions)]),
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    expect(executions).toHaveLength(4);
    expect(result.exploration).toBeUndefined();
  });
});
