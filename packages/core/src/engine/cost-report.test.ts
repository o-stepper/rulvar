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
import { z } from 'zod';

import { JsonlFileStore } from '../stores/jsonl.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { Replayer } from '../journal/replayer.js';
import { parseModelRef } from '../model/router.js';
import { defineWorkflow, type CostAttribution } from './ctx.js';
import { ConfigError } from '../l0/errors.js';
import type { JournalEntry, ProviderCallRecord } from '../l0/entries.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';
import { createEngine } from './engine.js';
import {
  accountSpendFromJournal,
  buildCostReport,
  costReportFromJournal,
  scopeBucket,
} from './cost-report.js';
import { priceEntryBilling } from '../l0/entries.js';
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
    // The named fallback bucket (RV3604): entries with no phase fold
    // under 'unknown', never a '' key.
    expect(report.byPhase).toEqual({ p: 1, unknown: 3 });
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
    for (const values of [
      report.byModel,
      report.byPhase,
      report.byAgentType,
      report.byRole,
      report.byScope,
    ]) {
      const sum = Object.values(values).reduce((acc, usd) => acc + usd, 0);
      expect(sum).toBeCloseTo(report.totalUsd, 12);
    }
    // The abandoned subtree is excluded from the scope rollup too
    // (RV3805): agent:8 paid and was sanctioned away, so no row.
    expect(Object.keys(report.byScope)).not.toContain('agent:8');
  });

  it("empty phase and empty agentType fold under 'unknown', never a '' key (RV3604)", () => {
    // The third comparison run's report read byPhase {"": 5.58} for
    // the whole run and a '' agentType bucket beside the named ones:
    // the empty STRING passed the ?? fallback that absence did not.
    const base = { hashVersion: 2 as const, key: 'k', ordinal: 0, spanId: 's' };
    const usage: Usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const price = (_servedBy: ModelRef, sliceUsage: Usage): number | undefined =>
      sliceUsage.inputTokens / 1_000_000;
    const entries = [
      {
        ...base,
        seq: 1,
        scope: 'agent:1',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
        costAttribution: { phase: '', agentType: '', role: 'loop', budgetAccount: 'run' },
      },
    ] as unknown as JournalEntry[];
    const report = costReportFromJournal(entries, price);
    expect(report.byPhase).toEqual({ unknown: 1 });
    expect(report.byAgentType).toEqual({ unknown: 1 });
    const sum = Object.values(report.byPhase).reduce((acc, usd) => acc + usd, 0);
    expect(sum).toBeCloseTo(report.totalUsd, 12);
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

describe('byRole attribution is exhaustive (v1.59.0 review P0)', () => {
  it('folds the synthesis invocation to a finite byRole.synthesize, live and offline', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    let orchTurn = 0;
    const adapter = scriptedAdapter((req, _call): ScriptedTurn => {
      const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
        ?.rulvar;
      if (rulvar?.agentType === 'worker') {
        return { text: 'evidence', usage: { inputTokens: 400, outputTokens: 30 } };
      }
      const text = req.messages
        .flatMap((msg) => msg.parts)
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
      if (text.includes('DRAFT:')) {
        return {
          toolCall: { name: 'finish', args: { result: 'synthesized: agree' } },
          usage: { inputTokens: 700, outputTokens: 90 },
        };
      }
      const handles: number[] = [];
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result') {
            const result = part.result as { handle?: number } | undefined;
            if (typeof result?.handle === 'number' && !handles.includes(result.handle)) {
              handles.push(result.handle);
            }
          }
        }
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study A' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft: agree' } } };
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
        },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const wfSynth = makeOrchestratorWorkflow('compare the studies', { synthesis: {} });
    const outcome = await engine.run(wfSynth, undefined, { runId: 'COST-SYNTH' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('synthesized: agree');

    // Every role bucket exists and is finite; before the fix the
    // synthesize bucket folded `undefined + usd` to NaN.
    const live = outcome.cost.byRole;
    expect(Object.keys(live).sort()).toEqual([
      'extract',
      'finalize',
      'loop',
      'orchestrate',
      'plan',
      'summarize',
      'synthesize',
    ]);
    for (const usd of Object.values(live)) {
      expect(Number.isFinite(usd)).toBe(true);
    }
    // testCaps pricing (1 in, 10 out per MTok) over the scripted
    // synthesis usage: 700 input + 90 output tokens.
    expect(live.synthesize).toBeCloseTo(0.0016, 12);
    // NaN survives no JSON round trip (it reads back as null); the
    // report stays JSON clean.
    expect(JSON.stringify(live)).not.toContain('null');

    // The independent journal fold agrees with the live report.
    const independent = costReportFromJournal(await store.load('COST-SYNTH'), priceVia(adapter));
    expect(independent.byRole).toEqual(live);
  });
});

describe('the dynamic stage phases (RV3905, the fourth comparison experiment)', () => {
  it('folds a dynamic run into named stage buckets, live and offline, summing to the total', async () => {
    // The comparison run's report read byPhase 100% 'unknown' over a
    // run whose stages were plainly separable in the journal: the fold
    // reads costAttribution.phase and the dynamic path never stamped
    // one. Each engine-owned dispatch now names its stage.
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-phase-'));
    const store = new JsonlFileStore({ dir });
    const anchor = 'src/exec.ts:256-296';
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
        ?.rulvar;
      if (rulvar?.agentType === 'worker') {
        return {
          text: `A failed audit write does not mask success (\`${anchor}\`).`,
          usage: { inputTokens: 400, outputTokens: 30 },
        };
      }
      const text = req.messages
        .flatMap((msg) => msg.parts)
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
      // The judge loop wire (PAIRS:) and its schema extract wire (the
      // judged JSON riding the extract prompt) both answer the same
      // agreeing verdict; both fold under the 'judge' stage.
      if (text.includes('PAIRS:') || text.includes('"contradictions"')) {
        return {
          text: JSON.stringify({ contradictions: [] }),
          usage: { inputTokens: 300, outputTokens: 20 },
        };
      }
      if (text.includes('DRAFT:')) {
        return {
          toolCall: {
            name: 'finish',
            args: { result: `final: the audit-write failure is not masked [${anchor}].` },
          },
          usage: { inputTokens: 700, outputTokens: 90 },
        };
      }
      const handles: number[] = [];
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result') {
            const result = part.result as { handle?: number } | undefined;
            if (typeof result?.handle === 'number' && !handles.includes(result.handle)) {
              handles.push(result.handle);
            }
          }
        }
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read span' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft: agree' } } };
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          // The schema'd judge extracts through the extract role
          // (RV3406): without a route the judge dies unrouted.
          extract: 'fake:model',
        },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const wf = makeOrchestratorWorkflow('audit the executor', {
      synthesis: {},
      claimConsistency: { stage: 'final' },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'COST-PHASE' }).result;
    expect(outcome.status).toBe('ok');

    // Every stage the run performed has its named bucket, nothing
    // falls to 'unknown', and the buckets partition the total.
    const live = outcome.cost.byPhase;
    expect(Object.keys(live).sort()).toEqual(['composition', 'coordination', 'fan-out', 'judge']);
    for (const usd of Object.values(live)) {
      expect(usd).toBeGreaterThan(0);
    }
    const sum = Object.values(live).reduce((acc, usd) => acc + usd, 0);
    expect(sum).toBeCloseTo(outcome.cost.totalUsd, 12);

    // Live and journal parity by construction: both folds read the
    // same stamped field of the same entries.
    const independent = costReportFromJournal(await store.load('COST-PHASE'), priceVia(adapter));
    expect(independent.byPhase).toEqual(live);
  });

  it('an explicit host phase wins over the stage names, filling only the vacuum', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-phase-host-'));
    const store = new JsonlFileStore({ dir });
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
        ?.rulvar;
      if (rulvar?.agentType === 'worker') {
        return { text: 'evidence', usage: { inputTokens: 100, outputTokens: 10 } };
      }
      const handles: number[] = [];
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result') {
            const result = part.result as { handle?: number } | undefined;
            if (typeof result?.handle === 'number' && !handles.includes(result.handle)) {
              handles.push(result.handle);
            }
          }
        }
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read span' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft: agree' } } };
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const wrapped = defineWorkflow({ name: 'wrapped' }, async (ctx) => {
      return ctx.phase('audit', () => ctx.orchestrate('audit the executor'));
    });
    const outcome = await engine.run(wrapped, undefined, {
      runId: 'COST-PHASE-HOST',
      budgetUsd: 5,
    }).result;
    expect(outcome.status).toBe('ok');
    // The host named the phase; the stage names must not displace it,
    // for the coordination loop and the children alike.
    expect(Object.keys(outcome.cost.byPhase)).toEqual(['audit']);
    const independent = costReportFromJournal(
      await store.load('COST-PHASE-HOST'),
      priceVia(adapter),
    );
    expect(independent.byPhase).toEqual(outcome.cost.byPhase);
  });
});

describe('the per-call additive fold (RV504, the ninth-experiment accounting P1)', () => {
  const usageOf = (inputTokens: number, outputTokens: number): Usage => ({
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  const call = (ordinal: number, usage: Usage): ProviderCallRecord => ({
    ordinal,
    role: 'loop',
    servedBy: 'fake:model',
    attempt: 1,
    outcome: 'ok',
    usage,
  });
  const entryOf = (seq: number, overrides: Partial<JournalEntry>): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-28T00:00:00.000Z',
    seq,
    scope: '',
    key: `agent:${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    servedBy: 'fake:model',
    ...overrides,
  });
  // Past 500 input tokens the WHOLE prompt re-prices: the per-request
  // tier semantics of the pricing contract.
  const tiered = (ref: ModelRef, usage: Usage): number | undefined => {
    if (!ref.startsWith('fake:')) return undefined;
    const long = usage.inputTokens > 500;
    return (usage.inputTokens * (long ? 30 : 10) + usage.outputTokens * (long ? 60 : 30)) / 1e6;
  };

  it('prices a fully attributed entry per provider call, never tiering the aggregate', () => {
    // Two calls of 300 input each: neither crossed the 500 threshold,
    // so no provider request was billed at the long-context rate. The
    // pre-RV504 fold tiered the 600 aggregate and reported 52% high.
    const entry = entryOf(1, {
      usage: usageOf(600, 40),
      providerCalls: [call(1, usageOf(300, 20)), call(2, usageOf(300, 20))],
    });
    const report = costReportFromJournal([entry], tiered);
    const perCall = (300 * 10 + 20 * 30) / 1e6;
    expect(report.totalUsd).toBeCloseTo(2 * perCall, 15);
    expect(report.totalUsd).toBeLessThan((600 * 30 + 40 * 60) / 1e6);
    expect(report.byModel['fake:model']).toBeCloseTo(2 * perCall, 15);
    expect(report.byRole.loop).toBeCloseTo(2 * perCall, 15);
  });

  it('applies the tier to exactly the call that crossed it', () => {
    const entry = entryOf(1, {
      usage: usageOf(900, 0),
      providerCalls: [call(1, usageOf(600, 0)), call(2, usageOf(300, 0))],
    });
    const report = costReportFromJournal([entry], tiered);
    expect(report.totalUsd).toBeCloseTo((600 * 30) / 1e6 + (300 * 10) / 1e6, 15);
  });

  it('keeps the aggregate fold for a partially attributed entry, byte for byte', () => {
    // Records cover only half the usage: the honest basis is unknown,
    // so the entry folds exactly as before RV504 (aggregate slices).
    const entry = entryOf(1, {
      usage: usageOf(600, 40),
      providerCalls: [call(1, usageOf(300, 20))],
    });
    const report = costReportFromJournal([entry], tiered);
    expect(report.totalUsd).toBe((600 * 30 + 40 * 60) / 1e6);
  });

  it('keeps the aggregate fold for a legacy entry without provider calls', () => {
    const entry = entryOf(1, { usage: usageOf(600, 40) });
    const report = costReportFromJournal([entry], tiered);
    expect(report.totalUsd).toBe((600 * 30 + 40 * 60) / 1e6);
  });
});

describe('the symmetric coverage key (RV604, the round-52 accounting P1)', () => {
  const usageOf = (inputTokens: number, outputTokens: number): Usage => ({
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  const call = (
    ordinal: number,
    usage: Usage,
    overrides: Partial<ProviderCallRecord> = {},
  ): ProviderCallRecord => ({
    ordinal,
    role: 'loop',
    servedBy: 'fake:model',
    attempt: 1,
    outcome: 'ok',
    usage,
    ...overrides,
  });
  const entryOf = (seq: number, overrides: Partial<JournalEntry>): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-29T00:00:00.000Z',
    seq,
    scope: '',
    key: `agent:${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    servedBy: 'fake:model',
    ...overrides,
  });
  const tiered = (ref: ModelRef, usage: Usage): number | undefined => {
    if (!ref.startsWith('fake:') && !ref.startsWith('other:')) return undefined;
    const long = usage.inputTokens > 500;
    return (usage.inputTokens * (long ? 30 : 10) + usage.outputTokens * (long ? 60 : 30)) / 1e6;
  };

  it('several roles on ONE model still price per provider call: the default schema configuration', () => {
    // The audit reproduction: two loop calls of 300 and one extract call
    // of 100, all on the same model, so the per-role slices are
    // (loop, 600) and (extract, 100) while the records sum to 700. The
    // pre-RV604 coverage check compared each per-role SLICE against the
    // per-model record sum, refused coverage, and the aggregate basis
    // tiered the 600-token loop slice: 1900 monetary units instead of
    // the 700 the three requests actually cost.
    const entry = entryOf(1, {
      usage: usageOf(700, 0),
      usageByModel: [
        { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
        { servedBy: 'fake:model', role: 'extract', usage: usageOf(100, 0) },
      ],
      providerCalls: [
        call(1, usageOf(300, 0)),
        call(2, usageOf(300, 0)),
        call(3, usageOf(100, 0), { role: 'extract' }),
      ],
    });
    const report = costReportFromJournal([entry], tiered);
    expect(report.totalUsd).toBeCloseTo((700 * 10) / 1e6, 15);
    expect(report.totalUsd).toBeLessThan((600 * 30 + 100 * 10) / 1e6);
    // byRole is preserved from the records, not lost to the aggregation.
    expect(report.byRole.loop).toBeCloseTo((600 * 10) / 1e6, 15);
    expect(report.byRole.extract).toBeCloseTo((100 * 10) / 1e6, 15);
  });

  it('the same roles on different models keep pricing exactly as before', () => {
    const entry = entryOf(1, {
      usage: usageOf(700, 0),
      usageByModel: [
        { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
        { servedBy: 'other:model', role: 'extract', usage: usageOf(100, 0) },
      ],
      providerCalls: [
        call(1, usageOf(300, 0)),
        call(2, usageOf(300, 0)),
        call(3, usageOf(100, 0), { role: 'extract', servedBy: 'other:model' }),
      ],
    });
    const report = costReportFromJournal([entry], tiered);
    expect(report.totalUsd).toBeCloseTo((700 * 10) / 1e6, 15);
    expect(report.byModel['fake:model']).toBeCloseTo((600 * 10) / 1e6, 15);
    expect(report.byModel['other:model']).toBeCloseTo((100 * 10) / 1e6, 15);
  });

  it('per-model coverage splits: a covered model prices per call while an uncovered one keeps the aggregate', () => {
    // Model A's records cover its slices exactly; model B has no records
    // at all (a partially restored ledger). A's two 300-token requests
    // price at the base rate; B's 600-token slice keeps the honest
    // aggregate basis and tiers, because nothing proves its per-request
    // split.
    const entry = entryOf(1, {
      usage: usageOf(1200, 0),
      usageByModel: [
        { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
        { servedBy: 'other:model', role: 'finalize', usage: usageOf(600, 0) },
      ],
      providerCalls: [call(1, usageOf(300, 0)), call(2, usageOf(300, 0))],
    });
    const report = costReportFromJournal([entry], tiered);
    expect(report.byModel['fake:model']).toBeCloseTo((600 * 10) / 1e6, 15);
    expect(report.byModel['other:model']).toBeCloseTo((600 * 30) / 1e6, 15);
    expect(report.totalUsd).toBeCloseTo((600 * 10 + 600 * 30) / 1e6, 15);
  });

  it('records that undercover their own model keep that model on the aggregate basis', () => {
    const entry = entryOf(1, {
      usage: usageOf(600, 40),
      usageByModel: [{ servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 40) }],
      providerCalls: [call(1, usageOf(300, 20))],
    });
    const report = costReportFromJournal([entry], tiered);
    expect(report.totalUsd).toBe((600 * 30 + 40 * 60) / 1e6);
  });

  it('the live ceiling and the settled fold agree on a multi-role single-model run', async () => {
    // The engine-level coherence obligation (tenth-plan doctrine 2 by
    // way of RV604): with finalize routed and a schema set, one agent
    // spans loop, finalize, and extract on the SAME model, which is the
    // default configuration under a schema. The live ceiling debits
    // each request's delta at the base rate (no single request crosses
    // the 500-token tier), so a 0.012 ceiling admits the run; the
    // settled fold must reach the same dollars instead of re-tiering
    // the 600-token loop aggregate to 2.5x what the ceiling debited.
    const tieredTable = {
      pricingVersion: 'coherence-1',
      models: {
        'fake:model': {
          inputUsdPerMTok: 10,
          outputUsdPerMTok: 30,
          tiers: [{ aboveInputTokens: 500, inputMultiplier: 3, outputMultiplier: 2 }],
        },
      },
    };
    const readTool = tool({
      name: 'read',
      description: 'reads a page',
      parameters: z.strictObject({}),
      execute: () => Promise.resolve({ page: 1 }),
    });
    const adapter = scriptedAdapter((_req, callIndex) => {
      switch (callIndex) {
        case 0:
          return { toolCall: { name: 'read', args: {} }, usage: { inputTokens: 300 } };
        case 1:
          return { text: 'done reading', usage: { inputTokens: 300 } };
        case 2:
          // finalize (toolChoice 'none' over the transcript)
          return { text: 'the synthesis', usage: { inputTokens: 50 } };
        default:
          // extract (native tier): the schema-conforming JSON text
          return { text: '{"score":1}', usage: { inputTokens: 100 } };
      }
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      pricing: tieredTable,
      // The default 0.50 USD flat spawn reserve dwarfs this run's cents;
      // shrink it so the tight ceiling can admit the agent at all.
      budgetDefaults: { flatReserveUsd: 0.005 },
      defaults: {
        routing: { loop: 'fake:model', finalize: 'fake:model', extract: 'fake:model' },
      },
    });
    const coherence = defineWorkflow({ name: 'coherence' }, async (ctx) =>
      ctx.agent('assess the repo', {
        schema: z.strictObject({ score: z.number() }),
        tools: [readTool],
      }),
    );
    const outcome = await engine.run(coherence, undefined, {
      runId: 'COHERENCE',
      budgetUsd: 0.012,
    }).result;
    // The live ledger admitted every request under the ceiling.
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ score: 1 });
    // The terminal entry really is the audit's shape: three roles, one
    // model, records covering the slices.
    const terminal = (await store.load('COHERENCE')).find(
      (entry) => entry.kind === 'agent' && entry.status === 'ok',
    );
    expect(terminal?.usageByModel?.map((slice) => slice.role).sort()).toEqual([
      'extract',
      'finalize',
      'loop',
    ]);
    // 750 input and 20 output tokens across four requests, every one
    // below the tier threshold: the settled total is the base-rate sum
    // the ceiling debited, and it fits the ceiling the run ran under.
    expect(outcome.cost.totalUsd).toBeCloseTo((750 * 10 + 20 * 30) / 1e6, 12);
    expect(outcome.cost.totalUsd).toBeLessThan(0.012);
  });
});

describe('non-finite accounting is refused typed (RV610)', () => {
  const usageOf = (inputTokens: number, outputTokens: number): Usage => ({
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  const call = (ordinal: number, usage: Usage): ProviderCallRecord => ({
    ordinal,
    role: 'loop',
    servedBy: 'fake:model',
    attempt: 1,
    outcome: 'ok',
    usage,
  });
  const entryOf = (seq: number, overrides: Partial<JournalEntry>): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-29T00:00:00.000Z',
    seq,
    scope: '',
    key: `agent:${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    servedBy: 'fake:model',
    ...overrides,
  });

  it('two covered calls with individually finite prices overflowing the fold throw typed', () => {
    // The audit reproduction verbatim: each per-request price is
    // Number.MAX_VALUE (finite, passes the per-price validation), and
    // the sum is Infinity. Pre-fix the fold returned it and the report
    // published it; JSON then serializes Infinity and the NaN it breeds
    // into null.
    const entry = entryOf(1, {
      usage: usageOf(600, 0),
      providerCalls: [call(1, usageOf(300, 0)), call(2, usageOf(300, 0))],
    });
    expect(() => priceEntryBilling(entry, () => Number.MAX_VALUE)).toThrow(/finite/);
    expect(() => costReportFromJournal([entry], () => Number.MAX_VALUE)).toThrow(/finite/);
  });

  it('the aggregate slice path and the cross-entry total are guarded the same way', () => {
    // Each entry folds to a finite MAX_VALUE; the report total is the
    // accumulation that overflows, so the guard must live at the public
    // boundary too, not only inside one entry.
    const entries = [
      entryOf(1, { usage: usageOf(100, 0) }),
      entryOf(2, { usage: usageOf(100, 0) }),
    ];
    expect(() => costReportFromJournal(entries, () => Number.MAX_VALUE)).toThrow(/finite/);
    // One huge but finite entry stays representable and allowed.
    const single = costReportFromJournal([entries[0]], () => Number.MAX_VALUE);
    expect(Number.isFinite(single.totalUsd)).toBe(true);
  });
});

describe('the byScope rollup (RV3805)', () => {
  const base = { hashVersion: 2 as const, key: 'k', ordinal: 0, spanId: 's' };
  const usage: Usage = {
    inputTokens: 1_000_000,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  const price = (_servedBy: ModelRef, sliceUsage: Usage): number | undefined =>
    sliceUsage.inputTokens / 1_000_000;

  it('root and every child are addressable rows whose sum equals the total', () => {
    // The third comparison analysis had to hand-aggregate invoice rows
    // to say "the children cost $2.75 of the $5.58 run"; the report
    // now carries the cut directly.
    const entries = [
      {
        ...base,
        seq: 1,
        scope: '',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
        costAttribution: { role: 'orchestrate' },
      },
      {
        ...base,
        seq: 2,
        scope: 'agent:1',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
      },
      {
        ...base,
        seq: 3,
        scope: 'agent:1',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
      },
      {
        ...base,
        seq: 4,
        scope: 'agent:2',
        kind: 'agent',
        status: 'ok',
        usage,
        servedBy: 'fake:model',
      },
    ] as unknown as JournalEntry[];
    const report = costReportFromJournal(entries, price);
    expect(report.byScope).toEqual({ root: 1, 'agent:1': 2, 'agent:2': 1 });
    const sum = Object.values(report.byScope).reduce((acc, usd) => acc + usd, 0);
    expect(sum).toBeCloseTo(report.totalUsd, 12);
  });

  it("scopeBucket names the root's own empty scope 'root' and reserves 'unknown' for absence", () => {
    expect(scopeBucket('')).toBe('root');
    expect(scopeBucket('agent:3')).toBe('agent:3');
    expect(scopeBucket(undefined)).toBe('unknown');
  });

  it('live and journal agree on the rollup, one rule on both builders', async () => {
    const store = new InMemoryStore();
    const adapter = scriptedAdapter((_req, call) => ({
      text: `answer ${String(call)}`,
      usage: { inputTokens: 1000, outputTokens: 50 },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'COST-SCOPE' }).result;
    expect(outcome.status).toBe('ok');
    const independent = costReportFromJournal(await store.load('COST-SCOPE'), priceVia(adapter));
    expect(outcome.cost.byScope).toEqual(independent.byScope);
    const sum = Object.values(outcome.cost.byScope).reduce((acc, usd) => acc + usd, 0);
    expect(sum).toBeCloseTo(outcome.cost.totalUsd, 12);
  });
});

describe('the exported live builder refuses non-finite numbers (RV705)', () => {
  const liveAttribution = (): CostAttribution => ({
    byModel: new Map([['fake:m', 1.5]]),
    byPhase: new Map([['', 1.5]]),
    byAgentType: new Map([['worker', 1.5]]),
    byScope: new Map([['', 1.5]]),
    byRole: new Map<InvocationRole, number>([['loop', 1.5]]),
    unpriced: [],
    orchestrator: { spentUsd: 0.5, wakes: 1, forcedFinish: false, reserveUsedUsd: 0 },
  });

  it('a finite report is returned byte for byte as before', () => {
    const report = buildCostReport(liveAttribution(), 1.5);
    expect(report.totalUsd).toBe(1.5);
    expect(report.grossUsd).toBe(1.5);
    expect(report.byRole.loop).toBe(1.5);
    expect(report.orchestrator.share).toBeCloseTo(0.5 / 1.5, 12);
  });

  it("the live builder folds a '' key under 'unknown', merging with an existing bucket (RV3604)", () => {
    const attribution = liveAttribution();
    // liveAttribution carries byPhase '' = 1.5; a host that already
    // accumulated an 'unknown' bucket must see ONE merged bucket.
    attribution.byPhase.set('unknown', 0.5);
    const report = buildCostReport(attribution, 2.0);
    expect(report.byPhase).toEqual({ unknown: 2.0 });
    expect(Object.keys(report.byAgentType)).not.toContain('');
  });

  it('an Infinity or NaN total is a typed refusal, never a null in JSON', () => {
    // costReportFromJournal refuses non-finite reports (RV610); the
    // exported live builder is the same public surface and must hold the
    // same doctrine instead of serializing Infinity into null.
    expect(() => buildCostReport(liveAttribution(), Number.POSITIVE_INFINITY)).toThrow(ConfigError);
    expect(() => buildCostReport(liveAttribution(), Number.POSITIVE_INFINITY)).toThrow(
      /costReport/,
    );
    expect(() => buildCostReport(liveAttribution(), Number.NaN)).toThrow(ConfigError);
  });

  it('a poisoned attribution bucket or abandoned ledger is refused the same way', () => {
    const poisonedBucket = liveAttribution();
    poisonedBucket.byModel.set('fake:overflow', Number.POSITIVE_INFINITY);
    expect(() => buildCostReport(poisonedBucket, 1.5)).toThrow(ConfigError);
    expect(() =>
      buildCostReport(liveAttribution(), 1.5, { usd: Number.NaN, unpriced: [] }),
    ).toThrow(ConfigError);
  });
});

describe('the cost provenance marker (RV1413)', () => {
  it('both builders stamp the report locally estimated', () => {
    // Every dollar in this report is journaled usage priced at the
    // caller's CURRENT pricing table, never a provider statement; the
    // seventeenth comparison run's "$4.79" read as an invoice figure
    // precisely because nothing on the report said otherwise. The
    // marker is a declared literal, mirroring InvoiceExport's
    // pricingBasis, so finance tooling never has to guess.
    const journalReport = costReportFromJournal([], () => undefined);
    expect(journalReport.basis).toBe('locally-estimated');
    const liveReport = buildCostReport(
      {
        byModel: new Map([['fake:m', 1.5]]),
        byPhase: new Map([['', 1.5]]),
        byAgentType: new Map([['worker', 1.5]]),
        byScope: new Map([['', 1.5]]),
        byRole: new Map<InvocationRole, number>([['loop', 1.5]]),
        unpriced: [],
        orchestrator: { spentUsd: 0, wakes: 0, forcedFinish: false, reserveUsedUsd: 0 },
      },
      1.5,
    );
    expect(liveReport.basis).toBe('locally-estimated');
  });
});

/**
 * The per-account journal fold (RV1505): the sub-account resume seed
 * derives each scope's INCLUSIVE spend from the same settled entries
 * the root seed folds, with the account tree read from the journaled
 * spawn-admission decisions.
 */
describe('accountSpendFromJournal (RV1505)', () => {
  const USAGE = { inputTokens: 100000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const price = (_servedBy: string, usage: { inputTokens: number }): number =>
    usage.inputTokens / 1_000_000;
  const entry = (partial: Record<string, unknown>): JournalEntry => ({
    hashVersion: 2,
    seq: 0,
    scope: '',
    key: 'k',
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    spanId: 's1',
    startedAt: '2026-08-03T00:00:00.000Z',
    ...partial,
  });

  it('folds direct spend per account and propagates it up the admission tree', () => {
    const entries: JournalEntry[] = [
      entry({
        seq: 1,
        kind: 'decision',
        key: 'admission',
        value: {
          decisionType: 'spawn-admission',
          childScope: 'agent:5',
          parentAccountScope: 'orch:1',
        },
      }),
      entry({
        seq: 2,
        usage: USAGE,
        servedBy: 'fake:model',
        costAttribution: { agentType: 'w', role: 'loop', budgetAccount: 'agent:5' },
      }),
      entry({
        seq: 3,
        usage: USAGE,
        servedBy: 'fake:model',
        costAttribution: { agentType: 'o', role: 'orchestrate', budgetAccount: 'orch:1' },
      }),
      entry({
        seq: 4,
        usage: USAGE,
        servedBy: 'fake:model',
        costAttribution: { agentType: 'r', role: 'loop', budgetAccount: 'run' },
      }),
    ];
    const spend = accountSpendFromJournal(entries, price);
    expect(spend['agent:5']).toBeCloseTo(0.1, 10);
    // The parent holds its own turn plus the child's, inclusively.
    expect(spend['orch:1']).toBeCloseTo(0.2, 10);
    expect(spend.run).toBeCloseTo(0.3, 10);
  });

  it('legacy entries without attribution fold under the root, and abandoned ones fold nowhere', () => {
    const entries: JournalEntry[] = [
      entry({ seq: 1, usage: USAGE, servedBy: 'fake:model' }),
      entry({
        seq: 2,
        ref: 1,
        kind: 'abandon',
        abandon: { target: 1, authorizedBy: 1, reason: 'test' },
        status: 'ok',
      }),
    ];
    const spend = accountSpendFromJournal(entries, price);
    // The single usage entry was abandoned: nothing folds anywhere.
    expect(spend['run'] ?? 0).toBe(0);
  });
});
