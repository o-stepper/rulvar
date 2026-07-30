/**
 * The per-attempt exposure admission seam (RV711): the loop calls the
 * optional BudgetHooks.admitTurnExposure hook synchronously right
 * before every provider dispatch attempt with the attempt's own
 * request estimate, and calls the returned release closure once the
 * attempt settles, so the reservation lives exactly as long as the
 * wire call it covers. A refusal thrown by the hook is the same typed
 * budget surface as the layer-2b output bound: the agent settles
 * 'error' with kind budget, and nothing waits silently.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError } from '../l0/errors.js';
import type { QuotaDecision, QuotaReservationRequest } from '../l0/spi/quota.js';
import type { Usage } from '../l0/messages.js';
import type { ResolvedInvocation } from '../model/router.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import { mergeUsageLimits } from './usage-limits.js';

const loopResolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

const lookup = tool({
  name: 'lookup',
  description: 'looks up a fact',
  parameters: { type: 'object', properties: { topic: { type: 'string' } } },
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

interface AdmitCall {
  servedBy: string;
  estimatedInputTokens: number;
  plannedOutputTokens: number;
}

function admissionRecorder(): {
  admits: AdmitCall[];
  releases: number[];
  hook: (servedBy: string, estimatedInputTokens: number, plannedOutputTokens: number) => () => void;
} {
  const admits: AdmitCall[] = [];
  const releases: number[] = [];
  return {
    admits,
    releases,
    hook: (servedBy, estimatedInputTokens, plannedOutputTokens) => {
      const ordinal = admits.length;
      admits.push({ servedBy, estimatedInputTokens, plannedOutputTokens });
      return () => releases.push(ordinal);
    },
  };
}

/** A quota stub denying exactly the first reservation, then granting. */
function denyOnceQuota(): {
  reserve: (request: QuotaReservationRequest) => Promise<QuotaDecision>;
  reconcile: (reservationId: string, usage: Usage) => Promise<void>;
  onLimiterError: 'deny';
} {
  let denied = false;
  let next = 0;
  return {
    onLimiterError: 'deny',
    reserve: () => {
      if (!denied) {
        denied = true;
        return Promise.resolve({
          granted: false,
          retryAfterMs: 0,
          reason: 'requestsPerMinute 1 exhausted',
        });
      }
      next += 1;
      return Promise.resolve({ granted: true, reservationId: `r-${String(next)}` });
    },
    reconcile: () => Promise.resolve(),
  };
}

const fastRetry = {
  policy: { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 2 } },
} as const;

describe('the dispatch exposure admission seam (RV711)', () => {
  it('admits each attempt with the request estimate and releases at its settle', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'lookup', args: { topic: 'x' } } } : { text: 'done' },
    );
    const recorder = admissionRecorder();
    const result = await runAgent({
      prompt: 'probe',
      adapter,
      resolved: loopResolved,
      limits: mergeUsageLimits({ maxToolCalls: 3 }),
      tools: runtimeOf([lookup]),
      budget: {
        beforeTurn: () => undefined,
        onUsage: () => undefined,
        admitTurnExposure: recorder.hook,
      },
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    // One admission per dispatched turn, each released at settle.
    expect(recorder.admits).toHaveLength(2);
    expect(recorder.releases).toEqual([0, 1]);
    const first = recorder.admits[0];
    expect(first?.servedBy).toBe('fake:model');
    expect(first?.estimatedInputTokens).toBeGreaterThan(0);
    // No per-turn output cap and no affordability clamp: the planned
    // worst case is the model's own declared output cap.
    expect(first?.plannedOutputTokens).toBe(4096);
  });

  it('a configured per-turn output cap bounds the planned exposure', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'done' }));
    const recorder = admissionRecorder();
    const result = await runAgent({
      prompt: 'probe',
      adapter,
      resolved: loopResolved,
      limits: mergeUsageLimits({ maxOutputTokensPerTurn: 100 }),
      budget: {
        beforeTurn: () => undefined,
        onUsage: () => undefined,
        admitTurnExposure: recorder.hook,
      },
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    expect(recorder.admits[0]?.plannedOutputTokens).toBe(100);
  });

  it('a refusal thrown by the hook settles the agent as a typed budget error', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'never dispatched' }));
    const result = await runAgent({
      prompt: 'probe',
      adapter,
      resolved: loopResolved,
      limits: mergeUsageLimits({}),
      budget: {
        beforeTurn: () => undefined,
        onUsage: () => undefined,
        admitTurnExposure: () => {
          throw new BudgetExhaustedError(
            'in flight exposure cap reached: the dispatch was refused before any provider call',
            { data: { reason: 'in-flight-exposure' } },
          );
        },
      },
      events: recordingSink(),
    });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('in flight exposure cap reached');
    // The provider was never reached.
    expect(adapter.calls).toHaveLength(0);
  });

  it('a quota-denied attempt still releases its reservation before the retry', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'done' }));
    const recorder = admissionRecorder();
    const result = await runAgent({
      prompt: 'probe',
      adapter,
      resolved: loopResolved,
      limits: mergeUsageLimits({}),
      quota: denyOnceQuota(),
      retry: fastRetry,
      budget: {
        beforeTurn: () => undefined,
        onUsage: () => undefined,
        admitTurnExposure: recorder.hook,
      },
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    // Attempt one admitted, denied by the quota, and released; attempt
    // two admitted anew and released at its own settle.
    expect(recorder.admits).toHaveLength(2);
    expect(recorder.releases).toEqual([0, 1]);
  });
});
