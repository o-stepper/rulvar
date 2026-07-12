/**
 * Multi-process seam soak (M8-T03): two
 * workers over one SqliteStore file with kill/failover across the three
 * boundaries: suspension, plan revision, and forced finish. Every round
 * asserts zero split-brain (a stale writer's appends are rejected and
 * never visible) and zero double pay (each two-phase agent pair is paid
 * exactly once). Fully offline and deterministic: scripted adapters,
 * one shared controllable clock for lease expiry, manual sweeps.
 *
 * Queue-mode limitation, documented per OQ-17: there is no
 * distributed cross-process rate limiter (EXC-14); hosts divide
 * provider quota per worker or front an external gateway. The soak
 * needs no limiter: its workers never run concurrently on one run,
 * which is exactly what the fencing epoch enforces.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  makeOrchestratorWorkflow,
  normalizeEntry,
  ORCHESTRATE_WORKFLOW_NAME,
  Replayer,
  type ChatRequest,
  type Engine,
  type JournalEntry,
  type ProviderAdapter,
  type Workflow,
} from '@rulvar/core';
import {
  agentTypeOfRequest,
  cassetteAdapter,
  EMPTY_PLAN_HASH,
  orchestratePlanned,
  planRunner,
  type CassetteTurn,
} from '@rulvar/plan';
import { InMemoryStore } from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { FAKE_MODEL_REF, FakeAdapter } from '@rulvar/testing';

import { createWorker } from './worker.js';

const wallClock: () => number = Date.now.bind(globalThis);

/** One shared, controllable clock: lease expiry is a fact in the file. */
function makeClock(): { now: () => number; advance: (ms: number) => void } {
  let nowMs = 1_000_000;
  return {
    now: () => nowMs,
    advance: (ms) => {
      nowMs += ms;
    },
  };
}

function soakDb(): string {
  return join(mkdtempSync(join(tmpdir(), 'rulvar-soak-')), 'journal.db');
}

/** Counts paid two-phase agent pairs: terminal entries of kind agent. */
function paidAgentTerminals(entries: readonly JournalEntry[]): number {
  return entries.filter(
    (entry) => entry.kind === 'agent' && entry.status !== 'running' && entry.status !== 'suspended',
  ).length;
}

describe('M8-T03 multi-process seam soak (two workers, one SqliteStore)', () => {
  it('suspension boundary: worker A dies suspended, an offline resolution lands, worker B completes', async () => {
    const path = soakDb();
    const gated = defineWorkflow({ name: 'gated' }, async (ctx, args: { item: number }) => {
      const analysis = await ctx.agent(`analyze ${String(args.item)}`);
      const approval = await ctx.awaitExternal<{ approved: boolean }>('gate', {
        prompt: 'go?',
      });
      const post = await ctx.agent(`post ${String(approval.approved)}`);
      return { analysis, post, approved: approval.approved };
    }) as unknown as Workflow<never, unknown>;
    const engineFor = (store: SqliteStore): Engine =>
      createEngine({
        adapters: [new FakeAdapter({ agents: { '*': 'soak analysis' } })],
        stores: { journal: store },
        defaults: {
          routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
          workflows: { gated },
        },
      });

    // The host starts the run; it suspends into the shared file.
    const hostStore = new SqliteStore({ path, now: wallClock });
    const host = engineFor(hostStore);
    const first = host.run(gated as unknown as Workflow<unknown, unknown>, { item: 1 });
    expect((await first.result).status).toBe('suspended');

    // Worker A picks it up, re-settles it suspended, and dies (stop).
    const storeA = new SqliteStore({ path, now: wallClock });
    const workerA = createWorker(engineFor(storeA), {
      store: storeA,
      argsFor: () => ({ item: 1 }),
    });
    expect(await workerA.sweep()).toBe(1);
    for (let i = 0; i < 500 && workerA.active().length > 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await workerA.stop();

    // The resolution lands offline, under a brief lease.
    const lease = await hostStore.acquire(first.runId, 'resolver');
    const entries = (await hostStore.load(first.runId)).map((raw) => normalizeEntry(raw));
    const target = entries.find(
      (entry) => entry.kind === 'external' && entry.status === 'suspended',
    ) as JournalEntry;
    const replayer = new Replayer({
      runId: first.runId,
      store: hostStore,
      now: wallClock,
      priorEntries: entries,
      lease,
    });
    const applied = await replayer.resolveSuspended(target.seq, {
      by: 'external',
      value: { approved: true },
    });
    expect(applied.applied).toBe(true);
    await hostStore.release(lease);

    // Worker B fails over and completes the run.
    const storeB = new SqliteStore({ path, now: wallClock });
    const workerB = createWorker(engineFor(storeB), {
      store: storeB,
      argsFor: () => ({ item: 1 }),
    });
    expect(await workerB.sweep()).toBe(1);
    for (let i = 0; i < 500; i += 1) {
      const metas = await storeB.listRuns();
      if (metas.find((m) => m.runId === first.runId)?.status === 'ok') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await workerB.stop();

    const finalEntries = (await hostStore.load(first.runId)).map((raw) => normalizeEntry(raw));
    // Zero double pay: two agents, each paid exactly once.
    expect(paidAgentTerminals(finalEntries)).toBe(2);
    const metas = await hostStore.listRuns();
    expect(metas.find((m) => m.runId === first.runId)?.status).toBe('ok');
  });

  it('plan-revision boundary: the lease is lost mid-flight, worker B reruns the dangling node, the stale writer stays invisible', async () => {
    const path = soakDb();
    const clock = makeClock();
    // A fresh phase counter per engine: revise, wait for quiescence,
    // then finish; the orchestrator genuinely WAITS on its node, so the
    // lease loss lands mid-flight (the M7 capScript pattern).
    const planScript = (
      worker: (req: ChatRequest) => CassetteTurn,
    ): ((req: ChatRequest) => CassetteTurn) => {
      let phase = 0;
      return (req: ChatRequest): CassetteTurn => {
        if (agentTypeOfRequest(req) === 'worker') {
          return worker(req);
        }
        phase += 1;
        if (phase === 1) {
          return {
            toolCall: {
              name: 'plan_revise',
              args: {
                base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
                ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
                rationale: 'one worker',
              },
            },
          };
        }
        if (phase === 2) {
          return {
            toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
          };
        }
        return { toolCall: { name: 'finish', args: { result: 'done after failover' } } };
      };
    };
    const engineFor = (adapter: ProviderAdapter, store: SqliteStore): Engine =>
      createEngine({
        adapters: [adapter],
        stores: { journal: store },
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model' },
          profiles: { worker: { description: 'w' } },
        },
      });

    // Scratch pass: the full journal; cut at the plan revision (the
    // boundary under test). A lost lease and a dead process leave the
    // same journal, so the clone reproduces the crash point exactly.
    const scratch = new InMemoryStore();
    const scratchEngine = createEngine({
      adapters: [cassetteAdapter(planScript(() => ({ text: 'worker done' })))],
      stores: { journal: scratch },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w' } },
      },
    });
    const seed = orchestratePlanned(scratchEngine, 'revision soak', {
      budget: { capUsd: 5, finalizeReserveUsd: 1 },
    });
    const seedOutcome = await seed.result;
    expect(seedOutcome.status).toBe('ok');
    const full = await scratch.load(seed.runId);
    const revisionSeq = full.find((entry) => entry.kind === 'plan.revision')?.seq;
    expect(revisionSeq).toBeDefined();

    const store = new SqliteStore({ path, ttlMs: 60_000, now: clock.now });
    for (const meta of await scratch.listRuns()) {
      if (meta.runId === seed.runId) {
        await store.putMeta({ ...meta, status: 'running' });
      }
    }
    for (const entry of full) {
      if (entry.seq <= (revisionSeq as number)) {
        await store.append(seed.runId, entry);
      }
    }

    const soakWorkflow = (): Workflow<unknown, unknown> =>
      makeOrchestratorWorkflow('revision soak', {
        budget: { capUsd: 5, finalizeReserveUsd: 1 },
        extension: planRunner({}),
      }) as unknown as Workflow<unknown, unknown>;

    // Worker A resumes under its lease and HANGS inside the node.
    const leaseA = await store.acquire(seed.runId, 'worker-a');
    const engineA = engineFor(
      cassetteAdapter(planScript(() => ({ hangUntilAborted: true }))),
      store,
    );
    const staleHandle = engineA.resume(seed.runId, soakWorkflow(), { lease: leaseA });
    // Let A replay the prefix and dispatch the node live (its running
    // entry lands PAST the prefix under the still-valid lease), then
    // lose the lease while the node hangs mid-flight.
    for (let i = 0; i < 500; i += 1) {
      const now = await store.load(seed.runId);
      if (
        now.some(
          (entry) =>
            entry.kind === 'agent' &&
            entry.status === 'running' &&
            entry.seq > (revisionSeq as number),
        )
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    clock.advance(61_000);
    const leaseB = await store.acquire(seed.runId, 'worker-b');
    expect(leaseB.epoch).toBeGreaterThan(leaseA.epoch);
    const lengthAtLoss = (await store.load(seed.runId)).length;

    // Worker B redispatches the dangling node (at-least-once) and
    // completes the run under its lease.
    const engineB = engineFor(cassetteAdapter(planScript(() => ({ text: 'worker done' }))), store);
    const resumed = engineB.resume(seed.runId, soakWorkflow(), { lease: leaseB });
    const outcome = await resumed.result;
    expect(outcome.status).toBe('ok');
    await store.release(leaseB);

    // Kill the stale writer; its death throes append NOTHING visible.
    // A stale run may never settle (every landing it attempts is
    // rejected by the epoch), so the kill is fire-and-forget: fencing,
    // not the stale process's cooperation, protects the journal.
    const lengthAfterB = (await store.load(seed.runId)).length;
    void staleHandle.cancel('soak kill');
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect((await store.load(seed.runId)).length).toBe(lengthAfterB);

    const entries = (await store.load(seed.runId)).map((raw) => normalizeEntry(raw));
    // Exactly one revision (the boundary was not replayed into a dupe).
    expect(entries.filter((entry) => entry.kind === 'plan.revision')).toHaveLength(1);
    // Zero double pay: the node has A's dangling running entry plus B's
    // rerun pair, but exactly ONE paid terminal; the orchestrator agent
    // terminals stay unique per dispatch too.
    const workerRunnings = entries.filter(
      (entry) => entry.kind === 'agent' && entry.status === 'running',
    );
    expect(workerRunnings.length).toBeGreaterThan(0);
    const paidWorkerTerminals = entries.filter(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'ok' &&
        entries.some((r) => r.seq === entry.ref && r.kind === 'agent'),
    );
    const byKey = new Map<string, number>();
    for (const terminal of paidWorkerTerminals) {
      const running = entries.find((r) => r.seq === terminal.ref) as JournalEntry;
      const key = `${running.scope} ${running.key}`;
      byKey.set(key, (byKey.get(key) ?? 0) + 1);
    }
    for (const [key, count] of byKey) {
      expect(count, `agent ${key} paid more than once`).toBe(1);
    }
    // B grew the journal past the loss point; the stale writer did not.
    expect(lengthAfterB).toBeGreaterThan(lengthAtLoss);
  });

  it('forced-finish boundary: a worker sweep rolls the cap decision forward through the registry', async () => {
    const path = soakDb();
    const clock = makeClock();
    const capScript = (): ((req: ChatRequest) => CassetteTurn) => {
      let phase = 0;
      return (req: ChatRequest): CassetteTurn => {
        if (agentTypeOfRequest(req) === 'worker') {
          return { text: 'worker done' };
        }
        const prompt = JSON.stringify(req.messages);
        if (prompt.includes('budget cap was reached')) {
          return { toolCall: { name: 'finish', args: { result: 'partial but honest' } } };
        }
        phase += 1;
        if (phase === 1) {
          return {
            toolCall: {
              name: 'plan_revise',
              args: {
                base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
                ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
                rationale: 'one worker',
              },
            },
          };
        }
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      };
    };
    const budget = { capUsd: 0.4, finalizeReserveUsd: 0.01 };

    // Scratch pass; cut strictly at the cap decision (the boundary).
    const scratch = new InMemoryStore();
    const scratchEngine = createEngine({
      adapters: [cassetteAdapter(capScript())],
      stores: { journal: scratch },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w' } },
      },
    });
    const seed = orchestratePlanned(scratchEngine, 'cap soak', { budget });
    await seed.result;
    const full = await scratch.load(seed.runId);
    const capSeq = full.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'orchestrator_budget_cap',
    )?.seq;
    expect(capSeq).toBeDefined();

    const store = new SqliteStore({ path, ttlMs: 60_000, now: clock.now });
    for (const meta of await scratch.listRuns()) {
      if (meta.runId === seed.runId) {
        await store.putMeta({ ...meta, status: 'running' });
      }
    }
    for (const entry of full) {
      if (entry.seq <= (capSeq as number)) {
        await store.append(seed.runId, entry);
      }
    }

    // The failover worker resolves the workflow through the ENGINE's
    // registry (never a worker parameter) and rolls the
    // forced finish forward from the cap decision.
    const registryWorkflow = makeOrchestratorWorkflow('cap soak', {
      budget,
      extension: planRunner({}),
    }) as unknown as Workflow<never, unknown>;
    const engineB = createEngine({
      adapters: [cassetteAdapter(capScript())],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w' } },
        workflows: { [ORCHESTRATE_WORKFLOW_NAME]: registryWorkflow },
      },
    });
    const worker = createWorker(engineB, { store, ttlMs: 60_000 });
    expect(await worker.sweep()).toBe(1);
    for (let i = 0; i < 500; i += 1) {
      const metas = await store.listRuns();
      const status = metas.find((m) => m.runId === seed.runId)?.status;
      if (status === 'ok' || status === 'exhausted') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await worker.stop();

    const entries = (await store.load(seed.runId)).map((raw) => normalizeEntry(raw));
    const caps = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'orchestrator_budget_cap',
    );
    // Exactly one cap decision across the failover; finalization paid
    // once (the only post-cap agent entries are the finalize pair).
    expect(caps).toHaveLength(1);
    const postCap = entries.filter(
      (entry) => entry.kind === 'agent' && entry.seq > (capSeq as number),
    );
    expect(postCap).toHaveLength(2);
    const metas = await store.listRuns();
    expect(metas.find((m) => m.runId === seed.runId)?.status).toBe('ok');
  });
});
