/**
 * The observed tool-budget calibration fold (RV3003): the RV806
 * evidence verdict and the RV3002 executed-call counter ride the same
 * terminal entry, so observed calls-per-evidence-entry is a pure fold
 * over the journal. The ninth comparison run declared the stock
 * estimate of 3 and its workers spent 5.5; this is the surface that
 * turns that hand-recomputed number into `journal in, number out`.
 * RV1209 throughout: a dispatch carrying one side of the pair is named
 * and excluded, never counted as zero.
 */
import { describe, expect, it } from 'vitest';

import type { AgentResult } from '../runtime/agent-loop.js';
import { tool } from '../tools/tool.js';
import { createCtx } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter } from '../engine/test-harness.js';
import { toolCalibrationFromJournal } from './tool-calibration.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

/** A scripted record_evidence: enforcement counts result.recorded === true. */
function recorder(outcomes: ReadonlyArray<'recorded' | 'error'>) {
  let call = 0;
  return tool({
    name: 'record_evidence',
    description: 'records one evidence entry',
    parameters: {},
    execute: () => {
      const outcome = outcomes[Math.min(call, outcomes.length - 1)] ?? 'error';
      call += 1;
      if (outcome === 'error') {
        return Promise.resolve({ error: 'citation could not be verified' });
      }
      return Promise.resolve({ recorded: true, duplicate: false, totalEvidence: call });
    },
  });
}

const pager = () =>
  tool({
    name: 'read',
    description: 'reads a page',
    parameters: {},
    execute: () => Promise.resolve({ content: 'page' }),
  });

describe('the observed tool-budget calibration fold (RV3003)', () => {
  it('pairs the verdict with the counter per dispatch and aggregates the observed rate', async () => {
    // One run, three dispatches: a digger under a declared contract and
    // a tool cap (both sides), a capped reader with no contract (counter
    // only), and a bare text call (neither).
    const adapter = scriptedAdapter((_req, call) => {
      if (call < 3) {
        return { toolCall: { name: 'record_evidence', args: {} } };
      }
      if (call === 4) {
        return { toolCall: { name: 'read', args: {} } };
      }
      return { text: 'done' };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: {
        digger: {
          description: 'records evidence',
          tools: [recorder(['recorded', 'error', 'recorded'])],
          evidenceContract: { minEntries: 2 },
        },
      },
    });
    const ctx = createCtx(internals);
    const dug = fullResult(
      await ctx.agent('dig', { agentType: 'digger', limits: { maxToolCalls: 10 }, result: 'full' }),
    );
    expect(dug.evidence).toEqual({ recordedEntries: 2, minEntries: 2, met: true });
    expect(dug.toolBudget).toEqual({ used: 3, cap: 10 });
    await ctx.agent('read one page', { limits: { maxToolCalls: 5 }, tools: [pager()] });
    await ctx.agent('just answer');
    await internals.replayer.flush();

    const report = toolCalibrationFromJournal(internals.replayer.snapshot());
    expect(report.dispatches).toBe(3);
    expect(report.observed).toHaveLength(1);
    expect(report.observed[0]).toMatchObject({
      agentType: 'digger',
      status: 'ok',
      recordedEntries: 2,
      minEntries: 2,
      toolCallsUsed: 3,
      callsPerEntry: 1.5,
    });
    expect(report.budgetOnly).toHaveLength(1);
    expect(report.budgetOnly[0]?.status).toBe('ok');
    expect(report.evidenceOnly).toEqual([]);
    expect(report.unobserved).toBe(1);
    // The number a host holds against its declared estCallsPerEntry.
    expect(report.aggregate).toEqual({ toolCallsUsed: 3, recordedEntries: 2, callsPerEntry: 1.5 });
  });

  it('a pre-RV3002 journal is named evidenceOnly, and the rate refuses to exist (RV1209)', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call < 2 ? { toolCall: { name: 'record_evidence', args: {} } } : { text: 'done' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: {
        digger: {
          description: 'records evidence',
          tools: [recorder(['recorded', 'recorded'])],
          evidenceContract: { minEntries: 2 },
        },
      },
    });
    await createCtx(internals).agent('dig', {
      agentType: 'digger',
      limits: { maxToolCalls: 10 },
    });
    await internals.replayer.flush();
    // A journal written before the counter shipped: the verdict rides
    // the terminal, the counter does not.
    const stripped = internals.replayer.snapshot().map((entry) => {
      const { toolBudget: _dropped, ...rest } = entry;
      return rest;
    });
    const report = toolCalibrationFromJournal(stripped);
    expect(report.observed).toEqual([]);
    expect(report.evidenceOnly).toHaveLength(1);
    expect(report.evidenceOnly[0]?.status).toBe('ok');
    // NOT RECORDED, never zero: no aggregate exists at all.
    expect(report.aggregate).toBeUndefined();
  });

  it('a paired row with zero recorded entries keeps its calls and drops only the ratio', async () => {
    // The deficit-observability anomaly: an ok worker under a declared
    // contract that recorded nothing. Its executed calls are real spend
    // and stay in the numerator; no ratio is invented over zero.
    const adapter = scriptedAdapter((_req, call) =>
      call < 1 ? { toolCall: { name: 'record_evidence', args: {} } } : { text: 'done' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: {
        digger: {
          description: 'records evidence',
          tools: [recorder(['error'])],
          evidenceContract: { minEntries: 1 },
        },
      },
    });
    const result = fullResult(
      await createCtx(internals).agent('dig', {
        agentType: 'digger',
        limits: { maxToolCalls: 10 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.evidence).toEqual({ recordedEntries: 0, minEntries: 1, met: false });
    await internals.replayer.flush();

    const report = toolCalibrationFromJournal(internals.replayer.snapshot());
    expect(report.observed).toHaveLength(1);
    expect(report.observed[0]).toMatchObject({ recordedEntries: 0, toolCallsUsed: 1 });
    expect(report.observed[0]?.callsPerEntry).toBeUndefined();
    expect(report.aggregate).toEqual({ toolCallsUsed: 1, recordedEntries: 0 });
    expect(report.aggregate?.callsPerEntry).toBeUndefined();
  });
});
