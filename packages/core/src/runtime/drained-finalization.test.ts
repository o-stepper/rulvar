/**
 * The drained-finalization grant (RV2204, the third parity rerun). The
 * exposure drain is terminal mid-work, and the third rerun's workers
 * died ~30 turns into research with evidence pools of 17 and 22 under
 * a floor of 24 and a CONFIGURED finalization window: the drain came
 * before the window, and the window's play needs the very wire the
 * drain refuses. With finalizationReserve.maxOutputTokens declared, a
 * drained seat that already did work spends ONE clamped finalization
 * turn (the window allowlist as its only tools) before the typed
 * terminal; a seat with no completed turns keeps dying free (the
 * RV2002 zero-cost doctrine).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BudgetExhaustedError } from '../l0/errors.js';
import type { Msg } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
import { mergeUsageLimits } from './usage-limits.js';

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

const readTool = (executions: { count: number }) =>
  tool({
    name: 'read',
    description: 'reads evidence',
    parameters: z.strictObject({}),
    execute: () => {
      executions.count += 1;
      return Promise.resolve({ page: executions.count });
    },
  });

const recordTool = (executions: { count: number }) =>
  tool({
    name: 'record',
    description: 'records evidence',
    parameters: z.strictObject({}),
    execute: () => {
      executions.count += 1;
      return Promise.resolve({ recorded: executions.count });
    },
  });

const finishTool = () =>
  tool({
    name: 'finish',
    description: 'the terminal tool',
    parameters: z.strictObject({ result: z.string() }),
    execute: () => Promise.resolve('unused'),
  });

const drainRefusal = () =>
  new BudgetExhaustedError(
    `in flight exposure cap reached: spent 0.0500 USD plus live dispatch estimates 0.0000 USD ` +
      `plus this turn's estimate 0.0300 USD does not fit maxInFlightExposureUsd 0.0600 USD; ` +
      `the dispatch was refused before any provider call`,
    {
      data: {
        reason: 'in-flight-exposure',
        capUsd: 0.06,
        spentUsd: 0.05,
        inFlightUsd: 0,
        estimateUsd: 0.03,
      },
    },
  );

/**
 * Scripted exposure admission: full-allowance turns refuse from
 * `refuseFromAdmission` onward, anything clamped to `clampMax` or
 * below always admits, and no live hold ever exists (the drained arm).
 */
function drainingBudget(options: { clampMax: number; refuseFromAdmission: number }) {
  let admissions = 0;
  const budget = {
    beforeTurn: () => {},
    awaitExposureRelease: () => Promise.resolve('drained' as const),
    admitTurnExposure: (_ref: unknown, _inputTokens: number, planned: number) => {
      admissions += 1;
      if (admissions >= options.refuseFromAdmission && planned > options.clampMax) {
        throw drainRefusal();
      }
      return () => {};
    },
    liveExposureUsd: () => 0,
    onUsage: () => {},
  };
  return { budget: budget as unknown as Parameters<typeof runAgent>[0]['budget'] };
}

const drainNotices = (req: { messages: Msg[] }): string[] =>
  req.messages
    .filter((msg) => msg.role === 'user')
    .flatMap((msg) => msg.parts)
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .filter((text) => text.startsWith(`The run's in-flight exposure pool is drained`));

describe('the drained-finalization grant (RV2204, the third parity rerun)', () => {
  it('a mid-work drained seat spends one clamped turn with the allowlisted tools', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return { toolCalls: [{ name: 'read', args: {} }] };
      }
      // The granted finalization turn: parallel records plus a summary.
      return {
        toolCalls: [
          { name: 'record', args: {} },
          { name: 'record', args: {} },
        ],
        text: 'final drained summary',
      };
    });
    const events = recordingSink();
    const { budget } = drainingBudget({ clampMax: 400, refuseFromAdmission: 2 });
    const result = await runAgent({
      prompt: 'research the module',
      adapter,
      resolved,
      exposureWait: 'child',
      budget,
      limits: mergeUsageLimits({
        maxTurns: 8,
        maxToolCalls: 10,
        maxOutputTokensPerTurn: 2500,
        finalizationReserve: { maxOutputTokens: 400 },
        finalizationWindow: { reserveCalls: 2, allow: ['record'] },
      }),
      tools: runtimeOf([readTool(readExecutions), recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      events,
    });
    // The terminal stays the typed drained boundary.
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('exposure pool drained');
    // The grant ran: one wire dispatch past the first turn, clamped to
    // the reserve allowance, carrying ONLY the allowlisted tool, and
    // its parallel record calls executed.
    expect(adapter.calls).toHaveLength(2);
    expect(readExecutions.count).toBe(1);
    expect(recordExecutions.count).toBe(2);
    const grantReq = adapter.calls[1] as {
      messages: Msg[];
      maxOutputTokens?: number;
      tools?: Array<{ name: string }>;
    };
    expect(grantReq.maxOutputTokens).toBe(400);
    expect(grantReq.tools?.map((contract) => contract.name)).toEqual(['record']);
    expect(drainNotices(grantReq)).toHaveLength(1);
  });

  it('a seat with no completed turns keeps dying free (the RV2002 doctrine)', async () => {
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter(() => ({ text: 'unreachable' }));
    const events = recordingSink();
    const { budget } = drainingBudget({ clampMax: 400, refuseFromAdmission: 1 });
    const result = await runAgent({
      prompt: 'research the module',
      adapter,
      resolved,
      exposureWait: 'child',
      budget,
      limits: mergeUsageLimits({
        maxTurns: 8,
        maxToolCalls: 10,
        maxOutputTokensPerTurn: 2500,
        finalizationReserve: { maxOutputTokens: 400 },
        finalizationWindow: { reserveCalls: 2, allow: ['record'] },
      }),
      tools: runtimeOf([recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      events,
    });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('exposure pool drained');
    // Zero provider attempts, zero tool executions: the seat is free.
    expect(adapter.calls).toHaveLength(0);
    expect(recordExecutions.count).toBe(0);
  });
});
