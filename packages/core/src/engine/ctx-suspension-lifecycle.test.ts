/**
 * The suspension ownership rule, end to end (v1.10 deep E2E review):
 * once handle.result settled, the segment is closed; resolveExternal on
 * the settled handle appends durably WITHOUT waking the closed body, and
 * exactly one engine.resume owns the continuation. These tests execute
 * the exact public sequences the guides document
 * (docs/guide/tools.md, testing.md, durability.md), so the docs cannot
 * rot silently.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { ConfigError, InvalidResolutionError } from '../l0/errors.js';
import { normalizeEntry, type JournalEntry } from '../l0/entries.js';
import type { JournalStore } from '../l0/spi/store.js';
import { Replayer } from '../journal/replayer.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { tool } from '../tools/tool.js';
import { defineWorkflow } from './ctx.js';
import { createEngine, type Engine } from './engine.js';
import { scriptedAdapter } from './test-harness.js';

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function deployTool(executions: string[]) {
  return tool({
    name: 'deploy',
    description: 'deploys the site',
    parameters: { type: 'object' },
    needsApproval: true,
    execute: (input) => {
      executions.push(JSON.stringify(input));
      return Promise.resolve('deployed');
    },
  });
}

function approvalScript() {
  return scriptedAdapter((_req, call) =>
    call === 0
      ? { toolCall: { name: 'deploy', args: { site: 'prod' } } }
      : { text: 'release done' },
  );
}

function releaseWorkflow(executions: string[]) {
  return defineWorkflow({ name: 'release' }, async (ctx) =>
    ctx.agent('ship it', { tools: [deployTool(executions)] }),
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadNormalized(store: JournalStore, runId: string): Promise<JournalEntry[]> {
  return (await store.load(runId)).map((entry) => normalizeEntry(entry));
}

const STORES: Array<{ label: string; make: () => JournalStore }> = [
  { label: 'InMemoryStore', make: () => new InMemoryStore({ quiet: true }) },
  {
    label: 'JsonlFileStore',
    make: () => {
      const dir = mkdtempSync(join(tmpdir(), 'rulvar-suspension-'));
      tempDirs.push(dir);
      return new JsonlFileStore({ dir });
    },
  },
];

describe('resolve-then-resume after settle (the documented sequence)', () => {
  it.each(STORES)(
    'allow on $label: the tool runs once, one continuation owns the run',
    async ({ make }) => {
      const executions: string[] = [];
      const journal = make();
      const adapter = approvalScript();
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal, transcripts: new InMemoryTranscriptStore() },
        defaults: { routing: { loop: 'fake:model' } },
      });
      const wf = releaseWorkflow(executions);

      const first = engine.run(wf, undefined, { runId: 'seq-allow' });
      const suspended = await first.result;
      expect(suspended.status).toBe('suspended');
      expect(suspended.pending).toHaveLength(1);
      const key = suspended.pending[0]?.key ?? '';
      expect(key).toMatch(/^approval:/);

      // Resolving the SETTLED handle appends the durable resolution and
      // wakes nothing: the closed body never executes the tool, never
      // takes another turn, never appends a terminal.
      const resolution = await first.resolveExternal(key, { decision: 'allow' });
      expect(resolution.applied).toBe(true);
      await wait(120);
      expect(executions).toEqual([]);
      expect(adapter.calls).toHaveLength(1);
      const afterResolve = await loadNormalized(journal, 'seq-allow');
      expect(afterResolve.filter((e) => e.kind === 'resolution')).toHaveLength(1);
      expect(afterResolve.filter((e) => e.kind === 'agent' && e.status !== 'running')).toHaveLength(
        0,
      );

      // Exactly one resume owns the continuation: the tool executes
      // once, only the post-approval turn is paid, one terminal lands.
      const resumed = engine.resume('seq-allow', wf);
      const outcome = await resumed.result;
      await wait(120);
      expect(outcome.status).toBe('ok');
      expect(outcome.value).toBe('release done');
      expect(executions).toEqual(['{"site":"prod"}']);
      expect(adapter.calls).toHaveLength(2);

      const entries = await loadNormalized(journal, 'seq-allow');
      const seqs = entries.map((e) => e.seq);
      expect(new Set(seqs).size).toBe(seqs.length);
      expect(seqs.every((seq, i) => i === 0 || seq > (seqs[i - 1] ?? Number.NaN))).toBe(true);
      expect(entries.filter((e) => e.kind === 'approval')).toHaveLength(1);
      expect(entries.filter((e) => e.kind === 'resolution')).toHaveLength(1);
      const terminals = entries.filter(
        (e) => e.kind === 'agent' && e.status !== 'running' && e.status !== 'suspended',
      );
      expect(terminals).toHaveLength(1);

      // Usage and cost are accounted once: a fresh fold over the loaded
      // journal agrees with the settled outcome byte for byte.
      const fold = new Replayer({ runId: 'seq-allow', store: journal, priorEntries: entries });
      expect(fold.ledger().usage).toEqual(outcome.usage);

      // Replay after completion performs zero provider calls.
      const replay = engine.resume('seq-allow', wf);
      const replayed = await replay.result;
      const preview = await replay.preview;
      expect(replayed.status).toBe('ok');
      expect(replayed.value).toBe('release done');
      expect(adapter.calls).toHaveLength(2);
      expect(preview.misses).toBe(0);
      expect(preview.orphaned).toEqual([]);
      expect(executions).toHaveLength(1);
    },
  );

  it('deny: the tool never runs, only the post-denial turn is paid', async () => {
    const executions: string[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'deploy', args: { site: 'prod' } } }
        : { text: 'not shipped' },
    );
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = releaseWorkflow(executions);
    const first = engine.run(wf, undefined, { runId: 'seq-deny' });
    const suspended = await first.result;
    const key = suspended.pending[0]?.key ?? '';
    await first.resolveExternal(key, { decision: 'deny', reason: 'not during the freeze' });
    const outcome = await engine.resume('seq-deny', wf).result;
    await wait(120);
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('not shipped');
    expect(executions).toEqual([]);
    expect(adapter.calls).toHaveLength(2);
    const entries = await loadNormalized(engine.stores.journal, 'seq-deny');
    const seqs = entries.map((e) => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});

describe('repeated and invalid resolutions', () => {
  async function settleSuspended(executions: string[]): Promise<{
    engine: Engine;
    key: string;
    runId: string;
    adapterCalls: () => number;
    handle: ReturnType<Engine['run']>;
  }> {
    const adapter = approvalScript();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = releaseWorkflow(executions);
    const handle = engine.run(wf, undefined, { runId: 'dup-run' });
    const suspended = await handle.result;
    return {
      engine,
      key: suspended.pending[0]?.key ?? '',
      runId: handle.runId,
      adapterCalls: () => adapter.calls.length,
      handle,
    };
  }

  it('a sequential duplicate is the documented journaled no-op, never a throw', async () => {
    const executions: string[] = [];
    const { engine, key, runId, handle } = await settleSuspended(executions);
    const firstAttempt = await handle.resolveExternal(key, { decision: 'allow' });
    expect(firstAttempt.applied).toBe(true);
    const second = await handle.resolveExternal(key, { decision: 'allow' });
    expect(second.applied).toBe(false);
    expect(second).toMatchObject({ reason: 'already_resolved' });
    // Both attempts are journaled; the fold keeps the first winner.
    const entries = await loadNormalized(engine.stores.journal, runId);
    expect(entries.filter((e) => e.kind === 'resolution')).toHaveLength(2);
    expect(executions).toEqual([]);
  });

  it('two concurrent valid resolutions: exactly one applies', async () => {
    const executions: string[] = [];
    const { key, handle } = await settleSuspended(executions);
    const [a, b] = await Promise.all([
      handle.resolveExternal(key, { decision: 'allow' }),
      handle.resolveExternal(key, { decision: 'deny' }),
    ]);
    expect([a.applied, b.applied].filter(Boolean)).toHaveLength(1);
    const loser = a.applied ? b : a;
    expect(loser).toMatchObject({ applied: false, reason: 'already_resolved' });
  });

  it('an invalid payload throws and appends nothing; a later valid payload applies', async () => {
    const executions: string[] = [];
    const { engine, key, runId, handle } = await settleSuspended(executions);
    await expect(handle.resolveExternal(key, { decision: 'maybe' })).rejects.toThrow(
      InvalidResolutionError,
    );
    const untouched = await loadNormalized(engine.stores.journal, runId);
    expect(untouched.filter((e) => e.kind === 'resolution')).toHaveLength(0);
    const applied = await handle.resolveExternal(key, { decision: 'allow' });
    expect(applied.applied).toBe(true);
  });

  it('an unknown key still throws InvalidResolutionError', async () => {
    const executions: string[] = [];
    const { handle } = await settleSuspended(executions);
    await expect(handle.resolveExternal('no-such-key', { decision: 'allow' })).rejects.toThrow(
      InvalidResolutionError,
    );
  });

  it('a raced-away waiter on an ok-settled run resolves durably and wakes nothing', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'racer' }, async (ctx) => {
      // The body abandons its own suspension: the run settles ok with an
      // orphaned open waiter.
      const gate = ctx.awaitExternal('side-gate', { prompt: 'never awaited to completion' });
      return Promise.race([gate, Promise.resolve('raced past')]);
    });
    const handle = engine.run(wf, undefined, { runId: 'race-run' });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('raced past');
    const resolution = await handle.resolveExternal('side-gate', { fine: true });
    expect(resolution.applied).toBe(true);
    await wait(80);
    expect(adapter.calls).toHaveLength(0);
    const entries = await loadNormalized(engine.stores.journal, 'race-run');
    expect(entries.filter((e) => e.kind === 'resolution')).toHaveLength(1);
    const seqs = entries.map((e) => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});

describe('execution-segment ownership', () => {
  it('a second concurrent segment of the same run is a typed ConfigError', async () => {
    const executions: string[] = [];
    const adapter = approvalScript();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = releaseWorkflow(executions);
    const first = engine.run(wf, undefined, { runId: 'owned-run' });
    // A duplicate engine.run of a LIVE run fails synchronously and typed.
    expect(() => engine.run(wf, undefined, { runId: 'owned-run' })).toThrow(ConfigError);
    const suspended = await first.result;
    await first.resolveExternal(suspended.pending[0]?.key ?? '', { decision: 'allow' });

    // Two concurrent resumes: exactly one owns the continuation, the
    // other rejects typed, and the journal shows one clean segment.
    const resumeA = engine.resume('owned-run', wf);
    const resumeB = engine.resume('owned-run', wf);
    const settled = await Promise.allSettled([resumeA.result, resumeB.result]);
    const fulfilled = settled.filter((item) => item.status === 'fulfilled');
    const rejected = settled.filter(
      (item): item is PromiseRejectedResult => item.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(ConfigError);
    expect(String(rejected[0]?.reason)).toContain('live execution segment');
    await wait(120);
    expect(executions).toHaveLength(1);
    expect(adapter.calls).toHaveLength(2);
    const entries = await loadNormalized(engine.stores.journal, 'owned-run');
    const seqs = entries.map((e) => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(
      entries.filter(
        (e) => e.kind === 'agent' && e.status !== 'running' && e.status !== 'suspended',
      ),
    ).toHaveLength(1);
  });
});

// NOTE deliberately absent: an orchestrator run never reaches the
// settled-suspended boundary. The wait_for_events wake holds the
// orchestrator agent's activity by design (the wake resolves
// engine-side), so a run with a live orchestrator stays 'running' while
// a child parks on an approval; the operator resolves it through the
// live approval:pending path covered by ctx-approval.test.ts.
