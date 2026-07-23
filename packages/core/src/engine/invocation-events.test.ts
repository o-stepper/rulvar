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
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

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
