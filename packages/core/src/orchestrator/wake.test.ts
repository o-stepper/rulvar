import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';
import type { WakeDigest } from './wake.js';

function agentTypeOf(req: ChatRequest): string {
  const lurker = (req.providerOptions as { lurker?: { agentType?: string } } | undefined)?.lurker;
  return lurker?.agentType ?? '';
}

/** The last tool message's JSON, where digests arrive. */
function lastToolJson(req: ChatRequest): string {
  return JSON.stringify(req.messages.at(-1)?.parts ?? []);
}

function wakeResolutions(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => e.kind === 'resolution');
}

const PROFILES = { worker: { description: 'does one task' } };
const ROUTING = { loop: 'fake:model', orchestrate: 'fake:model' } as const;

describe('wait_for_events and WakeDigest (M6-T09)', () => {
  it('wakes on quiescence with digests coalesced in spawn-ordinal order', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const text = JSON.stringify(req.messages[0]?.parts);
        // The FIRST spawn settles LAST: ordinal order must win anyway.
        return text.includes('alpha') ? { text: 'alpha done', hangMs: 60 } : { text: 'beta done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'alpha task' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'beta task' } },
            { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'woke' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('woke');

    const entries = await store.load('test-run');
    const resolutions = wakeResolutions(entries);
    expect(resolutions.length).toBeGreaterThanOrEqual(1);
    const digest = resolutions[0]?.resolution?.value as unknown as WakeDigest;
    expect(digest.digestSeq).toBe(1);
    expect(digest.coversToOrdinal).toBe(1);
    // Ordinal order despite reversed settlement order.
    expect(digest.completedDigests.map((d) => d.outputSummary)).toEqual([
      'alpha done',
      'beta done',
    ]);
    expect(resolutions[0]?.resolution?.by).toBe('quiescence');
    // The orchestrator saw the digest as the tool result.
    const wokenTurn = adapter.calls.filter((r) => agentTypeOf(r) === '')[1];
    expect(lastToolJson(wokenTurn ?? adapter.calls[0])).toContain('alpha done');
  });

  it('fails immediately with a typed error when a requested trigger can never fire', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        // No run ceiling: budget_threshold is a dead trigger.
        return {
          toolCall: {
            name: 'wait_for_events',
            args: { triggers: [{ kind: 'budget_threshold', percent: 50 }] },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'recovered' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('recovered');
    const secondTurn = adapter.calls.filter((r) => agentTypeOf(r) === '')[1];
    expect(lastToolJson(secondTurn ?? adapter.calls[0])).toContain('can never fire');
  });

  it('rejects child_terminal over unknown handles with a typed tool error', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'wait_for_events',
            args: { triggers: [{ kind: 'child_terminal', handles: [999] }] },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'ok' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('ok');
    const secondTurn = adapter.calls.filter((r) => agentTypeOf(r) === '')[1];
    expect(lastToolJson(secondTurn ?? adapter.calls[0])).toContain('unknown handle');
  });

  it('fires budget_threshold when spend crosses the fixed percent', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        // 1M input tokens at 1 USD/MTok = 1 USD per child (testCaps).
        return { text: 'expensive', usage: { inputTokens: 1_000_000, outputTokens: 0 } };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'burn budget' } },
            {
              name: 'wait_for_events',
              args: { triggers: [{ kind: 'budget_threshold', percent: 50 }] },
            },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'thresholded' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
      budgetUsd: 1.5,
      flatReserveUsd: 0,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('thresholded');
    const entries = await store.load('test-run');
    const bys = wakeResolutions(entries).map((e) => e.resolution?.by);
    expect(bys).toContain('engine_fallback');
  });

  it('journals losing simultaneous triggers as noop attempts (first wins)', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done fast' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'one task' } },
            {
              name: 'wait_for_events',
              args: {
                // Both become ready on the SAME settlement: the child is
                // the last live one, so child_terminal and quiescence
                // fire together.
                triggers: [{ kind: 'child_terminal' }, { kind: 'quiescence' }],
              },
            },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'raced' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('raced');

    const entries = await store.load('test-run');
    const resolutions = wakeResolutions(entries);
    // One applied plus one journaled noop attempt over the same target.
    expect(resolutions).toHaveLength(2);
    expect(resolutions[0]?.ref).toBe(resolutions[1]?.ref);
    const state = internals.replayer.suspensionState(resolutions[0]?.ref ?? 0);
    expect(state.state).toBe('resolved');
  });

  it('re-delivers the pinned digest bytes on resume without rebuilding', async () => {
    const transcripts = new (await import('../stores/inmemory.js')).InMemoryTranscriptStore();
    let orchTurn = 0;
    const adapter1 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'paid work' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'the task' } },
            { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
          ],
        };
      }
      // The turn AFTER the wake dies: the wake resolution is journaled,
      // the orchestrator terminal is not.
      return { error: { code: 'agent', message: 'simulated crash', retryable: false } };
    });
    const phase1 = makeInternals({
      adapters: [adapter1],
      routing: ROUTING,
      profiles: PROFILES,
      transcripts,
    });
    const wf = makeOrchestratorWorkflow('crashy wake', {});
    await expect(executeWorkflow(phase1.internals, wf, undefined)).rejects.toThrow(
      /terminated with status 'error'/,
    );
    const phase1Entries = await phase1.store.load('test-run');
    const digest1 = wakeResolutions(phase1Entries)[0]?.resolution?.value;
    const orchestratorTerminal = phase1Entries.find(
      (e) =>
        e.kind === 'agent' &&
        !e.scope.startsWith('agent:') &&
        e.status !== 'running' &&
        e.status !== 'suspended',
    );
    const priorEntries = phase1Entries.filter((e) => e.seq < (orchestratorTerminal?.seq ?? 0));

    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        throw new Error('a child was re-paid on resume');
      }
      // The restored transcript already carries the wake digest; the
      // model just finishes.
      return { toolCall: { name: 'finish', args: { result: 'resumed' } } };
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: ROUTING,
      profiles: PROFILES,
      priorEntries,
      store: phase1.store,
      transcripts,
    });
    await expect(executeWorkflow(phase2.internals, wf, undefined)).resolves.toBe('resumed');
    const finalEntries = await phase1.store.load('test-run');
    // The digest was NOT rebuilt: still exactly the phase-1 resolution.
    const digests = wakeResolutions(finalEntries);
    expect(digests).toHaveLength(1);
    expect(digests[0]?.resolution?.value).toEqual(digest1);
    expect(adapter2.calls.filter((r) => agentTypeOf(r) === 'worker')).toHaveLength(0);
  });
});

describe('ctx.brief (M6-T10)', () => {
  it('journals one summarize-role agent entry and replays it free', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'the distilled brief' }));
    const transcripts = new (await import('../stores/inmemory.js')).InMemoryTranscriptStore();
    const { internals, store, events } = makeInternals({
      adapters: [adapter],
      routing: { summarize: 'fake:model' },
      transcripts,
    });
    const { defineWorkflow } = await import('../engine/ctx.js');
    const wf = defineWorkflow({ name: 'briefing' }, async (ctx) => {
      return ctx.brief({ content: 'a long transcript of prior work' });
    });
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('the distilled brief');
    expect(adapter.calls).toHaveLength(1);
    const starts = events.ofType('agent:start');
    expect(starts[0]).toMatchObject({ role: 'summarize' });
    const entries = await store.load('test-run');
    expect(entries.filter((e) => e.kind === 'agent' && e.status === 'ok')).toHaveLength(1);

    // Resume: the brief replays without a live call.
    const priorEntries = [...(await store.load('test-run'))];
    const adapter2 = scriptedAdapter(() => {
      throw new Error('brief was re-paid on replay');
    });
    const resumed = makeInternals({
      adapters: [adapter2],
      routing: { summarize: 'fake:model' },
      priorEntries,
      store,
      transcripts,
    });
    await expect(executeWorkflow(resumed.internals, wf, undefined)).resolves.toBe(
      'the distilled brief',
    );
    expect(adapter2.calls).toHaveLength(0);
  });

  it('honors the instruction and resolves via the explicit model when unrouted', async () => {
    const adapter = scriptedAdapter((req) => {
      const text = JSON.stringify(req.messages[0]?.parts);
      return { text: text.includes('THREE WORDS MAX') ? 'tiny brief here' : 'wrong prompt' };
    });
    const { internals } = makeInternals({ adapters: [adapter] });
    const { defineWorkflow } = await import('../engine/ctx.js');
    const wf = defineWorkflow({ name: 'briefing' }, (ctx) =>
      ctx.brief({
        content: 'context',
        instruction: 'THREE WORDS MAX',
        model: 'fake:model',
      }),
    );
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('tiny brief here');
  });
});
