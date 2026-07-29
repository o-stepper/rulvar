/**
 * The RV-207 event-model contract at the engine surface: one
 * agent:start/agent:end pair per logical span, one paired
 * agent:phase:start/agent:phase:end per model invocation phase, the
 * official reducer building the per-agent per-phase table that matches
 * the journal cost fold without heuristics, and a replayed stream whose
 * usage and cost tables are IDENTICAL to the live ones (durations are
 * live-only fidelity). Before the contract, every phase emitted an
 * extra unpaired agent:start, so a consumer pairing starts with the
 * single end read the LAST phase's duration as the agent's and leaked
 * one "running agent" per extra phase.
 */
import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from '../l0/events.js';
import { reduceInvocationTable } from '../l0/telemetry-reduce.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { checkpointRefFor, encodeCheckpoint, type CheckpointState } from '../journal/checkpoint.js';
import { deriveContentKey, type IdentityInput } from '../journal/identity.js';
import { EMPTY_SCHEMA_HASH } from '../l0/schema.js';
import { tool } from '../tools/tool.js';
import { resolveToolset } from '../tools/toolset-hash.js';
import { createEngine } from './engine.js';
import { createCtx, defineWorkflow } from './ctx.js';
import { makeInternals, scriptedAdapter, testCaps } from './test-harness.js';

const SCHEMA = {
  type: 'object',
  properties: { a: { type: 'number' } },
  required: ['a'],
} as const;

/** loop on fake:model, separate extract on fake:extract (distinct ref). */
function multiPhaseAdapter(): ReturnType<typeof scriptedAdapter> {
  return scriptedAdapter((req) => {
    const texts = req.messages.flatMap((message) =>
      message.parts.filter((part) => part.type === 'text').map((part) => part.text),
    );
    const isExtract = texts.some((text) => text.includes('Extract the final structured result'));
    // The schema is not strict-compatible, so the extract tier is
    // forced-tool: the answer is the pinned emit_result call.
    return isExtract
      ? {
          toolCall: { name: 'emit_result', args: { a: 1 } },
          usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 0 },
        }
      : {
          text: 'analysis',
          usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
  });
}

const wf = defineWorkflow({ name: 'phases' }, async (ctx) =>
  ctx.agent('analyze', { schema: SCHEMA }),
);

function engineOver(store: InMemoryStore): ReturnType<typeof createEngine> {
  return createEngine({
    adapters: [multiPhaseAdapter()],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', extract: 'fake:extract' },
    },
  });
}

const AGENT_EVENT_TYPES = [
  'agent:start',
  'agent:phase:start',
  'agent:phase:end',
  'agent:end',
] as const;

function collect(handle: {
  on: (type: (typeof AGENT_EVENT_TYPES)[number], fn: (event: WorkflowEvent) => void) => () => void;
}): WorkflowEvent[] {
  const events: WorkflowEvent[] = [];
  for (const type of AGENT_EVENT_TYPES) {
    handle.on(type, (event) => events.push(event));
  }
  return events;
}

describe('invocation events (RV-207)', () => {
  it('one agent pair per span; each phase pairs up and the pairs sum to the agent totals', async () => {
    const store = new InMemoryStore();
    const handle = engineOver(store).run(wf, {});
    const events = collect(handle);
    const outcome = await handle.result;
    expect(outcome.status, JSON.stringify(outcome.error ?? null)).toBe('ok');

    const starts = events.filter((event) => event.type === 'agent:start');
    const ends = events.filter((event) => event.type === 'agent:end');
    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
    expect(starts[0]?.spanId).toBe(ends[0]?.spanId);

    const phaseStarts = events.filter((event) => event.type === 'agent:phase:start');
    const phaseEnds = events.filter((event) => event.type === 'agent:phase:end');
    expect(phaseStarts.map((event) => event.role)).toEqual(['loop', 'extract']);
    expect(phaseEnds.map((event) => event.role)).toEqual(['loop', 'extract']);
    expect(phaseStarts.map((event) => event.invocation)).toEqual([1, 2]);
    // The extract phase resolved and served on its own model.
    expect(phaseEnds[1]?.model).toBe('fake:extract');

    // The pairs sum exactly to the agent totals.
    const end = ends[0];
    const summedInput = phaseEnds.reduce((sum, event) => sum + event.usage.inputTokens, 0);
    const summedCost = phaseEnds.reduce((sum, event) => sum + event.costUsd, 0);
    expect(summedInput).toBe(end.usage.inputTokens);
    expect(summedCost).toBeCloseTo(end.costUsd, 12);
    expect(end.retryCount).toBeUndefined();

    // The official reducer, no heuristics: one settled row, two settled
    // phases, byRole matching the journal cost fold to the cent and
    // beyond.
    const table = reduceInvocationTable(events);
    expect(table.agents).toHaveLength(1);
    const row = table.agents[0];
    expect(row?.open).toBe(false);
    expect(row?.phases.map((phase) => phase.open)).toEqual([false, false]);
    expect(row?.phases.map((phase) => phase.role)).toEqual(['loop', 'extract']);
    expect(table.totalCostUsd).toBeCloseTo(end.costUsd, 12);
    const fold = outcome.cost.byRole;
    expect(table.byRole['loop']?.costUsd).toBeCloseTo(fold.loop, 12);
    expect(table.byRole['extract']?.costUsd).toBeCloseTo(fold.extract, 12);
    expect(table.byRole['loop']?.usage.inputTokens).toBe(10);
    expect(table.byRole['extract']?.usage.inputTokens).toBe(7);
  });

  it('a replayed stream reduces to the SAME usage and cost table (durations live-only)', async () => {
    const store = new InMemoryStore();
    const first = engineOver(store).run(wf, {});
    const liveEvents = collect(first);
    expect((await first.result).status).toBe('ok');

    const resumed = engineOver(store).resume(first.runId, wf, {});
    const replayEvents = collect(resumed);
    expect((await resumed.result).status).toBe('ok');

    const live = reduceInvocationTable(liveEvents);
    const replay = reduceInvocationTable(replayEvents);
    expect(replay.agents).toHaveLength(1);
    expect(replay.agents[0]?.replayed).toBe(true);
    expect(replay.agents[0]?.phases.map((phase) => phase.replayed)).toEqual([true, true]);
    // Usage and cost columns are identical; replayed durations read 0.
    expect(replay.byRole).toEqual(live.byRole);
    expect(replay.totalCostUsd).toBeCloseTo(live.totalCostUsd, 12);
    expect(replay.agents[0]?.phases.every((phase) => phase.durationMs === 0)).toBe(true);
    // Replay omits the live-only retry facts rather than fabricating 0s
    // into the events (the reducer defaults absent to 0).
    expect(replay.agents[0]?.retryCount).toBe(0);
  });

  it('the reducer keeps truncated streams honest: unmatched opens stay open', () => {
    const base = { runId: 'r', ts: 't', seq: 0 };
    const truncated: WorkflowEvent[] = [
      {
        ...base,
        spanId: 's1',
        type: 'agent:start',
        agentType: 'worker',
        model: 'fake:model',
        role: 'loop',
      },
      {
        ...base,
        spanId: 's1',
        type: 'agent:phase:start',
        agentType: 'worker',
        role: 'loop',
        model: 'fake:model',
        invocation: 1,
      },
    ];
    const table = reduceInvocationTable(truncated);
    expect(table.agents[0]?.open).toBe(true);
    expect(table.agents[0]?.phases[0]?.open).toBe(true);
    expect(table.totalCostUsd).toBe(0);
  });
});

describe('per-call phase pricing under a nonlinear tier (RV702)', () => {
  // The eleventh experiment's live 60.2% overcount: agent:phase:end
  // priced the PHASE-AGGREGATE usage delta, so a long-context tier fired
  // on an aggregate no single provider request crossed; agent:end and
  // the reducer inherited the inflated dollars while the settled fold
  // (RV504) priced per request. Two 600-input calls under a tier that
  // starts above 1000 aggregate input: per-call $1.20, tier-inflated
  // aggregate $2.40.
  const clock = tool({
    name: 'clock',
    description: 'tells the time',
    parameters: {},
    execute: () => Promise.resolve('12:00'),
  });
  const tieredCaps = testCaps({
    pricing: {
      inputUsdPerMTok: 1000,
      outputUsdPerMTok: 0,
      tiers: [{ aboveInputTokens: 1000, inputMultiplier: 2, outputMultiplier: 1 }],
    },
    contextWindow: 1_000_000_000,
  });
  const CALL_USAGE = { inputTokens: 600, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const wf2 = defineWorkflow({ name: 'tiered' }, async (ctx) =>
    ctx.agent('what time is it', { tools: [clock] }),
  );
  function tieredEngine(store: InMemoryStore): ReturnType<typeof createEngine> {
    const adapter = scriptedAdapter(
      (_req, call) =>
        call === 0
          ? { toolCall: { name: 'clock', args: {} }, usage: CALL_USAGE }
          : { text: 'noon', usage: CALL_USAGE },
      { caps: tieredCaps },
    );
    return createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
  }

  it('the live stream prices per provider request, never the phase aggregate', async () => {
    const store = new InMemoryStore();
    const handle = tieredEngine(store).run(wf2, {});
    const events = collect(handle);
    const outcome = await handle.result;
    expect(outcome.status, JSON.stringify(outcome.error ?? null)).toBe('ok');
    // The settled fold prices per request (RV504): the sanity anchor.
    expect(outcome.cost.totalUsd).toBeCloseTo(1.2, 12);

    const phaseEnds = events.filter((event) => event.type === 'agent:phase:end');
    const end = events.find((event) => event.type === 'agent:end');
    const phaseSum = phaseEnds.reduce((sum, event) => sum + event.costUsd, 0);
    expect(phaseSum).toBeCloseTo(outcome.cost.totalUsd, 12);
    expect(end?.costUsd).toBeCloseTo(outcome.cost.totalUsd, 12);
    // The new basis label: these dollars were folded per provider call.
    expect(phaseEnds.map((event) => (event as { costBasis?: string }).costBasis)).toEqual([
      'per-call',
    ]);
    expect((end as { costBasis?: string } | undefined)?.costBasis).toBe('per-call');

    const table = reduceInvocationTable(events);
    expect(table.totalCostUsd).toBeCloseTo(outcome.cost.totalUsd, 12);
    expect(table.byRole['loop']?.costUsd).toBeCloseTo(outcome.cost.byRole.loop, 12);
    expect((table.byRole['loop'] as { costBasis?: string } | undefined)?.costBasis).toBe(
      'per-call',
    );
    expect(
      table.agents[0]?.phases.map((phase) => (phase as { costBasis?: string }).costBasis),
    ).toEqual(['per-call']);
    expect((table.agents[0] as { costBasis?: string } | undefined)?.costBasis).toBe('per-call');
  });

  it('the replayed stream carries the same per-call dollars as the live one', async () => {
    const store = new InMemoryStore();
    const first = tieredEngine(store).run(wf2, {});
    const liveEvents = collect(first);
    const outcome = await first.result;
    expect(outcome.status).toBe('ok');

    const resumed = tieredEngine(store).resume(first.runId, wf2, {});
    const replayEvents = collect(resumed);
    expect((await resumed.result).status).toBe('ok');

    const replayEnd = replayEvents.find((event) => event.type === 'agent:end');
    // Pre-RV702 the replay priced the aggregate slices ($2.40); the
    // per-request fold of the SAME terminal entry says $1.20.
    expect(replayEnd?.costUsd).toBeCloseTo(outcome.cost.totalUsd, 12);
    expect((replayEnd as { costBasis?: string } | undefined)?.costBasis).toBe('per-call');
    const live = reduceInvocationTable(liveEvents);
    const replay = reduceInvocationTable(replayEvents);
    expect(replay.totalCostUsd).toBeCloseTo(live.totalCostUsd, 12);
    expect(replay.byRole).toEqual(live.byRole);
  });

  it('a restored checkpoint without call records falls back to a labeled aggregate estimate', async () => {
    // A checkpoint written before the reconciliation ledger shipped
    // restores usage slices with NO provider-call records: the per-call
    // sum cannot cover the invocation, so agent:end keeps the aggregate
    // number and says so, instead of silently dropping the restored
    // spend ($0.62 aggregate, never the $0.60 the backed calls alone
    // would claim).
    const PROMPT = 'check the weather twice';
    const lookup = tool({
      name: 'lookup',
      description: 'looks up a fact',
      parameters: {},
      execute: () => Promise.resolve({ fact: 'sunny' }),
    });
    const toolset = await resolveToolset([lookup], { runId: 'test-run' });
    const identity: IdentityInput = {
      kind: 'agent',
      agentType: '',
      modelSpec: { kind: 'model', model: 'fake:model' },
      prompt: PROMPT,
      schemaHash: EMPTY_SCHEMA_HASH,
      toolsetHash: toolset.hash,
      isolation: 'none',
    };
    const key = deriveContentKey(identity);
    const transcripts = new InMemoryTranscriptStore();
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    const checkpoint: CheckpointState = {
      v: 1,
      messages: [
        { role: 'user', parts: [{ type: 'text', text: PROMPT }] },
        {
          role: 'assistant',
          parts: [{ type: 'tool-call', id: 'id-0-0', name: 'lookup', args: {} }],
        },
        {
          role: 'tool',
          parts: [{ type: 'tool-result', id: 'id-0-0', name: 'lookup', result: { fact: 'sunny' } }],
        },
      ],
      turns: 1,
      usage: { inputTokens: 20, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 1,
      schemaAttempts: 0,
      compaction: [],
    };
    await transcripts.put(checkpointRefFor('test-run', running.seq), encodeCheckpoint(checkpoint));
    const prior = await seed.store.load('test-run');

    const adapter = scriptedAdapter(() => ({ text: 'sunny twice', usage: CALL_USAGE }));
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
      pricing: {
        pricingVersion: 'test-1',
        models: { 'fake:model': { inputUsdPerMTok: 1000, outputUsdPerMTok: 0 } },
      },
    });
    const ctx = createCtx(internals);
    const output = await ctx.agent(PROMPT, { tools: [lookup] });
    expect(output).toBe('sunny twice');
    await internals.replayer.flush();

    const end = events.ofType('agent:end')[0] as
      { costUsd?: number; costBasis?: string } | undefined;
    expect(end?.costUsd).toBeCloseTo(0.62, 12);
    expect(end?.costBasis).toBe('aggregate-estimate');
    // The live phase's delta IS fully call-backed: it keeps the honest
    // per-call label even when the invocation total cannot.
    const phaseEnd = events.ofType('agent:phase:end')[0] as { costBasis?: string } | undefined;
    expect(phaseEnd?.costBasis).toBe('per-call');
  });

  it('the reducer defaults an absent basis to aggregate-estimate, never to per-call', () => {
    const base = { runId: 'r', ts: 't', seq: 0, spanId: 's1', agentType: 'worker' };
    const usage = { inputTokens: 5, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const legacy = [
      { ...base, type: 'agent:start', model: 'fake:model', role: 'loop' },
      { ...base, type: 'agent:phase:start', role: 'loop', model: 'fake:model', invocation: 1 },
      {
        ...base,
        type: 'agent:phase:end',
        role: 'loop',
        model: 'fake:model',
        invocation: 1,
        durationMs: 1,
        usage,
        costUsd: 1,
        outcome: 'ok',
      },
      { ...base, type: 'agent:end', status: 'ok', usage, costUsd: 1, entryRef: 0 },
    ] as unknown as WorkflowEvent[];
    const table = reduceInvocationTable(legacy);
    expect(
      table.agents[0]?.phases.map((phase) => (phase as { costBasis?: string }).costBasis),
    ).toEqual(['aggregate-estimate']);
    expect((table.agents[0] as { costBasis?: string } | undefined)?.costBasis).toBe(
      'aggregate-estimate',
    );
    expect((table.byRole['loop'] as { costBasis?: string } | undefined)?.costBasis).toBe(
      'aggregate-estimate',
    );

    const labeled = legacy.map((event) =>
      event.type === 'agent:phase:end' || event.type === 'agent:end'
        ? ({ ...event, costBasis: 'per-call' } as unknown as WorkflowEvent)
        : event,
    );
    const labeledTable = reduceInvocationTable(labeled);
    expect((labeledTable.byRole['loop'] as { costBasis?: string } | undefined)?.costBasis).toBe(
      'per-call',
    );
    expect((labeledTable.agents[0] as { costBasis?: string } | undefined)?.costBasis).toBe(
      'per-call',
    );
  });
});
