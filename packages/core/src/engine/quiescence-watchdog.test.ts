/**
 * The quiescence guarantee (RV2003, the third parity rerun's terminal
 * shape). The rerun's process exited silently mid-run: the root parked
 * in an exposure wait that held nothing on the event loop, Node
 * detected an unsettled top-level await, and the journal kept a
 * forever-running root with no run_settle and no terminal. Three
 * guards close the class: the exposure wait REFs the loop while any
 * waiter is parked (budget.test.ts pins that half), and the engine
 * registers every unsettled run with a process `beforeExit` watchdog
 * that forces a stuck run through the ordinary cancel path, the
 * RV1903 barrier, run_settle, and a terminal envelope. The invariant:
 * no path ends the process while a run has no journaled terminal.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const WATCHDOG_LISTENER = 'onQuiescenceBeforeExit';
const watchdogListener = (): ((code: number) => void) | undefined =>
  process.listeners('beforeExit').find((listener) => listener.name === WATCHDOG_LISTENER);

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

describe('the quiescence watchdog (RV2003, no silent exit)', () => {
  it('forces a stuck run to a journaled terminal when the loop is about to die', async () => {
    // Deliberately the worst body: durable work first (so the journal
    // has entries to seal), then a bare promise no signal reaches.
    // The watchdog arm settles the race anyway; the settle machinery
    // then owns the barrier and the journal.
    const STUCK = defineWorkflow({ name: 'stuck' }, async (ctx) => {
      await ctx.agent('one settled call');
      await new Promise(() => undefined);
      return 'unreachable';
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [scriptedAdapter((): ScriptedTurn => ({ text: 'x' }))],
      stores: { journal: store, transcripts: new InMemoryTranscriptStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const logs: string[] = [];
    const handle = engine.run(STUCK, undefined, { runId: 'STUCK' });
    handle.on('log', (event) => {
      logs.push((event as unknown as { msg?: string }).msg ?? '');
    });
    // The listener covers the run exactly while it is unsettled.
    expect(watchdogListener()).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 20));
    // Simulate the loop draining by invoking OUR listener directly
    // (never process.emit, which would poke foreign listeners too).
    watchdogListener()?.(0);
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(outcome.error?.message).toContain('rulvar:quiescence-watchdog');
    expect(logs.some((msg) => msg.includes('quiescence watchdog'))).toBe(true);
    // The run reached a durable settle: the run_settle decision seals
    // the journal, exactly what the parity journal never got.
    const entries = await store.load('STUCK');
    expect(
      entries.some(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
      ),
    ).toBe(true);
    // The last settled run detaches the listener: idle processes keep
    // zero watchdog footprint.
    expect(watchdogListener()).toBeUndefined();
  });

  it('a run that settles normally never trips the watchdog or leaks the listener', async () => {
    const PLAIN = defineWorkflow({ name: 'plain' }, () => Promise.resolve('done'));
    const engine = createEngine({
      adapters: [scriptedAdapter((): ScriptedTurn => ({ text: 'x' }))],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(PLAIN, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('done');
    expect(watchdogListener()).toBeUndefined();
  });

  it('the parity deadlock shape ends in an exhausted terminal with a sealed journal', async () => {
    // The rerun's exact cascade, in miniature: the coordination turn
    // spends most of the cap, every spawned worker is refused drained
    // (typed, zero provider attempts), and the next coordination turn
    // drains too, so the run forced-finishes partial instead of
    // exiting silently. Every seat reaches a journaled terminal and
    // run_settle seals the roster: the one-denominator contract the
    // parity journal broke.
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) !== '') {
        return { text: 'unreachable worker' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          usage: { inputTokens: 10, outputTokens: 2000, cacheReadTokens: 0, cacheWriteTokens: 0 },
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research A' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research B' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research C' } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'unreachable' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store, transcripts: new InMemoryTranscriptStore() },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          worker: {
            description: 'the oversized worker',
            limits: { maxOutputTokensPerTurn: 10000 },
          },
        },
      },
    });
    const wf = makeOrchestratorWorkflow('the parity shape', {
      limits: { maxOutputTokensPerTurn: 2500 },
    });
    const outcome = await engine.run(wf, undefined, {
      runId: 'PARITY',
      budgetUsd: 10,
      // Fits the first coordination turn (about $0.028), never a
      // worker (about $0.101), and not the second coordination turn
      // once the first turn's $0.02 of usage lands.
      maxInFlightExposureUsd: 0.04,
    }).result;

    // Exhausted with the documented forced-finish partial, never a
    // silent exit and never a bare escape.
    expect(outcome.status).toBe('exhausted');
    const envelope = outcome.value as {
      forcedFinishFallback?: boolean;
      completion?: string;
    };
    expect(envelope.forcedFinishFallback).toBe(true);
    expect(envelope.completion).toBe('partial');

    const entries = await store.load('PARITY');
    // Three starved seats, each typed and free: the parity arm paid
    // three full research contexts for the same refusal.
    const drained = entries.filter(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'error' &&
        (entry.error?.data as { reason?: string } | undefined)?.reason === 'exposure-drained',
    );
    expect(drained).toHaveLength(3);
    const workerCalls = adapter.calls.filter((req) => agentTypeOf(req) !== '');
    expect(workerCalls).toHaveLength(0);
    // The roster is closed: every agent dispatch has a terminal.
    const runningSeqs = entries
      .filter((entry) => entry.kind === 'agent' && entry.status === 'running')
      .map((entry) => entry.seq);
    for (const seq of runningSeqs) {
      expect(
        entries.some(
          (entry) => entry.kind === 'agent' && entry.ref === seq && entry.status !== 'running',
        ),
      ).toBe(true);
    }
    // run_settle seals the journal and is the billing boundary: no
    // agent entry follows it.
    const settle = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
    );
    expect(settle).toBeDefined();
    const lastAgentSeq = Math.max(
      ...entries.filter((entry) => entry.kind === 'agent').map((entry) => entry.seq),
    );
    expect(lastAgentSeq).toBeLessThan(settle?.seq ?? -1);
    // The forced finish is journaled with its reason, the RV1902 arm.
    expect(
      entries.some(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { reason?: string } | undefined)?.reason === 'exposure-abort',
      ),
    ).toBe(true);
  });
});
