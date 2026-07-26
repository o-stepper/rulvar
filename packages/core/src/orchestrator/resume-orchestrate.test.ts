/**
 * Mode (c) resume after a budget-cancelled root (the v1.6.0 follow-up
 * review's live shape): checkpoint lineage restores the orchestrator
 * transcript, journaled spawn decisions recover across attempts,
 * settled children replay by content key without re-payment, the
 * dangling child alone reruns, and handles stay stable.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { FileTranscriptStore, JsonlFileStore } from '../stores/jsonl.js';
import { createEngine, type EngineDefaults } from '../engine/engine.js';
import type { Workflow } from '../engine/ctx.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow, ORCHESTRATE_WORKFLOW_NAME } from './orchestrate.js';
import { finishContract } from './output-contract.js';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
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
  return handles;
}

function spawnDecisions(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter(
    (entry) =>
      entry.kind === 'decision' &&
      (entry.value as { decisionType?: string } | undefined)?.decisionType === 'spawn-admission',
  );
}

describe('dynamic orchestrator resume after a budget-cancelled root', () => {
  it('restores the checkpoint lineage and never re-pays completed children', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-orch-resume-'));
    const store = new JsonlFileStore({ dir });
    // Durable transcripts, like production: the boundary checkpoint of
    // the cancelled root must survive into the resuming process.
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    let hang = true;
    const makeAdapter = () =>
      scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          const prompt = JSON.stringify(req.messages[0]?.parts);
          const part = prompt.includes('w1') ? 'w1' : prompt.includes('w2') ? 'w2' : 'w3';
          return {
            text: `did: ${part}`,
            usage: { inputTokens: 100_000, outputTokens: 0 },
            // w3 outlives the first attempt: it is the dangling child.
            ...(part === 'w3' && hang ? { hangMs: 5_000 } : {}),
          };
        }
        const transcript = JSON.stringify(req.messages);
        if (!transcript.includes('"handle"')) {
          // Turn 1: decompose into three workers; cheap.
          return {
            toolCalls: [
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'w1' } },
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'w2' } },
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'w3' } },
            ],
            usage: { inputTokens: 50_000, outputTokens: 0 },
          };
        }
        if (!transcript.includes('did:')) {
          // Turn 2: await. On the FIRST attempt this turn's own usage
          // crosses the 0.4 USD orchestrator cap mid-stream (the hang
          // gives layer 3 time to sever deterministically): the root
          // cancels while the wait is active, exactly the review's live
          // shape. The regenerated turn after resume is cheap.
          return hang
            ? {
                toolCall: { name: 'await_all', args: { handles: handlesIn(req) } },
                usage: { inputTokens: 500_000, outputTokens: 0 },
                hangMs: 120,
              }
            : {
                toolCall: { name: 'await_all', args: { handles: handlesIn(req) } },
                usage: { inputTokens: 10_000, outputTokens: 0 },
              };
        }
        return {
          toolCall: { name: 'finish', args: { result: 'assembled' } },
          usage: { inputTokens: 10_000, outputTokens: 0 },
        };
      });
    const defaults: EngineDefaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    };

    const adapterA = makeAdapter();
    const engineA = createEngine({
      adapters: [adapterA],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(makeOrchestratorWorkflow('assemble the parts', {}), undefined, {
      runId: 'ORCHR',
      budgetUsd: 2,
    }).result;
    expect(first.status).toBe('exhausted');
    // The crossing names the orchestrator cap, never the healthy root.
    expect(first.error?.message).toContain('orchestrator budget cap reached');
    const afterFirst = await store.load('ORCHR');
    expect(spawnDecisions(afterFirst)).toHaveLength(3);
    // The published journal shape: a cancelled root carrying its last
    // turn-boundary checkpoint, plus two completed child terminals.
    const cancelledRoot = afterFirst.find(
      (entry) => entry.kind === 'agent' && entry.scope === '' && entry.status === 'cancelled',
    );
    expect(cancelledRoot?.checkpointRef).toBeDefined();
    const childTerminals = afterFirst.filter(
      (entry) => entry.kind === 'agent' && entry.scope !== '' && entry.status === 'ok',
    );
    expect(childTerminals).toHaveLength(2);

    hang = false;
    const adapterB = makeAdapter();
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume(
      'ORCHR',
      makeOrchestratorWorkflow('assemble the parts', {}),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('assembled');

    // Completed children replayed: only the dangling w3 ran live.
    const workerCalls = adapterB.calls.filter((req) => agentTypeOf(req) === 'worker');
    expect(workerCalls).toHaveLength(1);
    expect(JSON.stringify(workerCalls[0]?.messages)).toContain('w3');
    // The transcript continued from the checkpoint: no re-decomposition
    // turn, exactly the regenerated await turn and the finish turn.
    const orchCalls = adapterB.calls.filter((req) => agentTypeOf(req) === '');
    expect(orchCalls).toHaveLength(2);
    // No spawn decision was regenerated across the resume.
    const afterResume = await store.load('ORCHR');
    expect(spawnDecisions(afterResume)).toHaveLength(3);
    // Stable handles: the digest the finish turn saw carries all three
    // children, the replayed pair and the rerun dangling one.
    const digest = JSON.stringify(orchCalls.at(-1)?.messages);
    expect(digest).toContain('did: w1');
    expect(digest).toContain('did: w2');
    expect(digest).toContain('did: w3');
  });

  it('the documented resume forms both replay a finished dynamic run', async () => {
    // The executable form of the mode (c) resume table row: the
    // workflow value rebuilt from the ORIGINAL inputs, and the
    // defaults.workflows registration that makes bare resume work.
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-orch-forms-'));
    const store = new JsonlFileStore({ dir });
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    const makeAdapter = () =>
      scriptedAdapter((): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: 'done' } },
      }));
    const defaults: EngineDefaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    };
    const first = await createEngine({
      adapters: [makeAdapter()],
      stores: { journal: store, transcripts },
      defaults,
    }).run(makeOrchestratorWorkflow('finish fast', {}), undefined, { runId: 'FORMS' }).result;
    expect(first.status).toBe('ok');

    // Form 1: the workflow value.
    const adapterB = makeAdapter();
    const viaValue = await createEngine({
      adapters: [adapterB],
      stores: { journal: store, transcripts },
      defaults,
    }).resume('FORMS', makeOrchestratorWorkflow('finish fast', {})).result;
    expect(viaValue.status).toBe('ok');
    expect(viaValue.value).toBe('done');
    expect(adapterB.calls).toHaveLength(0);

    // Form 2: registration under defaults.workflows, then bare resume.
    const adapterC = makeAdapter();
    const viaRegistry = await createEngine({
      adapters: [adapterC],
      stores: { journal: store, transcripts },
      defaults: {
        ...defaults,
        workflows: {
          // The registry erases the args type; the orchestrator
          // workflow takes none.
          [ORCHESTRATE_WORKFLOW_NAME]: makeOrchestratorWorkflow(
            'finish fast',
            {},
          ) as unknown as Workflow<never, unknown>,
        },
      },
    }).resume('FORMS').result;
    expect(viaRegistry.status).toBe('ok');
    expect(viaRegistry.value).toBe('done');
    expect(adapterC.calls).toHaveLength(0);
  });

  it('a fully successful replay reports no orphaned refs (pairing rules)', async () => {
    // The v1.7.0 follow-up review's shape: the plain dynamic replay
    // previously reported the terminal spawn-admission decision entries
    // as orphaned. A successful replay must read clean.
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-orch-clean-'));
    const store = new JsonlFileStore({ dir });
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    const makeAdapter = () =>
      scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'part done' };
        }
        const transcript = JSON.stringify(req.messages);
        if (!transcript.includes('"handle"')) {
          return {
            toolCalls: [
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'p1' } },
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'p2' } },
            ],
          };
        }
        if (!transcript.includes('part done')) {
          return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
        }
        return { toolCall: { name: 'finish', args: { result: 'assembled' } } };
      });
    const defaults: EngineDefaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    };
    const first = await createEngine({
      adapters: [makeAdapter()],
      stores: { journal: store, transcripts },
      defaults,
    }).run(makeOrchestratorWorkflow('assemble', {}), undefined, {
      runId: 'CLEAN',
      budgetUsd: 5,
    }).result;
    expect(first.status).toBe('ok');
    expect(spawnDecisions(await store.load('CLEAN')).length).toBeGreaterThan(0);

    const adapterB = makeAdapter();
    const handle = createEngine({
      adapters: [adapterB],
      stores: { journal: store, transcripts },
      defaults,
    }).resume('CLEAN', makeOrchestratorWorkflow('assemble', {}));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(adapterB.calls).toHaveLength(0);
    const preview = await handle.preview;
    expect(preview.hits).toBeGreaterThan(0);
    expect(preview).toMatchObject({ misses: 0, reruns: 0, orphaned: [] });
  });
});

describe('contract generation scoping across resume (the v1.74 experiment review, cycle 73)', () => {
  /**
   * A journal store that plays dead right after the final finish
   * rejection becomes durable: every later append and meta write fails,
   * so the run terminal is never written. This is the documented crash
   * window between the journaled 'rejected' decision and the run
   * terminal, reconstructed in-process.
   */
  class CrashingStore extends JsonlFileStore {
    poisoned = false;
    override async append(runId: string, entry: JournalEntry): Promise<void> {
      if (this.poisoned) {
        throw new Error('rv73: the process is dead');
      }
      await super.append(runId, entry);
      const value = entry.value as { decisionType?: string; verdict?: string } | undefined;
      if (
        value?.decisionType === 'orchestrator_finish_validation' &&
        value.verdict === 'rejected'
      ) {
        this.poisoned = true;
      }
    }
    override async putMeta(meta: Parameters<JsonlFileStore['putMeta']>[0]): Promise<void> {
      if (this.poisoned) {
        throw new Error('rv73: the process is dead');
      }
      await super.putMeta(meta);
    }
  }

  const contractC1 = () => finishContract({ sections: ['## Report'], words: { min: 50 } });
  const contractC2 = () => finishContract({ sections: ['## Report'] });
  const CONFORMING = '## Report\nfixed and conforming';

  const defaults: EngineDefaults = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model' },
  };

  const wfOf = (
    contract: ReturnType<typeof finishContract>,
    maxRepairs: number,
  ): Workflow<undefined, unknown> =>
    makeOrchestratorWorkflow('produce the report', {
      limits: { maxTurns: 4 },
      finishValidation: { validators: contract.validators, contract, maxRepairs },
    });

  const doomedAdapter = (drafts: string[], salt?: string) => {
    let turn = 0;
    // The resuming instance salts its tool-call ids: a fresh adapter
    // restarts its ordinals at zero, and unsalted ids would collide
    // with the journaled finish callIds of the pre-crash instance
    // (real providers mint globally unique ids).
    return scriptedAdapter(
      (): ScriptedTurn => {
        const draft = drafts[Math.min(turn, drafts.length - 1)];
        turn += 1;
        return { toolCall: { name: 'finish', args: { result: draft } } };
      },
      salt === undefined ? undefined : { toolCallSalt: salt },
    );
  };

  /** Runs the doomed pass over a fresh dir and returns the crash-window stores. */
  const crashWindow = async (options?: { maxRepairs?: number; drafts?: string[] }) => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-rv73-'));
    const crashing = new CrashingStore({ dir });
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    const engine = createEngine({
      adapters: [doomedAdapter(options?.drafts ?? ['nope'])],
      stores: { journal: crashing, transcripts },
      defaults,
    });
    await engine
      .run(wfOf(contractC1(), options?.maxRepairs ?? 0), undefined, { runId: 'RV73' })
      .result.catch(() => undefined);
    // The window is genuine: the rejection is durable, the terminal is not.
    const store = new JsonlFileStore({ dir });
    const entries = await store.load('RV73');
    expect(
      entries.some(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
      ),
    ).toBe(false);
    const decisions = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'orchestrator_finish_validation',
    );
    expect((decisions.at(-1)?.value as { verdict?: string } | undefined)?.verdict).toBe('rejected');
    return { dir, store, transcripts, entries };
  };

  const validationDecisionsOf = (entries: readonly JournalEntry[]): Record<string, unknown>[] =>
    entries
      .filter(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation',
      )
      .map((entry) => entry.value as Record<string, unknown>);

  const bundlesOf = (entries: readonly JournalEntry[]): Record<string, unknown>[] =>
    entries
      .filter(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation_bundle',
      )
      .map((entry) => entry.value as Record<string, unknown>);

  it('a resume under a FIXED contract survives the stale final rejection and repairs live', async () => {
    const { store, transcripts } = await crashWindow();
    const c2 = contractC2();
    const adapter = doomedAdapter([CONFORMING], 'resume');
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engine.resume('RV73', wfOf(c2, 0)).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(CONFORMING);
    // The stale exchange replayed for free: exactly ONE live turn, the
    // repair the fixed generation validated.
    expect(adapter.calls).toHaveLength(1);
    const entries = await store.load('RV73');
    const bundles = bundlesOf(entries);
    expect(bundles).toHaveLength(2);
    expect(bundles[1]?.supersedes).toBe(contractC1().hash);
    const decisions = validationDecisionsOf(entries);
    // The stale generation keeps its rejection; the fixed generation
    // validated live, first try, with the full repair budget back.
    expect(decisions.at(-1)).toMatchObject({
      verdict: 'accepted',
      repairsUsed: 0,
      contractHash: c2.hash,
    });
  });

  it('a resume under the SAME contract still rolls the rejection forward before any model call', async () => {
    const { store, transcripts } = await crashWindow();
    const adapter = doomedAdapter([CONFORMING], 'resume');
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engine.resume('RV73', wfOf(contractC1(), 0)).result;
    expect(resumed.status).toBe('error');
    expect(resumed.error?.message).toContain('failed host validation');
    expect(adapter.calls).toHaveLength(0);
  });

  it('legacy unhashed decisions bind to the current contract only while no supersession exists', async () => {
    const { transcripts, entries } = await crashWindow();
    // A journal recorded before decisions carried contractHash: strip the
    // field, exactly what a 1.76 store holds.
    const legacyEntries = entries.map((entry) => {
      const value = entry.value as { decisionType?: string } | undefined;
      if (value?.decisionType !== 'orchestrator_finish_validation') {
        return entry;
      }
      const { contractHash: _dropped, ...rest } = entry.value as Record<string, unknown>;
      return { ...entry, value: rest } as JournalEntry;
    });
    const copyInto = async (): Promise<JsonlFileStore> => {
      const copyDir = mkdtempSync(join(tmpdir(), 'rulvar-rv73-legacy-'));
      const copy = new JsonlFileStore({ dir: copyDir });
      for (const entry of legacyEntries) {
        await copy.append('RV73', entry);
      }
      return copy;
    };

    // (a) Same contract, single descriptor: the unhashed rejection is
    // the current generation and still dooms the resume.
    const sameStore = await copyInto();
    const sameAdapter = doomedAdapter([CONFORMING], 'resume');
    const sameEngine = createEngine({
      adapters: [sameAdapter],
      stores: { journal: sameStore, transcripts },
      defaults,
    });
    const same = await sameEngine.resume('RV73', wfOf(contractC1(), 0)).result;
    expect(same.status).toBe('error');
    expect(sameAdapter.calls).toHaveLength(0);

    // (b) Fixed contract: the superseding descriptor marks every
    // unhashed decision stale, and the run repairs live.
    const fixedStore = await copyInto();
    const fixedEngine = createEngine({
      adapters: [doomedAdapter([CONFORMING], 'fixed')],
      stores: { journal: fixedStore, transcripts },
      defaults,
    });
    const fixed = await fixedEngine.resume('RV73', wfOf(contractC2(), 0)).result;
    expect(fixed.status).toBe('ok');
    expect(fixed.value).toBe(CONFORMING);
  });

  it('repairsUsed counts only the current generation, so a fixed contract restores the budget', async () => {
    const { store, transcripts } = await crashWindow({
      maxRepairs: 1,
      drafts: ['nope', 'still nope'],
    });
    const c2 = contractC2();
    const engine = createEngine({
      adapters: [doomedAdapter(['bad for the fixed contract too', CONFORMING], 'resume')],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engine.resume('RV73', wfOf(c2, 1)).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(CONFORMING);
    const decisions = validationDecisionsOf(await store.load('RV73'));
    // The doomed generation spent its whole budget (repair then
    // rejected); the fixed generation starts at zero again.
    const fresh = decisions.filter((decision) => decision.contractHash === c2.hash);
    expect(fresh.map((decision) => decision.verdict)).toEqual(['repair', 'accepted']);
    expect(fresh[0]?.repairsUsed).toBe(0);
  });
});
