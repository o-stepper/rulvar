/**
 * Cost report reconciliation (M5-T03 acceptance): report totals equal
 * the ledger fold totals EXACTLY, live and after resume, computed
 * independently over the stored journal; unpriced models surface and
 * never contribute a silent zero to priced buckets.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { JsonlFileStore } from '../stores/jsonl.js';
import { Replayer } from '../journal/replayer.js';
import { parseModelRef } from '../model/router.js';
import { defineWorkflow } from './ctx.js';
import type { JournalEntry } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';
import { createEngine } from './engine.js';
import { costReportFromJournal } from './cost-report.js';
import { scriptedAdapter, testCaps, type ScriptedTurn } from './test-harness.js';

const wf = defineWorkflow({ name: 'costly' }, async (ctx) => {
  const [a, b] = await ctx.parallel([
    () => ctx.agent('first task'),
    () => ctx.agent('second task'),
  ]);
  const c = await ctx.agent('third task');
  return { a, b, c };
});

function priceVia(adapter: { caps(model: string): { pricing?: unknown } }) {
  return (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const { model } = parseModelRef(servedBy);
    const pricing = adapter.caps(model).pricing as
      { inputUsdPerMTok: number; outputUsdPerMTok: number } | undefined;
    if (pricing === undefined) {
      return undefined;
    }
    return (
      (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
      (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok
    );
  };
}

describe('cost report reconciliation (M5-T03)', () => {
  it('live report totals equal the independent journal fold exactly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const adapter = scriptedAdapter((_req, call) => ({
      text: `answer ${call}`,
      usage: { inputTokens: 1000 + call * 100, outputTokens: 50 * (call + 1) },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'COST1' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.cost.totalUsd).toBeGreaterThan(0);

    const entries = await store.load('COST1');
    const independent = costReportFromJournal(entries, priceVia(adapter));
    expect(independent.totalUsd).toBe(outcome.cost.totalUsd);
    expect(independent.byModel).toEqual({ 'fake:model': outcome.cost.totalUsd });
    expect(independent.unpriced).toEqual([]);

    // The kernel ledger fold agrees bit for bit.
    const replayer = new Replayer({
      runId: 'COST1',
      store,
      priceUsd: priceVia(adapter),
      priorEntries: entries,
    });
    expect(replayer.ledger().usd).toBe(outcome.cost.totalUsd);
    // The live attribution buckets sum to the same total on a
    // single-provider run.
    const bucketSum = Object.values(outcome.cost.byModel).reduce((acc, usd) => acc + usd, 0);
    expect(bucketSum).toBeCloseTo(outcome.cost.totalUsd, 12);
  });

  it('holds across resume: the resumed report equals the full-journal fold', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const suspending = defineWorkflow({ name: 'gate' }, async (ctx) => {
      const first = await ctx.agent('paid before the gate');
      const approval = await ctx.awaitExternal('gate');
      const second = await ctx.agent('paid after the gate');
      return { first, second, approval };
    });
    const priced = () =>
      scriptedAdapter((_req, call) => ({
        text: `a${call}`,
        usage: { inputTokens: 500, outputTokens: 25 },
      }));
    const adapterA = priced();
    const engineA = createEngine({
      adapters: [adapterA],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const firstOutcome = await engineA.run(suspending, undefined, { runId: 'COST2' }).result;
    expect(firstOutcome.status).toBe('suspended');

    const offline = new Replayer({
      runId: 'COST2',
      store,
      priorEntries: await store.load('COST2'),
    });
    const open = (await store.load('COST2')).find((e) => e.kind === 'external');
    await offline.resolveSuspended(open?.seq ?? -1, { by: 'external', value: { go: true } });

    const adapterB = priced();
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engineB.resume('COST2', suspending).result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load('COST2');
    const independent = costReportFromJournal(entries, priceVia(adapterB));
    // The resumed run's report covers the WHOLE journal (replayed prefix
    // included), exactly like the fold.
    expect(outcome.cost.totalUsd).toBe(independent.totalUsd);
    expect(outcome.usage.inputTokens).toBe(1000);
  });

  it('surfaces unpriced models without silent zeros in both folds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const unpricedCaps = testCaps({ pricing: undefined });
    const adapter = scriptedAdapter(() => ({ text: 'free?' }), { caps: unpricedCaps });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const simple = defineWorkflow({ name: 'simple' }, (ctx) => ctx.agent('one'));
    const outcome = await engine.run(simple, undefined, { runId: 'COST3' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.cost.totalUsd).toBe(0);
    expect(outcome.cost.unpriced).toHaveLength(1);

    const independent = costReportFromJournal(await store.load('COST3'), priceVia(adapter));
    expect(independent.unpriced).toHaveLength(1);
    expect(independent.unpriced[0]?.model).toBe('fake:model');
    expect(independent.totalUsd).toBe(0);
  });

  it('a replay-only resume of a dynamic run reproduces the report byte for byte', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const orchestrated = () =>
      scriptedAdapter((req): ScriptedTurn => {
        const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
          ?.rulvar;
        if (rulvar?.agentType === 'worker') {
          return { text: 'child done', usage: { inputTokens: 2000, outputTokens: 100 } };
        }
        const handles: number[] = [];
        for (const msg of req.messages) {
          for (const part of msg.parts) {
            if (part.type === 'tool-result') {
              const result = part.result as { handle?: number };
              if (typeof result?.handle === 'number') {
                handles.push(result.handle);
              }
            }
          }
        }
        const last = JSON.stringify(req.messages.at(-1)?.parts);
        if (handles.length === 0) {
          return {
            toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'work' } },
            usage: { inputTokens: 1000, outputTokens: 50 },
          };
        }
        if (!last.includes('child done')) {
          return {
            toolCall: { name: 'await_all', args: { handles } },
            usage: { inputTokens: 1200, outputTokens: 60 },
          };
        }
        return {
          toolCall: { name: 'finish', args: { result: 'orchestrated' } },
          usage: { inputTokens: 1500, outputTokens: 80 },
        };
      });
    const wfGoal = (): ReturnType<typeof makeOrchestratorWorkflow> =>
      makeOrchestratorWorkflow('fold the costs', {});
    const adapterA = orchestrated();
    const engineA = createEngine({
      adapters: [adapterA],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    // A run ceiling resolves the orchestrator cap (0.2 * 10), so the
    // orchestrator sub-account opens and its block folds non-zero.
    const first = await engineA.run(wfGoal(), undefined, { runId: 'COSTD', budgetUsd: 10 }).result;
    expect(first.status).toBe('ok');
    expect(first.value).toBe('orchestrated');
    // The folded orchestrator block is live-visible on the first run
    // (await_all awaits results directly: no wake suspension arms, so
    // wakes stays 0 by the armed-wake definition).
    expect(first.cost.orchestrator.spentUsd).toBeGreaterThan(0);
    expect(first.cost.orchestrator.wakes).toBe(0);
    expect(first.cost.byRole.orchestrate).toBeGreaterThan(0);

    const adapterB = orchestrated();
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const resumed = await engineB.resume('COSTD', wfGoal()).result;
    expect(resumed.status).toBe('ok');
    // Pure replay: zero live calls, and the COMPLETE report (orchestrator
    // block included) is byte-identical because both settles fold the
    // same journal (the v1.6.0 follow-up review saw spentUsd/share
    // collapse to zero here).
    expect(adapterB.calls).toHaveLength(0);
    expect(resumed.cost).toEqual(first.cost);
  });

  it('after a rerun-carrying resume, every breakdown sums to the total', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    let hang = true;
    const adapter = scriptedAdapter(() =>
      hang
        ? { text: 'slow', usage: { inputTokens: 100_000, outputTokens: 0 }, hangMs: 5_000 }
        : { text: 'quick', usage: { inputTokens: 100_000, outputTokens: 0 } },
    );
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const spender = defineWorkflow({ name: 'spender' }, (ctx) =>
      ctx.phase('work', () => ctx.agent('one paid attempt')),
    );
    const handle = engine.run(spender, undefined, { runId: 'COSTR' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await handle.cancel('rerun fixture');
    const first = await handle.result;
    expect(first.status).toBe('cancelled');

    hang = false;
    const resumed = await engine.resume('COSTR', spender).result;
    expect(resumed.status).toBe('ok');
    // The cancelled attempt's spend AND the rerun's spend are both real
    // money: the total covers both, and every breakdown covers exactly
    // what the total covers (the review's exhausted resume reported
    // totalUsd 0.4439 against byModel summing 0.2226).
    const sums = [
      Object.values(resumed.cost.byModel),
      Object.values(resumed.cost.byPhase),
      Object.values(resumed.cost.byAgentType),
      Object.values(resumed.cost.byRole),
    ].map((values) => values.reduce((acc, usd) => acc + usd, 0));
    for (const sum of sums) {
      expect(sum).toBeCloseTo(resumed.cost.totalUsd, 12);
    }
    expect(resumed.cost.totalUsd).toBeGreaterThan(0);
  });

  it('folds the orchestrator block and excludes abandoned subtrees from every map', () => {
    const base = {
      hashVersion: 2 as const,
      key: 'k',
      ordinal: 0,
      spanId: 's',
    };
    const usage: Usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const price = (_servedBy: ModelRef, sliceUsage: Usage): number | undefined =>
      sliceUsage.inputTokens / 1_000_000;
    const entries = [
      // A worker attributed to phase 'p'.
      { ...base, seq: 1, scope: 'agent:1', kind: 'agent', status: 'running' },
      {
        ...base,
        seq: 2,
        ref: 1,
        scope: 'agent:1',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
        costAttribution: { phase: 'p', agentType: 'worker', role: 'loop', budgetAccount: 'run' },
      },
      // The orchestrator's own turns.
      {
        ...base,
        seq: 3,
        scope: 'agent:0',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
        costAttribution: {
          agentType: 'orchestrator',
          role: 'orchestrate',
          budgetAccount: 'orchestrator',
        },
      },
      // The reserve-funded forced finish.
      {
        ...base,
        seq: 4,
        scope: 'agent:9',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
        costAttribution: {
          agentType: 'orchestrator',
          role: 'orchestrate',
          budgetAccount: 'wf:x:0/orchestrator',
          finalizeReserve: true,
        },
      },
      // A pre-attribution entry: documented fallback buckets.
      {
        ...base,
        seq: 5,
        scope: 'agent:5',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
      },
      // The at-cap freeze decision and one armed wake.
      {
        ...base,
        seq: 6,
        scope: '',
        kind: 'decision',
        status: 'ok',
        value: { decisionType: 'orchestrator_budget_cap' },
      },
      {
        ...base,
        seq: 7,
        scope: '',
        kind: 'external',
        status: 'suspended',
        value: { key: 'wake:0:0' },
      },
      // An abandoned attempt: paid, then sanctioned away; excluded everywhere.
      { ...base, seq: 8, scope: 'agent:8', kind: 'agent', status: 'running' },
      {
        ...base,
        seq: 9,
        ref: 8,
        scope: 'agent:8',
        kind: 'agent',
        status: 'cancelled',
        usage,
        servedBy: 'fake:model',
        costAttribution: { phase: 'p', agentType: 'worker', role: 'loop', budgetAccount: 'run' },
      },
      {
        ...base,
        seq: 10,
        ref: 8,
        scope: '',
        kind: 'abandon',
        status: 'ok',
        value: { target: 8, authorizedBy: 6, reason: 'superseded' },
      },
    ] as unknown as JournalEntry[];
    const report = costReportFromJournal(entries, price);
    // Five priced entries minus the abandoned one: 4 USD.
    expect(report.totalUsd).toBeCloseTo(4, 12);
    expect(report.byPhase).toEqual({ p: 1, '': 3 });
    expect(report.byAgentType).toEqual({ worker: 1, orchestrator: 2, unknown: 1 });
    expect(report.byRole.orchestrate).toBeCloseTo(2, 12);
    expect(report.byRole.loop).toBeCloseTo(2, 12);
    expect(report.orchestrator).toEqual({
      spentUsd: 2,
      share: 0.5,
      wakes: 1,
      forcedFinish: true,
      reserveUsedUsd: 1,
    });
    for (const values of [report.byModel, report.byPhase, report.byAgentType, report.byRole]) {
      const sum = Object.values(values).reduce((acc, usd) => acc + usd, 0);
      expect(sum).toBeCloseTo(report.totalUsd, 12);
    }
  });

  it('raises usageApprox only when a contributing terminal entry is approximate (v1.39.0 review)', () => {
    const base = { hashVersion: 2 as const, key: 'k', ordinal: 0, spanId: 's' };
    const usage: Usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const price = (_servedBy: ModelRef, sliceUsage: Usage): number | undefined =>
      sliceUsage.inputTokens / 1_000_000;

    // Every contributing turn reported exact usage: the field is absent, so
    // an existing exact usage report is byte for byte what it always was.
    const exact = [
      { ...base, seq: 1, scope: 'agent:1', kind: 'agent', status: 'running' },
      {
        ...base,
        seq: 2,
        ref: 1,
        scope: 'agent:1',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
      },
    ] as unknown as JournalEntry[];
    expect(costReportFromJournal(exact, price).usageApprox).toBeUndefined();

    // One contributing terminal with approximate usage makes the whole
    // total an estimate.
    const approx = [
      { ...base, seq: 1, scope: 'agent:1', kind: 'agent', status: 'running' },
      {
        ...base,
        seq: 2,
        ref: 1,
        scope: 'agent:1',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
        usageApprox: true,
      },
    ] as unknown as JournalEntry[];
    const approxReport = costReportFromJournal(approx, price);
    expect(approxReport.usageApprox).toBe(true);
    expect(approxReport.totalUsd).toBeCloseTo(1, 12);

    // Approximate usage inside an ABANDONED subtree contributes zero to the
    // total, so it must not taint the flag either: the flag is raised on
    // exactly the entries the total sums over.
    const abandoned = [
      { ...base, seq: 1, scope: 'agent:8', kind: 'agent', status: 'running' },
      {
        ...base,
        seq: 2,
        ref: 1,
        scope: 'agent:8',
        kind: 'agent',
        status: 'cancelled',
        usage,
        servedBy: 'fake:model',
        usageApprox: true,
      },
      {
        ...base,
        seq: 3,
        ref: 1,
        scope: '',
        kind: 'abandon',
        status: 'ok',
        value: { target: 1, authorizedBy: 0, reason: 'superseded' },
      },
    ] as unknown as JournalEntry[];
    const abandonedReport = costReportFromJournal(abandoned, price);
    expect(abandonedReport.usageApprox).toBeUndefined();
    expect(abandonedReport.totalUsd).toBeCloseTo(0, 12);
  });
});
