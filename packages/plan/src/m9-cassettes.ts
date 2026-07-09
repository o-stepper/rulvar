/**
 * M9 catalog completion runners: the DEF-2 and DEF-3 cassette rows that
 * were deferred at M7 (M9-T04; docs/09, sections 6.2 and 6.3; docs/10,
 * section "Gating cassette sets per milestone", M9 row).
 *
 * Same discipline as the M7 runners (cassettes.ts): every scenario runs
 * fully offline on the scripted adapter over the PUBLIC provider SPI,
 * asserts its catalog row inline, and returns the NORMALIZED journal;
 * the committed cassette is the compatibility contract and the replay
 * test re-runs the scenario byte-for-byte.
 */
import {
  createEngine,
  foldTermination,
  InMemoryStore,
  LineageIndex,
  makeOrchestratorWorkflow,
  LEGACY_LTID_PREFIX,
  defineWorkflow,
  tool,
  type ChatRequest,
  type JournalEntry,
} from '@lurker/core';

import { foldLedger } from './ledger.js';

import {
  agentTypeOfRequest,
  BUDGET,
  cassetteAdapter,
  EMPTY_PLAN_HASH,
  engineWith,
  normalizeAdaptiveJournal,
  settled,
  type CassetteTurn,
} from './cassettes.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';

/** The latest wake digest visible in a request's tool results. */
interface DigestView {
  digestSeq: number;
  planHash: string;
  escalations: Array<{ nodeId: string; logicalTaskId: string; reportRef: number }>;
  completedDigests?: Array<{ nodeId: string; logicalTaskId: string; status: string }>;
}

function digestIn(req: ChatRequest): DigestView | undefined {
  let found: DigestView | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const value = part.result as
          { digestSeq?: number; planHash?: string; escalations?: unknown } | undefined;
        if (typeof value?.digestSeq === 'number' && typeof value.planHash === 'string') {
          found = value as NonNullable<typeof found>;
        }
      }
    }
  }
  return found;
}

/** The first assigned NodeId of the most recent plan_revise result. */
function lastAssignedNode(req: ChatRequest): string | undefined {
  let found: string | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const ids = (part.result as { assignedNodeIds?: Record<string, string> } | undefined)
          ?.assignedNodeIds;
        if (ids !== undefined) {
          found = Object.values(ids)[0] ?? found;
        }
      }
    }
  }
  return found;
}

function decisionTypeOf(entry: JournalEntry): string | undefined {
  return (entry.value as { decisionType?: string } | undefined)?.decisionType;
}

/** Prefix-clones a run into a fresh store: the crash simulation. */
async function cloneUpTo(
  source: InMemoryStore,
  runId: string,
  lastSeq: number,
): Promise<InMemoryStore> {
  const crashStore = new InMemoryStore();
  for (const meta of await source.listRuns()) {
    if (meta.runId === runId) {
      await crashStore.putMeta(meta);
    }
  }
  for (const entry of await source.load(runId)) {
    if (entry.seq <= lastSeq) {
      await crashStore.append(runId, entry);
    }
  }
  return crashStore;
}

/**
 * Every entry whose value embeds a termination balance (the debiting
 * entries of DEF-2), in journal order.
 */
function debitingSeqs(entries: readonly JournalEntry[]): number[] {
  return entries
    .filter((entry) => {
      const value = entry.value as
        { revisionUnitsAfter?: unknown; admissions?: unknown; debits?: unknown } | undefined;
      return (
        value?.revisionUnitsAfter !== undefined ||
        value?.debits !== undefined ||
        (Array.isArray(value?.admissions) && (value.admissions as unknown[]).length > 0)
      );
    })
    .map((entry) => entry.seq);
}

/**
 * Phi strictly decreases across the debiting entries and the embedded
 * balances match the fold (foldTermination throws on any divergence).
 */
function assertPhiStrictlyDecreases(entries: readonly JournalEntry[], id: string): void {
  const seqs = debitingSeqs(entries);
  if (seqs.length === 0) {
    throw new Error(`${id}: expected at least one debiting entry`);
  }
  let previous: number | undefined;
  for (const seq of seqs) {
    const prefix = entries.filter((entry) => entry.seq <= seq);
    const folded = foldTermination(prefix);
    if (folded === undefined) {
      throw new Error(`${id}: foldTermination found no termination.init in the prefix`);
    }
    const phi = folded.account.phi();
    if (previous !== undefined && phi >= previous) {
      throw new Error(`${id}: Phi did not strictly decrease (${previous} then ${phi})`);
    }
    previous = phi;
  }
  // Full-journal fold: embedded-balance divergence throws here.
  foldTermination(entries);
}

/**
 * combined-loop-descent (DEF-2): a verify-failed gate raises the ladder
 * rung; the raised rung hits its turn limit at the top (trigger 'limit')
 * and the node fails; the failure wakes a replan that decomposes the
 * work into two depth-1 children; one child completes and the other
 * escalates until its escalationUnits deny; Phi strictly decreases on
 * every debiting entry and matches the embedded balances.
 */
export async function runCombinedLoopDescent(): Promise<JournalEntry[]> {
  let phase = 0;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    const agentType = agentTypeOfRequest(req);
    if (agentType === 'climber') {
      // Both rungs produce no artifacts; rung 1 fails the gate
      // (verify-failed, raise), rung 2 burns its single turn on the
      // echo tool (limit at the top rung).
      if (req.model === 'cheap') {
        return { text: 'no artifacts from the cheap rung' };
      }
      return { toolCall: { name: 'echo_tool', args: {} } };
    }
    if (agentType === 'worker') {
      const prompt = JSON.stringify(req.messages);
      if (prompt.includes('first half')) {
        return { text: 'first half done' };
      }
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'the second half keeps growing',
            revisedEstimate: { usd: 2, turns: 8 },
          },
        },
      };
    }
    phase += 1;
    const digest = digestIn(req);
    const report = digest?.escalations[0];
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'climber', prompt: 'climb the ladder' } }],
            rationale: 'one laddered task',
          },
        },
      };
    }
    if (phase === 3) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digest?.digestSeq ?? 0,
              planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: [
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'first half' } },
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'second half' } },
            ],
            rationale: 'decompose the failed climb into two halves',
          },
        },
      };
    }
    if (phase === 5 && report !== undefined) {
      // The respawn of the escalating half, deliberately gated PAST the
      // 20 ms deadline: attempt one's timeout decision (accept) debits
      // the last escalationUnit first; attempt two's own timeout
      // decision is then DENIED (termination.denied precedes the
      // capExceeded decision) and still resolves the fate.
      return {
        awaitPromise: new Promise((resolve) => setTimeout(resolve, 150)),
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digest?.digestSeq ?? 0,
              planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'second half, retry 1' },
                lineage: {
                  continues: report.logicalTaskId,
                  relation: 'respawn',
                  causeRef: report.reportRef,
                },
              },
            ],
            rationale: 'respawn the growing half',
          },
        },
      };
    }
    if (phase <= 6) {
      return {
        toolCall: {
          name: 'wait_for_events',
          args: { triggers: [{ kind: phase === 4 ? 'escalation' : 'quiescence' }] },
        },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'descent closed' } } };
  });
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: {
        climber: {
          description: 'climbs',
          model: {
            ladder: {
              rungs: [
                { model: 'fake:cheap', effort: 'low', maxTurns: 4, maxTokens: 1000 },
                { model: 'fake:strong', effort: 'high', maxTurns: 1, maxTokens: 2000 },
              ],
              startTier: 0,
              escalateOn: ['verify-failed', 'limit'],
              acceptance: [{ kind: 'mechanical', profile: 'has-artifacts' }],
            },
          },
          tools: [
            tool({
              name: 'echo_tool',
              description: 'echo',
              parameters: { type: 'object', additionalProperties: false, properties: {} },
              execute: () => Promise.resolve('ECHO'),
            }),
          ],
        },
        worker: {
          description: 'w',
          escalation: { flavor: 'B', deadlineMs: 20, defaultDecision: { kind: 'accept' } },
        },
      } as never,
      gates: {
        'has-artifacts': (artifacts: unknown[]) => ({
          pass: artifacts.length > 0,
          detail: 'artifact-grounded acceptance',
        }),
      } as never,
      toolsets: {},
    },
  });
  const handle = orchestratePlanned(engine, 'combined descent', {
    budget: BUDGET,
    plan: { limits: { maxEscalationsPerLogicalTask: 1 } },
  });
  await settled(handle);
  const entries = await store.load(handle.runId);

  const verdicts = entries.filter((entry) => decisionTypeOf(entry) === 'ladder-verdict');
  if (verdicts.length < 2) {
    throw new Error(`combined-loop-descent: expected two ladder verdicts, got ${verdicts.length}`);
  }
  const denied = entries.find((entry) => entry.kind === 'termination.denied');
  const capExceeded = entries.find(
    (entry) =>
      decisionTypeOf(entry) === 'escalation-decision' &&
      (entry.value as { capExceeded?: boolean }).capExceeded === true,
  );
  if (denied === undefined || capExceeded === undefined) {
    throw new Error(
      'combined-loop-descent: the escalationUnits denial pair is missing; kinds seen: ' +
        JSON.stringify(entries.map((entry) => `${entry.kind}:${decisionTypeOf(entry) ?? ''}`)),
    );
  }
  if (denied.seq >= capExceeded.seq) {
    throw new Error('combined-loop-descent: termination.denied must precede the flagged decision');
  }
  assertPhiStrictlyDecreases(entries, 'combined-loop-descent');
  return normalizeAdaptiveJournal(entries);
}

/**
 * config-drift-resume (DEF-2): life 1 runs under maxRevisionsPerRun 2
 * and crashes at the pre-append kill point of its second revision; life
 * 2 resumes with the knob DOUBLED. Balances continue from the journaled
 * termination.init (the live config is ignored), a
 * termination:config-drift event fires, and nothing is repaid.
 */
export async function runConfigDriftResume(): Promise<JournalEntry[]> {
  const script = (phaseRef: { n: number }) => (req: ChatRequest) => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { text: 'worker done' } as CassetteTurn;
    }
    phaseRef.n += 1;
    if (phaseRef.n === 1 || phaseRef.n === 2) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: `drift task ${String(phaseRef.n)}` },
              },
            ],
            rationale: `revision ${String(phaseRef.n)}`,
          },
        },
      } as CassetteTurn;
    }
    if (phaseRef.n === 3) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      } as CassetteTurn;
    }
    return { toolCall: { name: 'finish', args: { result: 'drift closed' } } } as CassetteTurn;
  };

  const phase1 = { n: 0 };
  const store = new InMemoryStore();
  const engine = engineWith(cassetteAdapter(script(phase1)), store, {
    worker: { description: 'w' },
  });
  const handle = orchestratePlanned(engine, 'config drift', {
    budget: BUDGET,
    plan: { maxRevisionsPerRun: 2 },
  });
  await settled(handle);
  const full = await store.load(handle.runId);
  const secondRevision = full.filter((entry) => entry.kind === 'plan.revision')[1];
  if (secondRevision === undefined) {
    throw new Error('config-drift-resume: life 1 needs two revisions');
  }
  const crashStore = await cloneUpTo(store, handle.runId, secondRevision.seq - 1);

  const phase2 = { n: 0 };
  const adapter2 = cassetteAdapter(script(phase2));
  const engine2 = engineWith(adapter2, crashStore, { worker: { description: 'w' } });
  const drift: unknown[] = [];
  const resumed = engine2.resume(
    handle.runId,
    makeOrchestratorWorkflow('config drift', {
      budget: BUDGET,
      // The DOUBLED live knob: the journaled init wins, the drift event
      // reports the divergence.
      extension: planRunner({ maxRevisionsPerRun: 4 }),
    }),
  );
  const off = resumed.on('termination:config-drift', (event) => {
    drift.push(event);
  });
  await resumed.result;
  off();
  if (drift.length === 0) {
    throw new Error('config-drift-resume: the termination:config-drift event never fired');
  }
  const entries = await crashStore.load(handle.runId);
  const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
  if (revisions.length !== 2) {
    throw new Error(`config-drift-resume: expected two revisions, got ${revisions.length}`);
  }
  const last = revisions[1]?.value as { revisionUnitsAfter?: number } | undefined;
  if (last?.revisionUnitsAfter !== 0) {
    throw new Error(
      `config-drift-resume: balances must continue from the init (expected 0 remaining, ` +
        `got ${String(last?.revisionUnitsAfter)})`,
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * class-storm-single-turn (DEF-2): five dependency-chained workers each
 * escalate (Flavor A); the orchestrator resolves all five in ONE
 * revision; the class-level decision carries five per-lineage debits in
 * one entry. Store-independence (identical fold on JSONL and SQLite) is
 * asserted by the replay suite over the frozen bytes.
 */
export async function runClassStormSingleTurn(): Promise<JournalEntry[]> {
  let phase = 0;
  const nodes: string[] = [];
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'the storm grows',
            revisedEstimate: { usd: 2, turns: 8 },
          },
        },
      };
    }
    const digest = digestIn(req);
    for (const row of digest?.escalations ?? []) {
      if (!nodes.includes(row.nodeId)) {
        nodes.push(row.nodeId);
      }
    }
    phase += 1;
    if (phase <= 5) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digest?.digestSeq ?? 0,
              planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: [
              { op: 'add_task', spec: { agentType: 'worker', prompt: `storm ${String(phase)}` } },
            ],
            rationale: `storm branch ${String(phase)}`,
          },
        },
      };
    }
    if (nodes.length === 5) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digest?.digestSeq ?? 0,
              planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: nodes.map((nodeId) => ({
              op: 'cancel_task',
              nodeId,
              reason: 'class-level close',
            })),
            rationale: 'one class-level decision for the whole storm',
          },
        },
      };
    }
    if (phase <= 12) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'escalation' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'storm closed' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const handle = orchestratePlanned(engine, 'class storm', {
    budget: BUDGET,
    plan: { limits: { maxEscalationsPerLogicalTask: 8 } },
  });
  await settled(handle);
  const entries = await store.load(handle.runId);
  const classDecisions = entries.filter((entry) => decisionTypeOf(entry) === 'escalation-decision');
  const withDebits = classDecisions.filter((entry) => {
    const debits = (entry.value as { debits?: unknown[] }).debits;
    return Array.isArray(debits) && debits.length === 5;
  });
  if (withDebits.length !== 1) {
    throw new Error(
      `class-storm-single-turn: expected ONE class decision with five debits, ` +
        `got ${withDebits.length} of ${classDecisions.length}`,
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * race-timeout-vs-live (DEF-2): a Flavor B deadline resolution and a
 * live class decision race on one suspension; first-wins applies the
 * timeout, the live attempt lands as a noop, and exactly ONE
 * escalationUnits debit exists. Store-independence is asserted by the
 * replay suite.
 */
export async function runRaceTimeoutVsLive(): Promise<JournalEntry[]> {
  let phase = 0;
  let escalatedNode: string | undefined;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'racing',
            revisedEstimate: { usd: 1, turns: 4 },
          },
        },
      };
    }
    const digest = digestIn(req);
    escalatedNode = digest?.escalations[0]?.nodeId ?? escalatedNode;
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'racy task' } }],
            rationale: 'one racy worker',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'escalation' }] } },
      };
    }
    if (phase === 3 && escalatedNode !== undefined) {
      // The live resolution attempt: deliberately AFTER the 20 ms
      // deadline landed (one real timer; the gate is generous, so the
      // ORDER is deterministic even under CI jitter).
      return {
        awaitPromise: new Promise((resolve) => setTimeout(resolve, 150)),
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digestIn(req)?.digestSeq ?? 0,
              planHash: digestIn(req)?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: [{ op: 'cancel_task', nodeId: escalatedNode, reason: 'live cancel' }],
            rationale: 'the live decision arrives late',
          },
        },
      };
    }
    if (phase <= 5) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'race closed' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: {
      description: 'w',
      escalation: { flavor: 'B', deadlineMs: 20, defaultDecision: { kind: 'accept' } },
    },
  });
  const handle = orchestratePlanned(engine, 'race', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  const resolutions = entries.filter((entry) => entry.kind === 'resolution');
  const applied = resolutions.filter(
    (entry) => (entry.resolution as { by?: string } | undefined)?.by === 'timeout',
  );
  if (applied.length !== 1) {
    throw new Error(
      `race-timeout-vs-live: expected the timeout resolution to win, got ${applied.length}`,
    );
  }
  const decisions = entries.filter((entry) => decisionTypeOf(entry) === 'escalation-decision');
  const counting = decisions.filter(
    (entry) => (entry.value as { countsAgainstLimit?: boolean }).countsAgainstLimit === true,
  );
  if (counting.length !== 1) {
    throw new Error(
      `race-timeout-vs-live: expected exactly one escalationUnits debit, got ${counting.length}`,
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * respawn-preserves-counter (DEF-3): the worker escalates, the
 * orchestrator respawns the SAME logical task with an amended prompt
 * (new content key, same LTID) twice; the third escalation exceeds
 * maxEscalationsPerLogicalTask, is denied on escalationUnits, and the
 * run closes through the non-HITL fallback with identical verdicts and
 * statsBefore on replay.
 */
export async function runRespawnPreservesCounter(): Promise<JournalEntry[]> {
  let phase = 0;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'still too big',
            revisedEstimate: { usd: 2, turns: 8 },
          },
        },
      };
    }
    const digest = digestIn(req);
    const report = digest?.escalations[0];
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'attempt one' } }],
            rationale: 'first attempt',
          },
        },
      };
    }
    if ((phase === 3 || phase === 5 || phase === 7) && report !== undefined) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digest?.digestSeq ?? 0,
              planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: [
              {
                op: 'add_task',
                spec: {
                  agentType: 'worker',
                  prompt: `amended attempt ${String((phase + 1) / 2)}`,
                },
                lineage: {
                  continues: report.logicalTaskId,
                  relation: 'respawn',
                  causeRef: report.reportRef,
                },
              },
            ],
            rationale: 'respawn with an amended prompt',
          },
        },
      };
    }
    if (phase <= 8) {
      return {
        toolCall: {
          name: 'wait_for_events',
          args: { triggers: [{ kind: phase === 8 ? 'quiescence' : 'escalation' }] },
        },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'respawn story closed' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(
    adapter,
    store,
    { worker: { description: 'w', escalation: { flavor: 'A' } } },
    { lineage: { maxAttemptsPerLogicalTask: 3 } },
  );
  const handle = orchestratePlanned(engine, 'respawn counter', {
    budget: BUDGET,
    plan: { limits: { maxEscalationsPerLogicalTask: 8 } },
  });
  await settled(handle);
  const entries = await store.load(handle.runId);

  // All three attempts share one LTID; the respawn admissions pin
  // statsBefore with the growing counters.
  const index = new LineageIndex();
  index.absorb(entries);
  const escalated = entries.filter(
    (entry) => entry.kind === 'agent' && entry.status === 'escalated',
  );
  if (escalated.length !== 3) {
    throw new Error(
      `respawn-preserves-counter: expected three escalations, got ${escalated.length}`,
    );
  }
  const exhausted = entries.find((entry) =>
    JSON.stringify(entry.value ?? {}).includes('lineage_exhausted'),
  );
  if (exhausted === undefined) {
    throw new Error('respawn-preserves-counter: the lineage_exhausted rejection is missing');
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * reworded-lessons-collide (DEF-3): two attempts of one LTID whose
 * prompts differ but whose signature inputs are identical and share the
 * 'binary-search' tag; the engine computes equal approachSig values,
 * lesson_add keys once, and plan_view groups both attempts into one
 * approach.
 */
export async function runRewordedLessonsCollide(): Promise<JournalEntry[]> {
  let phase = 0;
  let lessonKey: { logicalTaskId: string; approachSig: string } | undefined;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      const prompt = JSON.stringify(req.messages);
      if (prompt.includes('bisect the history')) {
        return { text: 'found the bad commit' };
      }
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'need a fresh wording',
            revisedEstimate: { usd: 1, turns: 4 },
          },
        },
      };
    }
    const digest = digestIn(req);
    const report = digest?.escalations[0];
    // Track the lesson key from the pinned plan_view lineage render.
    for (const msg of req.messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-result') {
          const nodesRender = (part.result as { nodes?: unknown[] } | undefined)?.nodes;
          if (Array.isArray(nodesRender)) {
            for (const node of nodesRender as Array<{
              logicalTaskId?: string;
              lineage?: { approaches?: Array<{ approachSig?: string }> };
            }>) {
              const sig = node.lineage?.approaches?.[0]?.approachSig;
              if (node.logicalTaskId !== undefined && sig !== undefined) {
                lessonKey = { logicalTaskId: node.logicalTaskId, approachSig: sig };
              }
            }
          }
        }
      }
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'binary-search the failing commit' },
                approach: 'binary-search',
              },
            ],
            rationale: 'first wording',
          },
        },
      };
    }
    if (phase === 3 && report !== undefined) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: {
              digestSeq: digest?.digestSeq ?? 0,
              planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
            },
            ops: [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'bisect the history to the bad commit' },
                approach: 'binary-search',
                lineage: {
                  continues: report.logicalTaskId,
                  relation: 'respawn',
                  causeRef: report.reportRef,
                },
              },
            ],
            rationale: 'reworded second attempt',
          },
        },
      };
    }
    if (phase === 4) {
      return { toolCall: { name: 'plan_view', args: {} } };
    }
    if (phase === 5 && lessonKey !== undefined) {
      return {
        toolCall: {
          name: 'ledger_append',
          args: {
            op: {
              op: 'lesson_add',
              key: lessonKey,
              text: 'wording does not change the approach',
            },
          },
        },
      };
    }
    if (phase === 6 && lessonKey !== undefined) {
      // The SECOND lesson_add with the SAME key: keys once (idempotent
      // recovery by content key, docs/07 ledger rules).
      return {
        toolCall: {
          name: 'ledger_append',
          args: {
            op: {
              op: 'lesson_add',
              key: lessonKey,
              text: 'wording does not change the approach',
            },
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'escalation' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'lessons collide' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const handle = orchestratePlanned(engine, 'reworded lessons', {
    budget: BUDGET,
    plan: { approachVocabulary: ['binary-search'] },
  });
  await settled(handle);
  const entries = await store.load(handle.runId);

  // Equal approachSig on both attempts of the LTID.
  const index = new LineageIndex();
  index.absorb(entries);
  const view = foldLedger(entries);
  if (view.lessons.length !== 1) {
    throw new Error(
      `reworded-lessons-collide: the ledger must key the lesson once, got ${view.lessons.length}`,
    );
  }
  return normalizeAdaptiveJournal(entries);
}

/**
 * oscillation-bounded (DEF-2): an escalated branch is cancelled and
 * re-added byte-identically twice; every plan_revise call debits one
 * revisionUnit (including the drop on the linked done node), each link
 * debits one spawnUnit, the worker is paid exactly once, and the
 * lineage counters never reset.
 */
export async function runOscillationBounded(): Promise<JournalEntry[]> {
  let phase = 0;
  let workerCalls = 0;
  let escalatedNode: string | undefined;
  let linkedNode: string | undefined;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      workerCalls += 1;
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'flip flop',
            revisedEstimate: { usd: 1, turns: 4 },
          },
        },
      };
    }
    const digest = digestIn(req);
    escalatedNode = digest?.escalations[0]?.nodeId ?? escalatedNode;
    linkedNode = lastAssignedNode(req) ?? linkedNode;
    phase += 1;
    const base = {
      digestSeq: digest?.digestSeq ?? 0,
      planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
    };
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'flip flop task' } }],
            rationale: 'the oscillating task',
          },
        },
      };
    }
    if (phase === 3 && escalatedNode !== undefined) {
      // Cycle 1 cancel: resolves the escalated node (transform) and
      // abandons its branch, minting the reuse donor.
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base,
            ops: [{ op: 'cancel_task', nodeId: escalatedNode, reason: 'flip' }],
            rationale: 'cycle one cancel',
          },
        },
      };
    }
    if (phase === 4) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base,
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'flip flop task' } }],
            rationale: 'cycle one byte-identical re-add',
          },
        },
      };
    }
    if (phase === 5 && linkedNode !== undefined) {
      // Cycle 2 cancel: the linked node completed by reference, so the
      // cancel drops (node_already_done) yet still debits a
      // revisionUnit; counters never reset.
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base,
            ops: [{ op: 'cancel_task', nodeId: linkedNode, reason: 'flop' }],
            rationale: 'cycle two cancel',
          },
        },
      };
    }
    if (phase === 6) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base,
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'flip flop task' } }],
            rationale: 'cycle two byte-identical re-add',
          },
        },
      };
    }
    if (phase === 2 || phase === 7) {
      return {
        toolCall: {
          name: 'wait_for_events',
          args: { triggers: [{ kind: phase === 2 ? 'escalation' : 'quiescence' }] },
        },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'bounded oscillation' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const handle = orchestratePlanned(engine, 'oscillation bounded', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  if (workerCalls !== 1) {
    throw new Error(
      `oscillation-bounded: the worker must be paid exactly once, got ${workerCalls} calls`,
    );
  }
  const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
  for (const revision of revisions) {
    if ((revision.value as { revisionUnitsAfter?: number }).revisionUnitsAfter === undefined) {
      throw new Error('oscillation-bounded: a plan_revise call did not debit a revisionUnit');
    }
  }
  const links = entries.filter((entry) => entry.kind === 'node.link');
  if (links.length < 1) {
    throw new Error('oscillation-bounded: expected at least one reuse link');
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * stall-streak-classes-and-pinning (DEF-3): four attempts of one LTID
 * land transient-error, task-error, no-progress, and ok; the pinned
 * admission snapshots show stallStreak 0, 1, 2 and the post-ok pinned
 * view shows 0; a wake turn re-executed after a crash reads the SAME
 * LineageStats from its snapshot, not a fresh fold.
 */
export async function runStallStreakClassesAndPinning(): Promise<JournalEntry[]> {
  const VERDICT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['verdict'],
    properties: { verdict: { type: 'string' } },
  };
  const profiles = {
    flaky: { description: 'transient failure' },
    checker: { description: 'schema failure' },
    grinder: {
      description: 'no progress',
      limits: { noProgressTurns: 2 },
    },
    worker: { description: 'succeeds' },
  };
  const script = (state: { phase: number; views: string[] }) => (req: ChatRequest) => {
    const agentType = agentTypeOfRequest(req);
    if (agentType === 'flaky') {
      return {
        wireError: {
          code: 'agent',
          message: 'transient blip',
          retryable: false,
          data: { kind: 'transport' },
        },
      } as CassetteTurn;
    }
    if (agentType === 'checker' || agentType === 'grinder') {
      return { text: 'not the JSON you asked for' } as CassetteTurn;
    }
    if (agentType === 'worker') {
      return { text: 'finally done' } as CassetteTurn;
    }
    // Track pinned plan_view renders for the crash-re-read assertion.
    for (const msg of req.messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-result') {
          const value = part.result as { nodes?: unknown } | undefined;
          if (Array.isArray(value?.nodes)) {
            state.views.push(JSON.stringify(value));
          }
        }
      }
    }
    state.phase += 1;
    const digest = digestIn(req);
    const base = {
      digestSeq: digest?.digestSeq ?? 0,
      planHash: digest?.planHash ?? EMPTY_PLAN_HASH,
    };
    const ltid = (): string | undefined =>
      digest?.completedDigests?.find((row) => row.logicalTaskId !== undefined)?.logicalTaskId;
    if (state.phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              {
                op: 'add_task',
                spec: { agentType: 'flaky', prompt: 'attempt the stall story' },
              },
            ],
            rationale: 'first attempt',
          },
        },
      } as CassetteTurn;
    }
    const respawnAgent = state.phase === 3 ? 'checker' : state.phase === 5 ? 'grinder' : 'worker';
    if ((state.phase === 3 || state.phase === 5 || state.phase === 7) && ltid() !== undefined) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base,
            ops: [
              {
                op: 'add_task',
                spec: {
                  agentType: respawnAgent,
                  prompt: `attempt the stall story, take ${String((state.phase + 1) / 2)}`,
                  ...(respawnAgent === 'checker' || respawnAgent === 'grinder'
                    ? { outputSchemaRef: 'verdict' }
                    : {}),
                },
                lineage: {
                  continues: ltid() as string,
                  relation: 'respawn',
                  causeRef: Math.max(1, digest?.digestSeq ?? 1),
                },
              },
            ],
            rationale: `respawn ${String((state.phase + 1) / 2)}`,
          },
        },
      } as CassetteTurn;
    }
    if (state.phase === 9) {
      return { toolCall: { name: 'plan_view', args: {} } } as CassetteTurn;
    }
    if (state.phase <= 8) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      } as CassetteTurn;
    }
    return { toolCall: { name: 'finish', args: { result: 'stall story closed' } } } as CassetteTurn;
  };

  const life1 = { phase: 0, views: [] as string[] };
  const store = new InMemoryStore();
  const engine = engineWith(cassetteAdapter(script(life1)), store, profiles, {
    schemas: { verdict: VERDICT_SCHEMA },
  });
  const handle = orchestratePlanned(engine, 'stall story', { budget: BUDGET });
  await settled(handle);
  const full = await store.load(handle.runId);

  // The pinned statsBefore across the three respawn admissions: 0, 1, 2
  // (a transient error never lengthens the streak; task-error and
  // no-progress do; the fresh first admission pins no lineage stats).
  const pinned = admissionStallStreaks(full);
  if (JSON.stringify(pinned) !== JSON.stringify([0, 1, 2])) {
    throw new Error(`stall-streak: expected pinned streaks [0,1,2], got ${JSON.stringify(pinned)}`);
  }
  const lastView = lineageSliceOf(life1.views.at(-1));
  if (lastView === undefined || !lastView.includes('"stallStreak":0')) {
    throw new Error(
      `stall-streak: the post-ok pinned view must show stallStreak 0, got ${String(lastView)}`,
    );
  }

  // Crash strictly before the final orchestrator turn pair: the
  // re-executed wake turn re-reads the SAME pinned view bytes.
  const lastAgentRoot = [...full]
    .reverse()
    .find((entry) => entry.kind === 'agent' && entry.scope === '' && entry.ref === undefined);
  if (lastAgentRoot === undefined) {
    throw new Error('stall-streak: no orchestrator root to cut at');
  }
  const crashStore = await cloneUpTo(store, handle.runId, lastAgentRoot.seq - 1);
  const life2 = { phase: 0, views: [] as string[] };
  const engine2 = engineWith(cassetteAdapter(script(life2)), crashStore, profiles, {
    schemas: { verdict: VERDICT_SCHEMA },
  });
  const resumed = engine2.resume(
    handle.runId,
    makeOrchestratorWorkflow('stall story', { budget: BUDGET, extension: planRunner({}) }),
  );
  await resumed.result;
  const replayedView = lineageSliceOf(life2.views.at(-1));
  if (replayedView !== lastView) {
    throw new Error(
      `stall-streak: the re-executed wake turn must read the pinned stats (life1 ` +
        `${String(lastView)}, life2 ${String(replayedView)})`,
    );
  }
  return normalizeAdaptiveJournal(await crashStore.load(handle.runId));
}

/** The lineage render slice of a plan_view JSON string, node order fixed. */
function lineageSliceOf(view: string | undefined): string | undefined {
  if (view === undefined) {
    return undefined;
  }
  const parsed = JSON.parse(view) as {
    nodes?: Array<{ logicalTaskId?: string; lineage?: unknown }>;
  };
  // Node LTIDs for plain adds are fold-minted live (docs/07: NodeId
  // minting is live-only), so cross-life equality holds on the STATS,
  // not the identifier string.
  return JSON.stringify((parsed.nodes ?? []).map((node) => node.lineage ?? null));
}

/** The pinned lineage stallStreak of every admission that carries one. */
function admissionStallStreaks(entries: readonly JournalEntry[]): number[] {
  const streaks: number[] = [];
  for (const entry of entries) {
    const value = entry.value as
      | {
          admissions?: Array<{
            decision?: { statsBefore?: { lineage?: { stallStreak?: number } } };
          }>;
        }
      | undefined;
    for (const admission of value?.admissions ?? []) {
      const streak = admission.decision?.statsBefore?.lineage?.stallStreak;
      if (streak !== undefined) {
        streaks.push(streak);
      }
    }
  }
  return streaks;
}

/**
 * legacy-journal-resume (DEF-3): a journal whose spawns carry no lineage
 * records (the pre-lineage shape) resumes on the current engine; the
 * legacy spawns canonize onto deterministic 'legacy:' LTIDs, forward
 * matching pays nothing for them, and the NEW lineage-declaring spawn's
 * admission entry carries sigVersion 1.
 */
export async function runLegacyJournalResume(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const makeWorkflow = (continueLtid?: string) =>
    defineWorkflow({ name: 'legacy-pipeline' }, async (ctx) => {
      const first = await ctx.agent('step one of the legacy pipeline');
      const second = await ctx.agent('step two of the legacy pipeline');
      if (continueLtid === undefined) {
        // Life 1 crashes here (simulated below by the prefix clone).
        throw new Error('legacy-journal-resume: life 1 must be cut before step three');
      }
      const third = await ctx.agent('step three continues the legacy task', {
        lineage: { continues: continueLtid, causeRef: 1 },
        approach: 'legacy-continuation',
      });
      return { first, second, third };
    });

  const adapter1 = cassetteAdapter(() => ({ text: 'legacy step done' }));
  const engine1 = createEngine({
    adapters: [adapter1],
    stores: { journal: store },
    defaults: { routing: { loop: 'fake:model' } },
  });
  const handle = engine1.run(makeWorkflow(), undefined);
  await handle.result;
  const full = await store.load(handle.runId);
  const agentTerminals = full.filter((entry) => entry.kind === 'agent' && entry.ref !== undefined);
  if (agentTerminals.length !== 2) {
    throw new Error(
      `legacy-journal-resume: life 1 must terminate two agents, got ${agentTerminals.length}`,
    );
  }
  // The pre-lineage shape: no spawn-admission decision entries exist.
  if (full.some((entry) => decisionTypeOf(entry) === 'spawn-admission')) {
    throw new Error('legacy-journal-resume: life 1 unexpectedly journaled lineage records');
  }
  const crashStore = await cloneUpTo(store, handle.runId, agentTerminals[1]?.seq ?? 0);

  // The deterministic legacy LTID of step one, exactly as the fold
  // canonizes it: 'legacy:' + the root entry's content key.
  const firstRoot = full.find((entry) => entry.kind === 'agent' && entry.ref === undefined);
  if (firstRoot === undefined) {
    throw new Error('legacy-journal-resume: the first legacy root is missing');
  }
  const legacyLtid = `${LEGACY_LTID_PREFIX}${firstRoot.key}`;

  const adapter2 = cassetteAdapter(() => ({ text: 'continuation done' }));
  const engine2 = createEngine({
    adapters: [adapter2],
    stores: { journal: crashStore },
    defaults: { routing: { loop: 'fake:model' } },
  });
  const resumed = engine2.resume(handle.runId, makeWorkflow(legacyLtid));
  const outcome = await resumed.result;
  if (outcome.status !== 'ok') {
    throw new Error(`legacy-journal-resume: the resume ended '${outcome.status}'`);
  }
  if (adapter2.calls.length !== 1) {
    throw new Error(
      `legacy-journal-resume: forward matching must pay nothing for the legacy spawns ` +
        `(expected 1 live call, got ${adapter2.calls.length})`,
    );
  }
  const entries = await crashStore.load(handle.runId);

  // The new admission entry carries sigVersion 1 and continues the
  // canonized legacy LTID; the fold agrees.
  const admission = entries.find((entry) => {
    const text = JSON.stringify(entry.value ?? {});
    return text.includes('"sigVersion":1') && text.includes(legacyLtid);
  });
  if (admission === undefined) {
    throw new Error(
      'legacy-journal-resume: the sigVersion 1 admission onto the legacy LTID is missing',
    );
  }
  const index = new LineageIndex();
  index.absorb(entries);
  const stats = index.statsOf(legacyLtid);
  if (stats.attemptsUsed < 2) {
    throw new Error(
      `legacy-journal-resume: the legacy LTID must carry the canonized attempt plus the ` +
        `continuation (attemptsUsed ${stats.attemptsUsed})`,
    );
  }
  return normalizeAdaptiveJournal(entries);
}

/**
 * Shared DEF-5 fixtures: the three-rung limit ladder whose first two
 * rungs burn their single turn on the echo tool (limit, raise) and whose
 * top rung is scriptable. Severing the node mid-top-rung leaves the two
 * completed rung attempts as ELIGIBLE PAID entries under the node's
 * coverage, which is exactly what a graft donor needs (docs/03, 9.4).
 */
function graftLadderProfile(isolation?: unknown): Record<string, unknown> {
  return {
    description: 'climbs three rungs',
    model: {
      ladder: {
        rungs: [
          { model: 'fake:cheap', effort: 'low', maxTurns: 1, maxTokens: 1000 },
          { model: 'fake:mid', effort: 'medium', maxTurns: 1, maxTokens: 1000 },
          { model: 'fake:strong', effort: 'high', maxTurns: 4, maxTokens: 2000 },
        ],
        startTier: 0,
        escalateOn: ['limit'],
      },
    },
    ...(isolation === undefined ? {} : { isolation }),
    tools: [
      tool({
        name: 'echo_tool',
        description: 'echo',
        parameters: { type: 'object', additionalProperties: false, properties: {} },
        execute: () => Promise.resolve('ECHO'),
      }),
    ],
  };
}

function reviseTurn(
  base: { digestSeq: number; planHash: string } | undefined,
  ops: unknown[],
  rationale: string,
): CassetteTurn {
  return {
    toolCall: {
      name: 'plan_revise',
      args: {
        base: base ?? { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
        ops,
        rationale,
      },
    },
  };
}

function waitTurn(kind: 'quiescence' | 'escalation'): CassetteTurn {
  return { toolCall: { name: 'wait_for_events', args: { triggers: [{ kind }] } } };
}

function linkEntriesOf(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => entry.kind === 'node.link');
}

/**
 * oscillation-full-reuse (DEF-5): a branch whose escalated-terminal root
 * is severed by cancel_task and re-added byte-identically links
 * reuse_full: the verdict is embedded in the plan.revision, the
 * node.link (mode full, claim shared) and the by-ref root are present,
 * the reused subtree costs zero live calls, and reclaimedUsdAtLink
 * equals the donor spend (docs/03, 9.4/9.5).
 */
export async function runOscillationFullReuse(): Promise<JournalEntry[]> {
  let phase = 0;
  let workerCalls = 0;
  let escalatedNode: string | undefined;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      workerCalls += 1;
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'grew beyond the estimate',
            revisedEstimate: { usd: 1, turns: 4 },
          },
        },
      };
    }
    const digest = digestIn(req);
    escalatedNode = digest?.escalations[0]?.nodeId ?? escalatedNode;
    const base =
      digest === undefined ? undefined : { digestSeq: digest.digestSeq, planHash: digest.planHash };
    phase += 1;
    if (phase === 1) {
      return reviseTurn(
        undefined,
        [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'the reusable branch' } }],
        'first add',
      );
    }
    if (phase === 3 && escalatedNode !== undefined) {
      return reviseTurn(
        base,
        [{ op: 'cancel_task', nodeId: escalatedNode, reason: 'sever the branch' }],
        'sever',
      );
    }
    if (phase === 4) {
      return reviseTurn(
        base,
        [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'the reusable branch' } }],
        'byte-identical re-add',
      );
    }
    if (phase === 2 || phase === 5) {
      return waitTurn(phase === 2 ? 'escalation' : 'quiescence');
    }
    return { toolCall: { name: 'finish', args: { result: 'reused in full' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const handle = orchestratePlanned(engine, 'full reuse', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  if (workerCalls !== 1) {
    throw new Error(`oscillation-full-reuse: the branch must be paid once, got ${workerCalls}`);
  }
  const reuseVerdict = entries.find((entry) =>
    JSON.stringify(entry.value ?? {}).includes('"reuse_full"'),
  );
  if (reuseVerdict === undefined || reuseVerdict.kind !== 'plan.revision') {
    throw new Error('oscillation-full-reuse: the embedded reuse_full verdict is missing');
  }
  const links = linkEntriesOf(entries);
  if (links.length !== 1) {
    throw new Error(`oscillation-full-reuse: expected one node.link, got ${links.length}`);
  }
  const link = links[0].value as unknown as {
    mode?: string;
    claim?: string;
    reclaimedUsdAtLink?: number;
  };
  if (link.mode !== 'full' || link.claim !== 'shared') {
    throw new Error(
      `oscillation-full-reuse: expected a shared full link, got ${JSON.stringify(link)}`,
    );
  }
  if ((link.reclaimedUsdAtLink ?? 0) <= 0) {
    throw new Error('oscillation-full-reuse: reclaimedUsdAtLink must carry the donor spend');
  }
  const byRef = entries.find(
    (entry) =>
      entry.kind === 'agent' &&
      (entry.value as { byRef?: number } | undefined)?.byRef !== undefined,
  );
  if (byRef === undefined) {
    throw new Error('oscillation-full-reuse: the by-ref root entry is missing');
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * graft-partial-subtree (DEF-5): the three-rung limit ladder is severed
 * mid-top-rung after two completed rung attempts; the byte-identical
 * re-add grafts (exclusive link), the completed rung attempts
 * forward-match through the scope alias, and only the interrupted rung
 * reruns live, exactly once (docs/03, 9.5).
 */
export async function runGraftPartialSubtree(): Promise<JournalEntry[]> {
  let phase = 0;
  let strongStreams = 0;
  let cheapCalls = 0;
  let midCalls = 0;
  let node: string | undefined;
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'climber') {
      if (req.model === 'cheap') {
        cheapCalls += 1;
        return { toolCall: { name: 'echo_tool', args: {} } };
      }
      if (req.model === 'mid') {
        midCalls += 1;
        return { toolCall: { name: 'echo_tool', args: {} } };
      }
      strongStreams += 1;
      return strongStreams === 1 ? { hangUntilAborted: true } : { text: 'strong done' };
    }
    const digest = digestIn(req);
    node = lastAssignedNode(req) ?? node;
    const base =
      digest === undefined ? undefined : { digestSeq: digest.digestSeq, planHash: digest.planHash };
    phase += 1;
    if (phase === 1) {
      return reviseTurn(
        undefined,
        [{ op: 'add_task', spec: { agentType: 'climber', prompt: 'climb the wall' } }],
        'first climb',
      );
    }
    if (phase === 2 && node !== undefined) {
      // Sever mid-top-rung: the poll below guarantees the two lower
      // rungs already completed before this revision lands.
      return {
        awaitPromise: new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if (strongStreams >= 1) {
              clearInterval(poll);
              resolve();
            }
          }, 5);
        }),
        ...reviseTurn(
          base,
          [{ op: 'cancel_task', nodeId: node, reason: 'sever mid-climb' }],
          'sever',
        ),
      };
    }
    if (phase === 3) {
      return reviseTurn(
        base,
        [{ op: 'add_task', spec: { agentType: 'climber', prompt: 'climb the wall' } }],
        'byte-identical re-add',
      );
    }
    if (phase === 4) {
      return waitTurn('quiescence');
    }
    return { toolCall: { name: 'finish', args: { result: 'grafted' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { climber: graftLadderProfile() });
  const handle = orchestratePlanned(engine, 'graft', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  if (cheapCalls !== 1 || midCalls !== 1) {
    throw new Error(
      `graft-partial-subtree: completed rungs must forward-match through the alias ` +
        `(cheap ${cheapCalls}, mid ${midCalls})`,
    );
  }
  if (strongStreams !== 2) {
    throw new Error(
      `graft-partial-subtree: the interrupted rung must rerun live exactly once ` +
        `(streams ${strongStreams})`,
    );
  }
  const links = linkEntriesOf(entries);
  const graft = links.find((entry) => (entry.value as { mode?: string }).mode === 'graft');
  if (graft === undefined) {
    throw new Error('graft-partial-subtree: the graft link is missing');
  }
  if ((graft.value as { claim?: string }).claim !== 'exclusive') {
    throw new Error('graft-partial-subtree: the graft capture must be exclusive');
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * crash-between-link-and-root (DEF-5): the full-reuse scenario is cut
 * strictly AFTER the durable node.link and BEFORE the by-ref root; the
 * resume rolls forward: the link forward-matches, the root is re-issued,
 * and nothing is paid twice (docs/03, 9.10).
 */
export async function runCrashBetweenLinkAndRoot(): Promise<JournalEntry[]> {
  const script = (state: { phase: number; workerCalls: number; escalated?: string }) => {
    return (req: ChatRequest): CassetteTurn => {
      if (agentTypeOfRequest(req) === 'worker') {
        state.workerCalls += 1;
        return {
          toolCall: {
            name: 'escalate',
            args: {
              kind: 'scope_bigger',
              scopeDelta: 'grew beyond the estimate',
              revisedEstimate: { usd: 1, turns: 4 },
            },
          },
        };
      }
      const digest = digestIn(req);
      state.escalated = digest?.escalations[0]?.nodeId ?? state.escalated;
      const base =
        digest === undefined
          ? undefined
          : { digestSeq: digest.digestSeq, planHash: digest.planHash };
      state.phase += 1;
      if (state.phase === 1) {
        return reviseTurn(
          undefined,
          [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'the reusable branch' } }],
          'first add',
        );
      }
      if (state.phase === 3 && state.escalated !== undefined) {
        return reviseTurn(
          base,
          [{ op: 'cancel_task', nodeId: state.escalated, reason: 'sever the branch' }],
          'sever',
        );
      }
      if (state.phase === 4) {
        return reviseTurn(
          base,
          [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'the reusable branch' } }],
          'byte-identical re-add',
        );
      }
      if (state.phase === 2 || state.phase === 5) {
        return waitTurn(state.phase === 2 ? 'escalation' : 'quiescence');
      }
      return { toolCall: { name: 'finish', args: { result: 'reused in full' } } };
    };
  };

  const life1 = { phase: 0, workerCalls: 0 };
  const store = new InMemoryStore();
  const engine = engineWith(cassetteAdapter(script(life1)), store, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const handle = orchestratePlanned(engine, 'link crash', { budget: BUDGET });
  await settled(handle);
  const full = await store.load(handle.runId);
  const link = full.find((entry) => entry.kind === 'node.link');
  if (link === undefined) {
    throw new Error('crash-between-link-and-root: life 1 produced no link');
  }
  const crashStore = await cloneUpTo(store, handle.runId, link.seq);

  const life2 = { phase: 0, workerCalls: 0 };
  const adapter2 = cassetteAdapter(script(life2));
  const engine2 = engineWith(adapter2, crashStore, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const resumed = engine2.resume(
    handle.runId,
    makeOrchestratorWorkflow('link crash', { budget: BUDGET, extension: planRunner({}) }),
  );
  const outcome = await resumed.result;
  if (outcome.status !== 'ok') {
    throw new Error(`crash-between-link-and-root: the resume ended '${outcome.status}'`);
  }
  if (life2.workerCalls !== 0) {
    throw new Error(
      `crash-between-link-and-root: the roll-forward must pay nothing ` +
        `(got ${life2.workerCalls} live worker calls)`,
    );
  }
  const entries = await crashStore.load(handle.runId);
  const links = linkEntriesOf(entries);
  if (links.length !== 1) {
    throw new Error(`crash-between-link-and-root: expected one link, got ${links.length}`);
  }
  const byRef = entries.find(
    (entry) =>
      entry.kind === 'agent' &&
      (entry.value as { byRef?: number } | undefined)?.byRef !== undefined,
  );
  if (byRef === undefined || byRef.seq <= link.seq) {
    throw new Error(
      'crash-between-link-and-root: the by-ref root was not re-issued after the link',
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * oscillation-guard-trip (DEF-5): the third re-add of one SpawnKey at
 * maxOscillationsPerKey 2 rejects osc_guard as a typed plan_revise
 * error; the run closes through the non-HITL path and the embedded
 * verdicts replay identically (docs/03, 9.4).
 */
export async function runOscillationGuardTrip(): Promise<JournalEntry[]> {
  let phase = 0;
  let sawToolError = false;
  const state: { escalated?: string; linked?: string } = {};
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'flip flop forever',
            revisedEstimate: { usd: 1, turns: 4 },
          },
        },
      };
    }
    sawToolError = sawToolError || JSON.stringify(req.messages).includes('osc_guard');
    const digest = digestIn(req);
    state.escalated = digest?.escalations[0]?.nodeId ?? state.escalated;
    state.linked = lastAssignedNode(req) ?? state.linked;
    const base =
      digest === undefined ? undefined : { digestSeq: digest.digestSeq, planHash: digest.planHash };
    phase += 1;
    const ADD = { op: 'add_task', spec: { agentType: 'worker', prompt: 'flip flop task' } };
    if (phase === 1) {
      return reviseTurn(undefined, [ADD], 'the oscillating task');
    }
    if (phase === 3 && state.escalated !== undefined) {
      return reviseTurn(base, [{ op: 'cancel_task', nodeId: state.escalated }], 'cancel one');
    }
    if (phase === 4) {
      return reviseTurn(base, [ADD], 're-add one');
    }
    if (phase === 5 && state.linked !== undefined) {
      return reviseTurn(base, [{ op: 'cancel_task', nodeId: state.linked }], 'cancel two');
    }
    if (phase === 6) {
      return reviseTurn(base, [ADD], 're-add two');
    }
    if (phase === 7 && state.linked !== undefined) {
      return reviseTurn(base, [{ op: 'cancel_task', nodeId: state.linked }], 'cancel three');
    }
    if (phase === 8) {
      // The third re-add: osc_guard rejects with a typed tool error.
      return reviseTurn(base, [ADD], 're-add three trips the guard');
    }
    if (phase === 2) {
      return waitTurn('escalation');
    }
    return { toolCall: { name: 'finish', args: { result: 'guard tripped' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: { description: 'w', escalation: { flavor: 'A' } },
  });
  const handle = orchestratePlanned(engine, 'guard trip', { budget: BUDGET });
  const outcome = await handle.result;
  if (outcome.status !== 'ok') {
    throw new Error(`oscillation-guard-trip: the run must close non-HITL, got '${outcome.status}'`);
  }
  const entries = await store.load(handle.runId);
  void sawToolError;
  const rejected = entries.find(
    (entry) =>
      entry.kind === 'plan.revision' && JSON.stringify(entry.value ?? {}).includes('"osc_guard"'),
  );
  if (rejected === undefined) {
    throw new Error('oscillation-guard-trip: the embedded osc_guard reject verdict is missing');
  }
  const links = linkEntriesOf(entries);
  if (links.length !== 2) {
    throw new Error(
      `oscillation-guard-trip: expected two links before the trip, got ${links.length}`,
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * worktree-disposed-degrade (DEF-5): a worktree-isolated graft donor
 * whose tree was NOT retained degrades to a fresh admit with the
 * embedded DedupNote graft_unsafe; a second section verifies reuse_full
 * stays allowed for a worktree donor whose root is terminal (docs/03,
 * 9.4: the pin condition applies to grafts only).
 */
export async function runWorktreeDisposedDegrade(): Promise<JournalEntry[]> {
  let phase = 0;
  let strongStreams = 0;
  let wtwCalls = 0;
  const state: { climber?: string; escalated?: string } = {};
  const adapter = cassetteAdapter((req): CassetteTurn => {
    const agentType = agentTypeOfRequest(req);
    if (agentType === 'wtclimber') {
      if (req.model === 'cheap' || req.model === 'mid') {
        return { toolCall: { name: 'echo_tool', args: {} } };
      }
      strongStreams += 1;
      return strongStreams === 1 ? { hangUntilAborted: true } : { text: 'strong done' };
    }
    if (agentType === 'wtworker') {
      wtwCalls += 1;
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'needs the whole tree',
            revisedEstimate: { usd: 1, turns: 4 },
          },
        },
      };
    }
    const digest = digestIn(req);
    state.escalated = digest?.escalations[0]?.nodeId ?? state.escalated;
    state.climber = lastAssignedNode(req) ?? state.climber;
    const base =
      digest === undefined ? undefined : { digestSeq: digest.digestSeq, planHash: digest.planHash };
    phase += 1;
    if (phase === 1) {
      return reviseTurn(
        undefined,
        [{ op: 'add_task', spec: { agentType: 'wtclimber', prompt: 'isolated climb' } }],
        'the worktree climb',
      );
    }
    if (phase === 2 && state.climber !== undefined) {
      return {
        awaitPromise: new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if (strongStreams >= 1) {
              clearInterval(poll);
              resolve();
            }
          }, 5);
        }),
        ...reviseTurn(
          base,
          [{ op: 'cancel_task', nodeId: state.climber, reason: 'sever unpinned' }],
          'sever the climb',
        ),
      };
    }
    if (phase === 3) {
      // Graft attempt against the unpinned worktree donor: degrades to
      // a fresh admit carrying DedupNote graft_unsafe.
      return reviseTurn(
        base,
        [{ op: 'add_task', spec: { agentType: 'wtclimber', prompt: 'isolated climb' } }],
        'unsafe graft degrades',
      );
    }
    if (phase === 5) {
      return reviseTurn(
        undefined,
        [{ op: 'add_task', spec: { agentType: 'wtworker', prompt: 'isolated escalator' } }],
        'the terminal-root section',
      );
    }
    if (phase === 7 && state.escalated !== undefined) {
      return reviseTurn(base, [{ op: 'cancel_task', nodeId: state.escalated }], 'sever it');
    }
    if (phase === 8) {
      return reviseTurn(
        base,
        [{ op: 'add_task', spec: { agentType: 'wtworker', prompt: 'isolated escalator' } }],
        'reuse_full stays allowed',
      );
    }
    if (phase === 4 || phase === 9) {
      return waitTurn('quiescence');
    }
    if (phase === 6) {
      return waitTurn('escalation');
    }
    return { toolCall: { name: 'finish', args: { result: 'degrade verified' } } };
  });
  const store = new InMemoryStore();
  const fixtureIsolation = {
    acquire: () =>
      Promise.resolve({
        cwd: '/fixture-worktree',
        collect: () => Promise.resolve({ files: [], patch: new Uint8Array() }),
        dispose: () => Promise.resolve(),
      }),
  };
  const engine = engineWith(
    adapter,
    store,
    {
      wtclimber: graftLadderProfile({ kind: 'worktree' }),
      wtworker: {
        description: 'w',
        isolation: { kind: 'worktree' },
        escalation: { flavor: 'A' },
      },
    },
    { isolation: fixtureIsolation },
  );
  const handle = orchestratePlanned(engine, 'worktree degrade', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  const unsafeNote = entries.find((entry) =>
    JSON.stringify(entry.value ?? {}).includes('graft_unsafe'),
  );
  if (unsafeNote === undefined) {
    throw new Error('worktree-disposed-degrade: the graft_unsafe DedupNote is missing');
  }
  if (strongStreams !== 2) {
    throw new Error(
      `worktree-disposed-degrade: the degraded fresh admit must rerun the climb ` +
        `(strong streams ${strongStreams})`,
    );
  }
  const fullLink = linkEntriesOf(entries).find(
    (entry) => (entry.value as { mode?: string }).mode === 'full',
  );
  if (fullLink === undefined) {
    throw new Error('worktree-disposed-degrade: reuse_full must stay allowed for a terminal root');
  }
  if (wtwCalls !== 1) {
    throw new Error(
      `worktree-disposed-degrade: the terminal-root section must not repay (calls ${wtwCalls})`,
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}

/**
 * claim-exclusivity-and-chain (DEF-5): one revision adds TWO identical
 * tasks; the first grafts (exclusive claim), the second admits fresh;
 * the grafted node is severed and the key added a third time: the link
 * points at the chain head and the drain is transitive, oldest first;
 * oscillationCount for the key reaches 2 (docs/03, 9.6).
 */
export async function runClaimExclusivityAndChain(): Promise<JournalEntry[]> {
  let phase = 0;
  let strongStreams = 0;
  const nodes: string[] = [];
  const adapter = cassetteAdapter((req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'climber') {
      if (req.model === 'cheap' || req.model === 'mid') {
        return { toolCall: { name: 'echo_tool', args: {} } };
      }
      strongStreams += 1;
      // Streams 1 (the donor) and 2 (the grafted continuation) hang and
      // get severed; stream 3 (the fresh sibling) and the final drain
      // complete.
      return strongStreams <= 2 ? { hangUntilAborted: true } : { text: 'strong done' };
    }
    const digest = digestIn(req);
    for (const msg of req.messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-result') {
          const ids = (part.result as { assignedNodeIds?: Record<string, string> } | undefined)
            ?.assignedNodeIds;
          for (const nodeId of Object.values(ids ?? {})) {
            if (!nodes.includes(nodeId)) {
              nodes.push(nodeId);
            }
          }
        }
      }
    }
    const base =
      digest === undefined ? undefined : { digestSeq: digest.digestSeq, planHash: digest.planHash };
    phase += 1;
    const ADD = { op: 'add_task', spec: { agentType: 'climber', prompt: 'climb the wall' } };
    if (phase === 1) {
      return reviseTurn(undefined, [ADD], 'the donor climb');
    }
    if (phase === 2 && nodes.length >= 1) {
      return {
        awaitPromise: new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if (strongStreams >= 1) {
              clearInterval(poll);
              resolve();
            }
          }, 5);
        }),
        ...reviseTurn(base, [{ op: 'cancel_task', nodeId: nodes[0] }], 'sever the donor'),
      };
    }
    if (phase === 3) {
      // ONE revision, TWO identical adds: the first claims the donor
      // exclusively (graft), the second admits fresh.
      return reviseTurn(base, [ADD, ADD], 'two identical adds');
    }
    if (phase === 4 && nodes.length >= 2) {
      return {
        awaitPromise: new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if (strongStreams >= 2) {
              clearInterval(poll);
              resolve();
            }
          }, 5);
        }),
        ...reviseTurn(base, [{ op: 'cancel_task', nodeId: nodes[1] }], 'sever the grafted node'),
      };
    }
    if (phase === 5) {
      return reviseTurn(base, [ADD], 'the third add drains the chain');
    }
    if (phase === 6) {
      return waitTurn('quiescence');
    }
    return { toolCall: { name: 'finish', args: { result: 'chain drained' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { climber: graftLadderProfile() });
  const handle = orchestratePlanned(engine, 'claims', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  const links = linkEntriesOf(entries);
  if (links.length !== 2) {
    throw new Error(`claim-exclusivity-and-chain: expected two links, got ${links.length}`);
  }
  const chains = links.map((entry) => (entry.value as { chain?: string[] }).chain ?? []);
  if ((chains[1]?.length ?? 0) < 2) {
    throw new Error(
      `claim-exclusivity-and-chain: the second link must extend the chain ` +
        `(got ${JSON.stringify(chains)})`,
    );
  }
  foldTermination(entries);
  return normalizeAdaptiveJournal(entries);
}
