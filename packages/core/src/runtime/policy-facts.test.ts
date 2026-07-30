/**
 * The opt-in policy-facts digest (RV709): deterministic runtime facts
 * (quota denials and recoveries, tool budget pressure, the
 * finalization window, recorded spend with its cost basis) injected
 * REQUEST-ONLY into the finalize synthesis invocation, so the final
 * model can cite the run's own live evidence instead of underclaiming
 * it. Off by default: the finalize request stays byte identical when
 * unset, and the digest never touches the durable transcript in either
 * case (like the synthesis instruction itself, it exists only on the
 * wire).
 */
import { describe, expect, it } from 'vitest';

import type { QuotaDecision, QuotaReservationRequest } from '../l0/spi/quota.js';
import type { Usage } from '../l0/messages.js';
import type { ResolvedInvocation } from '../model/router.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { FINALIZE_SYNTHESIS_INSTRUCTION, runAgent, type ToolRuntime } from './agent-loop.js';
import { mergeUsageLimits } from './usage-limits.js';

const loopResolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

const finalizeResolved: ResolvedInvocation = {
  ref: 'strong:big',
  adapterId: 'strong',
  model: 'big',
  canonical: { kind: 'model', model: 'strong:big' },
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

const textOf = (msg: { parts: Array<{ type: string }> } | undefined): string => {
  const part = msg?.parts.find((candidate) => candidate.type === 'text');
  return (part as { text?: string } | undefined)?.text ?? '';
};

const fastRetry = {
  policy: { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 2 } },
} as const;

describe('the finalize policy-facts digest (RV709)', () => {
  it('the finalize request carries the digest when policyFacts is on', async () => {
    const loopAdapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'lookup', args: { topic: 'x' } } } : { text: 'notes' },
    );
    const finalizeAdapter = scriptedAdapter(() => ({ text: 'final' }), { id: 'strong' });
    const result = await runAgent({
      prompt: 'research',
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits({ maxToolCalls: 3 }),
      tools: runtimeOf([lookup]),
      finalize: { adapter: finalizeAdapter, resolved: finalizeResolved },
      quota: denyOnceQuota(),
      retry: fastRetry,
      policyFacts: true,
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('final');
    const messages = finalizeAdapter.calls[0]?.messages ?? [];
    // The digest is the second-to-last request-only message; the
    // deterministic synthesis instruction still closes the request.
    const digest = textOf(messages.at(-2));
    expect(digest).toContain('POLICY FACTS');
    expect(digest).toContain('quota: 1 denial(s), 1 recovered');
    expect(digest).toContain('tool budget: 1 of 3 calls used');
    expect(digest).toContain('recorded spend: $0.0000 (per-call)');
    // Lines are conditional on CONFIGURATION, not on outcomes: no
    // extension and no finalization window were configured, so neither
    // line exists, even as a zero.
    expect(digest).not.toContain('extensions granted');
    expect(digest).not.toContain('finalization window');
    expect(textOf(messages.at(-1))).toBe(FINALIZE_SYNTHESIS_INSTRUCTION);
  });

  it('without the opt-in the finalize request stays byte identical', async () => {
    const run = async (policyFacts: boolean): Promise<ReturnType<typeof scriptedAdapter>> => {
      const loopAdapter = scriptedAdapter((_req, call) =>
        call === 0 ? { toolCall: { name: 'lookup', args: { topic: 'x' } } } : { text: 'notes' },
      );
      const finalizeAdapter = scriptedAdapter(() => ({ text: 'final' }), { id: 'strong' });
      const result = await runAgent({
        prompt: 'research',
        adapter: loopAdapter,
        resolved: loopResolved,
        limits: mergeUsageLimits({ maxToolCalls: 3 }),
        tools: runtimeOf([lookup]),
        finalize: { adapter: finalizeAdapter, resolved: finalizeResolved },
        quota: denyOnceQuota(),
        retry: fastRetry,
        ...(policyFacts ? { policyFacts: true } : {}),
        events: recordingSink(),
      });
      expect(result.status).toBe('ok');
      return finalizeAdapter;
    };
    const withDigest = await run(true);
    const without = await run(false);
    const withMessages = withDigest.calls[0]?.messages ?? [];
    const withoutMessages = without.calls[0]?.messages ?? [];
    expect(withoutMessages).toHaveLength(withMessages.length - 1);
    expect(JSON.stringify(withoutMessages)).not.toContain('POLICY FACTS');
    expect(textOf(withoutMessages.at(-1))).toBe(FINALIZE_SYNTHESIS_INSTRUCTION);
  });

  it('the window and extension lines appear exactly when their machinery is configured', async () => {
    const loopAdapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'lookup', args: { topic: 'x' } } } : { text: 'notes' },
    );
    const finalizeAdapter = scriptedAdapter(() => ({ text: 'final' }), { id: 'strong' });
    const result = await runAgent({
      prompt: 'research',
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits({
        maxToolCalls: 2,
        finalizationWindow: { reserveCalls: 2, allow: ['lookup'] },
      }),
      tools: runtimeOf([lookup]),
      finalize: { adapter: finalizeAdapter, resolved: finalizeResolved },
      policyFacts: true,
      events: recordingSink(),
    });
    expect(result.status).toBe('ok');
    const digest = textOf((finalizeAdapter.calls[0]?.messages ?? []).at(-2));
    expect(digest).toContain('POLICY FACTS');
    // No quota configured: the quota line is absent entirely.
    expect(digest).not.toContain('quota:');
    expect(digest).toContain('finalization window: entered');
  });
});
