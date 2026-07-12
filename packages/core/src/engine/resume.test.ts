import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { Replayer } from '../journal/replayer.js';

const approvalWf = defineWorkflow({ name: 'hitl' }, async (ctx) => {
  const analysis = await ctx.agent('analyze the change');
  const stamp = ctx.now();
  const approval = await ctx.awaitExternal<{ approved: boolean }>('gate', {
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['approved'],
      properties: { approved: { type: 'boolean' } },
    },
  });
  return { analysis, stamp, approved: approval.approved };
});

function makeEngine(store: JsonlFileStore, text = 'analysis done') {
  const adapter = scriptedAdapter(() => ({ text }));
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: { loop: 'fake:model' } },
  });
  return { engine, adapter };
}

describe('engine.resume (M2-T09; docs/06 section 10.2)', () => {
  it('suspend, exit, offline-resolve, resume: completes with zero adapter calls', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-resume-'));
    const store = new JsonlFileStore({ dir });

    const first = makeEngine(store);
    const firstOutcome = await first.engine.run(approvalWf, undefined, { runId: 'RUN1' }).result;
    expect(firstOutcome.status).toBe('suspended');
    const firstStamp = (await store.load('RUN1')).find((e) => e.kind === 'rand');

    // Offline resolution between processes.
    const prior = await store.load('RUN1');
    const suspended = prior.find((e) => e.kind === 'external');
    const offline = new Replayer({ runId: 'RUN1', store, priorEntries: prior });
    await offline.resolveSuspended(suspended?.seq ?? -1, {
      by: 'external',
      value: { approved: true },
    });

    // Second process resumes: agent and shim replay, the external
    // resolves from the fold, the body completes.
    const second = makeEngine(store, 'MUST NOT RUN');
    const handle = second.engine.resume('RUN1', approvalWf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({
      analysis: 'analysis done',
      stamp: (firstStamp?.value as { value: number }).value,
      approved: true,
    });
    expect(second.adapter.calls).toHaveLength(0);
    const preview = await handle.preview;
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
    expect(preview.invalidResolutions).toEqual([]);
  });

  it('the budgetUsd ceiling is recorded in RunMeta and restored on resume', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-resume-'));
    const store = new JsonlFileStore({ dir });
    // 600k input tokens at the test caps pricing (1 USD/MTok) put the
    // first agent's real spend over the 0.5 USD ceiling, so the second
    // admission blocks and the run settles exhausted.
    const expensive = () => ({
      text: 'x',
      usage: { inputTokens: 600_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    const twoCalls = defineWorkflow({ name: 'capped' }, async (ctx) => {
      await ctx.agent('a', { estCost: 0.01 });
      await ctx.agent('b', { estCost: 0.01 });
      return 'done';
    });
    const first = createEngine({
      adapters: [scriptedAdapter(expensive)],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const firstOutcome = await first.run(twoCalls, undefined, { runId: 'CAP1', budgetUsd: 0.5 })
      .result;
    expect(firstOutcome.status).toBe('exhausted');
    const meta = (await store.listRuns()).find((candidate) => candidate.runId === 'CAP1');
    expect(meta?.budgetUsd).toBe(0.5);

    // A restarted process resumes: the replayed spend counts against
    // the RESTORED ceiling, so the second spawn stays blocked and no
    // live call happens. Before the ceiling was persisted, this resume
    // ran uncapped and settled ok.
    const resumeAdapter = scriptedAdapter(() => ({ text: 'MUST NOT RUN' }));
    const second = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const resumed = await second.resume('CAP1', twoCalls).result;
    expect(resumed.status).toBe('exhausted');
    expect(resumeAdapter.calls).toHaveLength(0);
    const metaAfter = (await store.listRuns()).find((candidate) => candidate.runId === 'CAP1');
    expect(metaAfter?.budgetUsd).toBe(0.5);
  });

  it('a meta record without a ceiling resumes uncapped, preserving old journals', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-resume-'));
    const store = new JsonlFileStore({ dir });
    const expensive = () => ({
      text: 'x',
      usage: { inputTokens: 600_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    const twoCalls = defineWorkflow({ name: 'capped' }, async (ctx) => {
      await ctx.agent('a', { estCost: 0.01 });
      await ctx.agent('b', { estCost: 0.01 });
      return 'done';
    });
    const first = createEngine({
      adapters: [scriptedAdapter(expensive)],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    await first.run(twoCalls, undefined, { runId: 'CAP2', budgetUsd: 0.5 }).result;

    // Simulate a record written before the field existed (or a store
    // that dropped it).
    const recorded = (await store.listRuns()).find((candidate) => candidate.runId === 'CAP2');
    expect(recorded).toBeDefined();
    if (recorded !== undefined) {
      const { budgetUsd: _dropped, ...legacy } = recorded;
      await store.putMeta(legacy);
    }

    const resumeAdapter = scriptedAdapter(expensive);
    const second = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const resumed = await second.resume('CAP2', twoCalls).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('done');
    expect(resumeAdapter.calls).toHaveLength(1);
  });

  it('requires the workflow and rejects a name mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-resume-'));
    const store = new JsonlFileStore({ dir });
    const { engine } = makeEngine(store);
    await engine.run(approvalWf, undefined, { runId: 'RUN2' }).result;

    // In-process runs have no persisted source: a bare resume is a typed
    // ConfigError delivered through the handle (M6-T02 semantics).
    await expect(engine.resume('RUN2').result).rejects.toThrow(ConfigError);
    const other = defineWorkflow({ name: 'other' }, async () => Promise.resolve(1));
    await expect(engine.resume('RUN2', other).result).rejects.toThrow('binding mismatch');
  });

  it('warns loudly on a body-hash mismatch and reports orphans honestly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-resume-'));
    const store = new JsonlFileStore({ dir });
    const { engine } = makeEngine(store);
    const simpleWf = defineWorkflow({ name: 'simple' }, async (ctx) => {
      await ctx.agent('a');
      await ctx.agent('b');
      return 'done';
    });
    await engine.run(simpleWf, undefined, { runId: 'RUN3' }).result;

    const warnings: string[] = [];
    const spy = vi
      .spyOn(process, 'emitWarning')
      .mockImplementation((warning: string | Error, opts?: { code?: string }) => {
        warnings.push(typeof opts?.code === 'string' ? opts.code : String(warning));
      });
    try {
      // Same name, edited body: 'b' deleted, 'c' inserted.
      const editedWf = defineWorkflow({ name: 'simple' }, async (ctx) => {
        await ctx.agent('a');
        await ctx.agent('c');
        return 'done-edited';
      });
      const { engine: second, adapter } = makeEngine(store, 'live-c');
      const handle = second.resume('RUN3', editedWf);
      const outcome = await handle.result;
      expect(outcome.status).toBe('ok');
      expect(warnings).toContain('RULVAR_RESUME_HASH_MISMATCH');
      // Exactly one live call ('c'); 'b' is orphaned, never re-paid.
      expect(adapter.calls).toHaveLength(1);
      const preview = await handle.preview;
      expect(preview.hits).toBe(1);
      expect(preview.misses).toBe(1);
      expect(preview.orphaned).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('dry-run performs zero live calls and stops at the exact divergence', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-resume-'));
    const store = new JsonlFileStore({ dir });
    const { engine } = makeEngine(store);
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('recorded');
      await ctx.agent('new call');
      return 'x';
    });
    const recordedOnly = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('recorded');
      return 'x';
    });
    await engine.run(recordedOnly, undefined, { runId: 'RUN4' }).result;

    const { engine: second, adapter } = makeEngine(store, 'MUST NOT RUN');
    const outcome = await second.resume('RUN4', wf, { dryRun: true }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('journal_miss');
    expect(outcome.error?.message).toContain('would go live');
    expect(adapter.calls).toHaveLength(0);
  });
});
