/**
 * The settle drain, the journal seal, and the single wire denominator
 * (RV1904): the four-role benchmark's recovery run kept appending child
 * terminals after run_settle, so the returned outcome, the terminal
 * invoice, the captured event stream and the final journal each
 * reported a different total. Orchestrations barrier their own roster
 * (RV1903); the engine closes the same hole for plain workflows with
 * un-awaited ctx.agent calls, seals the journal's billing lanes after
 * the settle, and lifts the ledger's wire count onto the cost report
 * and the terminal envelope, equal to the invoice cardinality on
 * ledger-covered runs by construction.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { JournalSealedError } from '../l0/errors.js';
import { costReportFromJournal } from './cost-report.js';
import { invoiceFromJournal } from './invoice.js';
import { createEngine } from './engine.js';
import { defineWorkflow, executeWorkflow } from './ctx.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { makeInternals, scriptedAdapter, testCaps, type ScriptedTurn } from './test-harness.js';

const agentTypeOf = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

describe('the settle drain for plain workflows (RV1904)', () => {
  function gatedAdapter() {
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'straggler') {
        // Never reached: the gate below blocks the stream until abort.
        return { text: 'late' };
      }
      return { text: 'root done' };
    });
  }

  it('an un-awaited ctx.agent call reaches a journaled terminal before the settle', async () => {
    const inner = gatedAdapter();
    const adapter: typeof inner = {
      ...inner,
      async *stream(req, signal) {
        if (agentTypeOf(req) === 'straggler') {
          await new Promise<void>((resolve) => {
            signal?.addEventListener('abort', () => resolve(), { once: true });
          });
          return;
        }
        yield* inner.stream(req, signal);
      },
    };
    const store = new InMemoryStore({ quiet: true });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model' },
        profiles: { straggler: { description: 'left behind' } },
      },
    });
    const wf = defineWorkflow({ name: 'fire-and-forget' }, (ctx) => {
      // Deliberately un-awaited: the body returns over a live child.
      void ctx.agent('take your time', { agentType: 'straggler' }).catch(() => undefined);
      return Promise.resolve('returned early');
    });
    const outcome = await engine.run(wf, undefined, { runId: 'drain-1', budgetUsd: 10 }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('returned early');
    const entries = await store.load('drain-1');
    const agents = entries.filter((entry) => entry.kind === 'agent' && entry.status !== 'running');
    expect(agents).toHaveLength(1);
    expect(agents[0]?.status).toBe('cancelled');
    // The settle decision lands strictly after the straggler's terminal.
    const settle = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
    );
    expect(settle).toBeDefined();
    expect(agents[0].seq).toBeLessThan(settle!.seq);
    // The envelope carries the ledger's wire denominator.
    expect(outcome.envelope.wireRequests).toBe(outcome.cost.wireRequests);
  });

  it('the settled fold, the invoice, and the envelope share one denominator', async () => {
    const adapter = scriptedAdapter((): ScriptedTurn => ({ text: 'worked' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { helper: { description: 'a priced helper' } },
      budgetUsd: 10,
    });
    const wf = defineWorkflow({ name: 'two-agents' }, async (ctx) => {
      await ctx.agent('first', { agentType: 'helper' });
      await ctx.agent('second', { agentType: 'helper' });
      return 'both done';
    });
    await executeWorkflow(internals, wf, undefined);
    const entries = await store.load('test-run');
    const priceUsd = (
      servedBy: `${string}:${string}`,
      usage: { inputTokens: number; outputTokens: number },
    ) => {
      const pricing = testCaps().pricing;
      if (pricing === undefined) {
        return undefined;
      }
      return (
        (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
        (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok
      );
    };
    const report = costReportFromJournal(entries, priceUsd);
    const invoice = invoiceFromJournal(entries, priceUsd);
    expect(report.wireRequests).toBe(2);
    expect(invoice.cardinality.wireRequests).toBe(report.wireRequests);
    expect(invoice.totalUsd).toBeCloseTo(report.grossUsd, 10);
  });

  it('absorbed continuations count per wire, matching the invoice cardinality', () => {
    const base = {
      hashVersion: 2,
      scope: 'agent:0',
      key: 'k1',
      spanId: 's1',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:00:01.000Z',
    };
    const entries: JournalEntry[] = [
      {
        ...base,
        seq: 0,
        ordinal: 0,
        kind: 'agent',
        status: 'ok',
        servedBy: 'fake:model',
        usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
        providerCalls: [
          {
            ordinal: 1,
            servedBy: 'fake:model',
            role: 'loop',
            attempt: 1,
            outcome: 'ok',
            responseId: 'r1',
            usage: { inputTokens: 60, outputTokens: 30, cacheReadTokens: 0, cacheWriteTokens: 0 },
            // One row, three provider HTTP requests (RV905/RV1210).
            wireRequests: 3,
          },
          {
            ordinal: 2,
            servedBy: 'fake:model',
            role: 'loop',
            attempt: 1,
            outcome: 'ok',
            responseId: 'r2',
            usage: { inputTokens: 40, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 },
          },
        ],
      } as unknown as JournalEntry,
    ];
    const priceUsd = () => 0.001;
    const report = costReportFromJournal(entries, priceUsd);
    const invoice = invoiceFromJournal(entries, priceUsd);
    expect(report.wireRequests).toBe(4);
    expect(invoice.cardinality.wireRequests).toBe(4);
  });
});

describe('the journal seal (RV1904)', () => {
  it('a billing-lane append after the seal rejects typed; the ref-entry lane stays open', async () => {
    const { internals } = makeInternals({});
    const running = await internals.replayer.appendRunning({
      scope: 'agent:0',
      key: 'seal-probe',
      kind: 'agent',
      spanId: 's1',
    });
    await internals.replayer.appendTerminal(running.seq, { status: 'ok' });
    internals.replayer.seal();
    await expect(
      internals.replayer.appendSinglePhase({
        scope: '',
        key: 'late',
        kind: 'decision',
        status: 'ok',
        spanId: 's1',
        value: { decisionType: 'late-write' },
      }),
    ).rejects.toThrow(JournalSealedError);
    await expect(internals.replayer.appendTerminal(running.seq, { status: 'ok' })).rejects.toThrow(
      JournalSealedError,
    );
    // The sanctioned detached lane: a resolution answers a suspension
    // even after the settle, by contract.
    await expect(
      internals.replayer.appendRefEntry({
        kind: 'resolution',
        ref: running.seq,
        scope: 'agent:0',
        spanId: 's1',
        resolution: { target: running.seq, by: 'operator', value: { approved: true } },
      }),
    ).resolves.toMatchObject({ kind: 'resolution' });
  });
});
