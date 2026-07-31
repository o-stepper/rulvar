/**
 * The unified terminal envelope (RV1105, the P1-5 arc): one exported
 * shape carrying every terminal fact (status, the typed error, the
 * completion claim, settled + settledReason, the cost totals with the
 * per-model split, usage, run identity, the agent counter), assembled
 * by ONE producer at the settlement chokepoint and mirrored verbatim
 * onto the outcome and the run:end event, so an SDK consumer, an
 * event-only consumer, and an HTTP consumer read the SAME facts
 * without assembling pieces. Nothing existing is renamed: the
 * envelope is an assembly over the fields that were already there.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import { LeaseHeldError, SettlementError, SupersededError } from '../l0/errors.js';
import type { RunMeta } from '../l0/spi/store.js';
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter } from './test-harness.js';
import { terminalEnvelopeOf } from './terminal-envelope.js';

const isSettleEntry = (e: JournalEntry): boolean =>
  (e.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle';

/** Rejects BOTH settlement writes with the fencing rejection while armed. */
class SupersededSegmentStore extends InMemoryStore {
  armed = true;

  override append(runId: string, e: JournalEntry): Promise<void> {
    if (this.armed && isSettleEntry(e)) {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.append(runId, e);
  }

  override putMeta(m: RunMeta): Promise<void> {
    if (this.armed && m.status !== 'running' && m.status !== 'suspended') {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.putMeta(m);
  }
}

/** Fails the run_settle journal append while armed. */
class SettleAppendOutageStore extends InMemoryStore {
  armed = true;

  override append(runId: string, e: JournalEntry): Promise<void> {
    if (this.armed && isSettleEntry(e)) {
      return Promise.reject(new Error('injected outage: run_settle append failed'));
    }
    return super.append(runId, e);
  }
}

const PRICING = {
  pricingVersion: 'envelope-test-v1',
  models: { 'fake:m1': { inputUsdPerMTok: 10, outputUsdPerMTok: 50 } },
};

describe('the terminal envelope (RV1105)', () => {
  it('one settled ok terminal assembles the envelope on the outcome and run:end alike', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'done',
      finish: 'stop',
      usage: { inputTokens: 100_000, outputTokens: 10_000 },
    }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: new InMemoryStore() },
      pricing: PRICING,
    });
    const wf = defineWorkflow({ name: 'envelope-demo' }, async (ctx) => {
      await ctx.agent('go');
      await ctx.agent('again');
      return 'done';
    });
    const handle = engine.run(wf, undefined, {});
    let runEndEnvelope: TerminalEnvelope | undefined;
    handle.on('run:end', (event) => {
      runEndEnvelope = event.envelope;
    });
    const outcome = await handle.result;
    // The envelope is the outcome's own facts, assembled once.
    expect(outcome.envelope.runId).toBe(handle.runId);
    expect(outcome.envelope.workflow).toBe('envelope-demo');
    expect(outcome.envelope.status).toBe('ok');
    expect(outcome.envelope.settled).toBe(true);
    expect(outcome.envelope.totalUsd).toBe(outcome.cost.totalUsd);
    expect(outcome.envelope.totalUsd).toBe(3);
    expect(outcome.envelope.grossUsd).toBe(outcome.cost.grossUsd);
    expect(outcome.envelope.costByModel).toEqual(outcome.cost.byModel);
    expect(outcome.envelope.usage).toEqual(outcome.usage);
    expect(outcome.envelope.usageApprox).toBe(false);
    expect(outcome.envelope.agentsSpawned).toBe(2);
    expect('error' in outcome.envelope).toBe(false);
    expect('completion' in outcome.envelope).toBe(false);
    expect('settledReason' in outcome.envelope).toBe(false);
    // The event mirror is the SAME set of facts, not a re-derivation.
    expect(runEndEnvelope).toEqual(outcome.envelope);
  });

  it('an error terminal carries the typed error inside the envelope', async () => {
    const adapter = scriptedAdapter(() => ({
      error: {
        code: 'agent',
        message: 'scripted terminal failure',
        retryable: false,
        data: { kind: 'terminal' },
      },
    }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: new InMemoryStore() },
    });
    const wf = defineWorkflow({ name: 'envelope-error' }, async (ctx) => {
      await ctx.agent('go');
      return 'unreachable';
    });
    const handle = engine.run(wf, undefined, {});
    let runEndEnvelope: TerminalEnvelope | undefined;
    handle.on('run:end', (event) => {
      runEndEnvelope = event.envelope;
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('error');
    expect(outcome.envelope.status).toBe('error');
    expect(outcome.envelope.error).toEqual(outcome.error);
    expect(outcome.envelope.error?.message).toContain('scripted terminal failure');
    expect(outcome.envelope.settled).toBe(true);
    expect(runEndEnvelope).toEqual(outcome.envelope);
  });

  it('an exhausted terminal keeps the envelope beside the ceiling facts', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'expensive',
      finish: 'stop',
      usage: { inputTokens: 500_000, outputTokens: 0 },
    }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: new InMemoryStore() },
      pricing: PRICING,
    });
    const wf = defineWorkflow({ name: 'envelope-exhausted' }, async (ctx) => {
      await ctx.agent('go', { estCost: 0 });
      return 'done';
    });
    const outcome = await engine.run(wf, undefined, { budgetUsd: 4 }).result;
    expect(outcome.status).toBe('exhausted');
    expect(outcome.envelope.status).toBe('exhausted');
    expect(outcome.envelope.totalUsd).toBe(5);
    expect(outcome.envelope.settled).toBe(true);
  });

  it('a cancelled run assembles the envelope with status cancelled', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop', hangMs: 5_000 }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: new InMemoryStore() },
    });
    const wf = defineWorkflow({ name: 'envelope-cancelled' }, async (ctx) => {
      await ctx.agent('go');
      return 'done';
    });
    const handle = engine.run(wf, undefined, {});
    await handle.cancel('host asked');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(outcome.envelope.status).toBe('cancelled');
    expect(outcome.envelope.settled).toBe(true);
    expect(outcome.envelope.workflow).toBe('envelope-cancelled');
  });

  it('a superseded segment refuses green inside the envelope too (RV1009)', async () => {
    const store = new SupersededSegmentStore();
    const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: store },
    });
    const wf = defineWorkflow({ name: 'envelope-superseded' }, async (ctx) => {
      await ctx.agent('go');
      return 'done';
    });
    const handle = engine.run(wf, undefined, {});
    let runEndEnvelope: TerminalEnvelope | undefined;
    handle.on('run:end', (event) => {
      runEndEnvelope = event.envelope;
    });
    await expect(handle.result).rejects.toBeInstanceOf(SupersededError);
    // The event-only consumer reads the refusal from the envelope
    // itself: the computed status stays, settled refuses green with
    // the distinct reason.
    expect(runEndEnvelope?.status).toBe('ok');
    expect(runEndEnvelope?.settled).toBe(false);
    expect(runEndEnvelope?.settledReason).toBe('superseded');
  });

  it('a failed settlement write stamps settled false with no reason (RV907)', async () => {
    const store = new SettleAppendOutageStore();
    const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: store },
    });
    const wf = defineWorkflow({ name: 'envelope-outage' }, async (ctx) => {
      await ctx.agent('go');
      return 'done';
    });
    const handle = engine.run(wf, undefined, {});
    let runEndEnvelope: TerminalEnvelope | undefined;
    handle.on('run:end', (event) => {
      runEndEnvelope = event.envelope;
    });
    await expect(handle.result).rejects.toBeInstanceOf(SettlementError);
    expect(runEndEnvelope?.settled).toBe(false);
    expect(runEndEnvelope === undefined || 'settledReason' in runEndEnvelope).toBe(false);
  });
});

describe('terminalEnvelopeOf (RV1105)', () => {
  const outcomeFacts = {
    status: 'ok' as const,
    usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
    cost: {
      totalUsd: 1.25,
      grossUsd: 1.5,
      byModel: { 'fake:m1': 1.25 },
    },
  };

  it('assembles settled true by default and normalizes usageApprox to a boolean', () => {
    const envelope = terminalEnvelopeOf({
      runId: 'r-1',
      workflow: 'wf',
      outcome: outcomeFacts,
      agentsSpawned: 3,
    });
    expect(envelope).toEqual({
      runId: 'r-1',
      workflow: 'wf',
      status: 'ok',
      settled: true,
      totalUsd: 1.25,
      grossUsd: 1.5,
      costByModel: { 'fake:m1': 1.25 },
      usage: outcomeFacts.usage,
      usageApprox: false,
      agentsSpawned: 3,
    });
  });

  it('detaches the per-model split from the cost report it was read from', () => {
    const cost = { ...outcomeFacts.cost, byModel: { 'fake:m1': 1.25 } };
    const envelope = terminalEnvelopeOf({
      runId: 'r-2',
      workflow: 'wf',
      outcome: { ...outcomeFacts, cost },
      agentsSpawned: 0,
    });
    envelope.costByModel['fake:m1'] = 999;
    expect(cost.byModel['fake:m1']).toBe(1.25);
  });

  it('carries the refusal facts when the settlement did not hold', () => {
    const plain = terminalEnvelopeOf({
      runId: 'r-3',
      workflow: 'wf',
      outcome: outcomeFacts,
      agentsSpawned: 0,
      settlement: {},
    });
    expect(plain.settled).toBe(false);
    expect('settledReason' in plain).toBe(false);
    const superseded = terminalEnvelopeOf({
      runId: 'r-3',
      workflow: 'wf',
      outcome: outcomeFacts,
      agentsSpawned: 0,
      settlement: { settledReason: 'superseded' },
    });
    expect(superseded.settled).toBe(false);
    expect(superseded.settledReason).toBe('superseded');
  });

  it('spreads the typed error and the completion claim only when present', () => {
    const envelope = terminalEnvelopeOf({
      runId: 'r-4',
      workflow: 'wf',
      outcome: {
        ...outcomeFacts,
        status: 'error',
        error: { code: 'agent', message: 'boom', retryable: false },
        completion: 'rejected',
      },
      agentsSpawned: 1,
    });
    expect(envelope.error?.code).toBe('agent');
    expect(envelope.completion).toBe('rejected');
    expect(envelope.usageApprox).toBe(false);
  });
});
