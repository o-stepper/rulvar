import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { createEngine, hashRunArgs } from './engine.js';
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
      // Exactly one live call ('c'); the deleted 'b' is never re-paid.
      // Its recorded operation is COMPLETE (running plus terminal), so
      // the pairing rules keep it out of `orphaned`: that list names
      // only effects that genuinely need recovery.
      expect(adapter.calls).toHaveLength(1);
      const preview = await handle.preview;
      expect(preview.hits).toBe(1);
      expect(preview.misses).toBe(1);
      expect(preview.orphaned).toEqual([]);
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

describe('identical siblings across resume (v1.22.0 review P1-1)', () => {
  const siblingsWf = defineWorkflow({ name: 'identical-siblings' }, async (ctx) => {
    const a = await ctx.agent('identical prompt');
    await ctx.awaitExternal('gate');
    const b = await ctx.agent('identical prompt');
    const c = await ctx.agent('identical prompt');
    return [a, b, c].join('|');
  });

  it('post-resume identical operations mint fresh ordinals and replay binds each sibling', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-siblings-'));
    const store = new JsonlFileStore({ dir });

    // Segment 1: agent (ordinal 0) runs live, the external suspends.
    const first = createEngine({
      adapters: [scriptedAdapter((_req, call) => ({ text: `v${String(call + 1)}` }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const firstOutcome = await first.run(siblingsWf, undefined, { runId: 'SIB1' }).result;
    expect(firstOutcome.status).toBe('suspended');

    // Offline resolution between processes.
    const priorEntries = await store.load('SIB1');
    const suspended = priorEntries.find((e) => e.kind === 'external');
    const offline = new Replayer({ runId: 'SIB1', store, priorEntries });
    await offline.resolveSuspended(suspended?.seq ?? -1, { by: 'external', value: { ok: true } });

    // Segment 2 (fresh process): the first sibling replays, the two
    // post-resume identical calls go live and continue the ordinal
    // space instead of re-minting 0 (the v1.22.0 defect).
    const secondAdapter = scriptedAdapter((_req, call) => ({ text: `w${String(call + 1)}` }));
    const second = createEngine({
      adapters: [secondAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await second.resume('SIB1', siblingsWf).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('v1|w1|w2');
    expect(secondAdapter.calls).toHaveLength(2);

    const entries = await store.load('SIB1');
    const agentRunning = entries.filter((e) => e.kind === 'agent' && e.status === 'running');
    expect(agentRunning.map((e) => e.ordinal).sort()).toEqual([0, 1, 2]);
    const triples = entries
      .filter((e) => e.ref === undefined && e.kind !== 'resolution' && e.kind !== 'abandon')
      .map((e) => `${e.scope}|${e.key}|${e.ordinal}`);
    expect(new Set(triples).size).toBe(triples.length);

    // Segment 3: a full replay-strict pass binds every sibling to its
    // own recorded result with zero live calls (the acceptance bar for
    // sibling recovery by (key, ordinal)).
    const thirdAdapter = scriptedAdapter(() => ({ text: 'MUST NOT RUN' }));
    const third = createEngine({
      adapters: [thirdAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const replayHandle = third.resume('SIB1', siblingsWf, { dryRun: true });
    const replayOutcome = await replayHandle.result;
    expect(replayOutcome.status).toBe('ok');
    expect(replayOutcome.value).toBe('v1|w1|w2');
    expect(thirdAdapter.calls).toHaveLength(0);
    const preview = await replayHandle.preview;
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
  });
});

describe('telemetry counters across resume segments (v1.22.0 review P1-2)', () => {
  it('seq stays strictly increasing and spanId unique per run over two resumes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-seq-'));
    const store = new JsonlFileStore({ dir });
    type Seen = { seq: number; spanId: string; replayed: boolean };
    const collect = async (
      handle: import('./run-handle.js').RunHandle<unknown>,
    ): Promise<Seen[]> => {
      const seen: Seen[] = [];
      for await (const event of handle.events) {
        seen.push({ seq: event.seq, spanId: event.spanId, replayed: event.replayed === true });
      }
      return seen;
    };

    const seg1Engine = makeEngine(store);
    const handle1 = seg1Engine.engine.run(approvalWf, undefined, { runId: 'SEQ1' });
    const pump1 = collect(handle1);
    expect((await handle1.result).status).toBe('suspended');
    const seg1 = await pump1;

    // Second segment: resume without resolving; it re-suspends.
    const seg2Engine = makeEngine(store, 'MUST NOT RUN');
    const handle2 = seg2Engine.engine.resume('SEQ1', approvalWf);
    const pump2 = collect(handle2);
    expect((await handle2.result).status).toBe('suspended');
    const seg2 = await pump2;

    // Offline resolution, then a third segment that completes.
    const priorEntries = await store.load('SEQ1');
    const suspended = priorEntries.find((e) => e.kind === 'external');
    const offline = new Replayer({ runId: 'SEQ1', store, priorEntries });
    await offline.resolveSuspended(suspended?.seq ?? -1, {
      by: 'external',
      value: { approved: true },
    });
    const seg3Engine = makeEngine(store, 'MUST NOT RUN');
    const handle3 = seg3Engine.engine.resume('SEQ1', approvalWf);
    const pump3 = collect(handle3);
    expect((await handle3.result).status).toBe('ok');
    const seg3 = await pump3;

    // Every event observed, replayed ones included, in one flat list:
    // the per-run cursor must be strictly increasing across segments.
    const all = [...seg1, ...seg2, ...seg3];
    expect(seg1.length).toBeGreaterThan(0);
    expect(seg2.length).toBeGreaterThan(0);
    expect(seg3.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i += 1) {
      expect(all[i].seq).toBeGreaterThan(all[i - 1].seq);
    }
    // The resumed segments announce their replayed facts WITH the
    // replayed marker (the engine sink dropped it before v1.23).
    expect(seg3.some((e) => e.replayed)).toBe(true);
    // Span ids never repeat across segments of one run.
    const spanSets = [seg1, seg2, seg3].map((seen) => new Set(seen.map((e) => e.spanId)));
    expect([...spanSets[0]].filter((id) => spanSets[1].has(id) || spanSets[2].has(id))).toEqual([]);
    expect([...spanSets[1]].filter((id) => spanSets[2].has(id))).toEqual([]);
    // The durable segment count survives settle-time meta writes.
    const metaRecord = (await store.listRuns()).find((m) => m.runId === 'SEQ1');
    expect(metaRecord?.segments).toBe(3);
  });
});

describe('args binding and the dry-run preview (v1.23.0 review)', () => {
  const argsWf = defineWorkflow(
    { name: 'argsy' },
    async (ctx, args: { value?: string } | undefined) => {
      return await ctx.agent(`echo ${args?.value ?? 'missing'}`);
    },
  );
  const argsGateWf = defineWorkflow({ name: 'args-gate' }, async (ctx, args: { value: string }) => {
    const analysis = await ctx.agent(`analyze ${args.value}`);
    const approval = await ctx.awaitExternal<{ ok: boolean }>('gate');
    return { analysis, ok: approval.ok };
  });

  it('genesis records argsProvided plus a canonical argsHash; no-args runs record false', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-argsbind-'));
    const store = new JsonlFileStore({ dir });
    const { engine } = makeEngine(store);
    await engine.run(argsWf, { value: 'CHECK' }, { runId: 'A1' }).result;
    await engine.run(argsWf, undefined, { runId: 'A2' }).result;
    const metas = await store.listRuns();
    const first = metas.find((m) => m.runId === 'A1');
    const second = metas.find((m) => m.runId === 'A2');
    expect(first?.argsProvided).toBe(true);
    expect(first?.argsHash).toBe(hashRunArgs({ value: 'CHECK' }));
    expect(second?.argsProvided).toBe(false);
    expect(second?.argsHash).toBeUndefined();
  });

  it('hashRunArgs is canonical over key order, undefined for undefined, throws on cycles', () => {
    expect(hashRunArgs(undefined)).toBeUndefined();
    expect(hashRunArgs({ a: 1, b: 'x' })).toBe(hashRunArgs({ b: 'x', a: 1 }));
    expect(hashRunArgs({ a: 1 })).not.toBe(hashRunArgs({ a: 2 }));
    expect(hashRunArgs(null)).toBe(hashRunArgs(null));
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => hashRunArgs(cyclic)).toThrow();
  });

  it('unserializable args record the marker without a hash', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-argsbind-'));
    const store = new JsonlFileStore({ dir });
    const { engine } = makeEngine(store);
    const cyclic: Record<string, unknown> = { value: 'CHECK' };
    cyclic.self = cyclic;
    await engine.run(argsWf, cyclic, { runId: 'A3' }).result;
    const meta = (await store.listRuns()).find((m) => m.runId === 'A3');
    expect(meta?.argsProvided).toBe(true);
    expect(meta?.argsHash).toBeUndefined();
  });

  it('a resume with different args preserves the genesis binding verbatim', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-argsbind-'));
    const store = new JsonlFileStore({ dir });
    const first = makeEngine(store);
    await first.engine.run(argsWf, { value: 'CHECK' }, { runId: 'A4' }).result;
    const genesisHash = hashRunArgs({ value: 'CHECK' });
    const second = makeEngine(store, 'fresh call');
    const outcome = await second.engine.resume('A4', argsWf, { args: { value: 'OTHER' } }).result;
    expect(outcome.status).toBe('ok');
    // The changed args made the first call a genuine live rerun.
    expect(second.adapter.calls.length).toBeGreaterThan(0);
    const meta = (await store.listRuns()).find((m) => m.runId === 'A4');
    expect(meta?.argsProvided).toBe(true);
    expect(meta?.argsHash).toBe(genesisHash);
  });

  it('a legacy meta never gains the marker retroactively', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-argsbind-'));
    const store = new JsonlFileStore({ dir });
    const first = makeEngine(store);
    await first.engine.run(argsWf, { value: 'CHECK' }, { runId: 'A5' }).result;
    // Simulate a run written before the fields existed.
    const recorded = (await store.listRuns()).find((m) => m.runId === 'A5');
    if (recorded === undefined) {
      throw new Error('meta record missing');
    }
    const { argsProvided: _drop1, argsHash: _drop2, ...legacy } = recorded;
    await store.putMeta(legacy);
    const second = makeEngine(store);
    await second.engine.resume('A5', argsWf, { args: { value: 'CHECK' } }).result;
    const after = (await store.listRuns()).find((m) => m.runId === 'A5');
    expect(after?.argsProvided).toBeUndefined();
    expect(after?.argsHash).toBeUndefined();
  });

  it('dryRun performs zero store mutations and zero adapter calls', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-dryrun-'));
    const store = new JsonlFileStore({ dir });
    const first = makeEngine(store);
    const started = await first.engine.run(argsGateWf, { value: 'X' }, { runId: 'D1' }).result;
    expect(started.status).toBe('suspended');
    const entriesBefore = JSON.stringify(await store.load('D1'));
    const metaBefore = JSON.stringify((await store.listRuns()).find((m) => m.runId === 'D1'));
    const second = makeEngine(store, 'MUST NOT RUN');
    const handle = second.engine.resume('D1', argsGateWf, { args: { value: 'X' }, dryRun: true });
    const outcome = await handle.result;
    const preview = await handle.preview;
    expect(outcome.status).toBe('suspended');
    expect(preview.hits).toBeGreaterThan(0);
    expect(preview.misses).toBe(0);
    expect(second.adapter.calls).toHaveLength(0);
    expect(JSON.stringify(await store.load('D1'))).toBe(entriesBefore);
    expect(JSON.stringify((await store.listRuns()).find((m) => m.runId === 'D1'))).toBe(metaBefore);
  });

  it('dryRun of a run needing live work settles journal_miss with zero appends', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-dryrun-'));
    const store = new JsonlFileStore({ dir });
    const first = makeEngine(store);
    await first.engine.run(argsWf, { value: 'CHECK' }, { runId: 'D2' }).result;
    const entriesBefore = JSON.stringify(await store.load('D2'));
    const metaBefore = JSON.stringify((await store.listRuns()).find((m) => m.runId === 'D2'));
    const second = makeEngine(store, 'MUST NOT RUN');
    const handle = second.engine.resume('D2', argsWf, { args: { value: 'OTHER' }, dryRun: true });
    const outcome = await handle.result;
    const preview = await handle.preview;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('journal_miss');
    expect(preview.misses).toBe(1);
    expect(second.adapter.calls).toHaveLength(0);
    expect(JSON.stringify(await store.load('D2'))).toBe(entriesBefore);
    expect(JSON.stringify((await store.listRuns()).find((m) => m.runId === 'D2'))).toBe(metaBefore);
  });
});
