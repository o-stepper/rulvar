/**
 * Incremental billing journaling (RV2008, the third parity rerun's
 * unjournaled root dispatches). ProviderCallRecords rode ONLY the
 * terminal agent entry, so when the parity process died with the root
 * still running, ~$0.99 of its dispatches existed nowhere durable:
 * the live ledger read $4.467 while the journal folded $3.478. Every
 * record now journals as its wire call settles (a decision row keyed
 * by the dispatch seq and the record ordinal), the terminal still
 * carries the canonical set, and the crash window shrinks to the one
 * in-flight turn.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { invoiceFromJournal } from './invoice.js';
import { scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const echo = tool({
  name: 'echo',
  description: 'echoes its input back',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { value: { type: 'string' } },
  },
  execute: (input) => Promise.resolve(input),
});

const PRICE = (servedBy: string, usage: { inputTokens: number; outputTokens: number }) =>
  servedBy === 'fake:model' ? usage.inputTokens * 1e-6 + usage.outputTokens * 1e-5 : undefined;

function providerCallDecisions(
  entries: ReadonlyArray<{ kind: string; value?: unknown }>,
): Array<{ agentRef?: number; record?: { ordinal?: number; usage?: { outputTokens: number } } }> {
  return entries
    .filter((entry) => entry.kind === 'decision')
    .map((entry) => entry.value as { decisionType?: string })
    .filter((value) => value.decisionType === 'provider-call') as Array<{
    agentRef?: number;
    record?: { ordinal?: number; usage?: { outputTokens: number } };
  }>;
}

describe('incremental billing rows (RV2008)', () => {
  it('rows land as their calls settle, and the crash window preserves them', async () => {
    let releaseSecondTurn: () => void = () => {};
    const secondTurnGate = new Promise<void>((resolve) => {
      releaseSecondTurn = resolve;
    });
    let midFlight: ReadonlyArray<{ kind: string; seq: number; value?: unknown }> = [];
    const store = new InMemoryStore();
    const adapter = scriptedAdapter((req: ChatRequest, call: number): ScriptedTurn => {
      void req;
      if (call === 0) {
        return {
          toolCall: { name: 'echo', args: { value: 'ping' } },
          usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      }
      return {
        text: 'done',
        usage: { inputTokens: 300, outputTokens: 70, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    });
    const gated: typeof adapter = {
      ...adapter,
      async *stream(req, signal) {
        if (adapter.calls.length === 1) {
          // The second dispatch parks until the test has snapshotted
          // the journal: the crash window, frozen.
          await secondTurnGate;
        }
        yield* adapter.stream(req, signal);
      },
    };
    const engine = createEngine({
      adapters: [gated],
      stores: { journal: store, transcripts: new InMemoryTranscriptStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'billed' }, async (ctx) => {
      const result = await ctx.agent('use the echo tool once, then stop', {
        tools: [echo],
        result: 'full',
      });
      return result.status;
    });
    const handle = engine.run(wf, undefined, { runId: 'BILLED' });
    // Wait until the first turn's row is durable while the agent still
    // runs, then snapshot: this is exactly what a kill -9 would leave.
    let spins = 0;
    for (;;) {
      midFlight = await store.load('BILLED');
      if (providerCallDecisions(midFlight).length >= 1) {
        break;
      }
      spins += 1;
      expect(spins).toBeLessThan(2000);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const midRows = providerCallDecisions(midFlight);
    expect(midRows).toHaveLength(1);
    expect(midRows[0]?.record?.ordinal).toBe(1);
    // The agent has NO terminal yet: pre-RV2008 this journal carried
    // no billing at all for the invocation.
    const agentTerminals = midFlight.filter(
      (entry) => entry.kind === 'agent' && (entry as { status?: string }).status !== 'running',
    );
    expect(agentTerminals).toHaveLength(0);

    // The partial fold prices the preserved row: the invoice's
    // unsettled lane carries the first turn's exact money, the
    // ~$0.99-class recovery the parity journal lacked.
    const partial = invoiceFromJournal(midFlight as never, (servedBy, usage) =>
      PRICE(servedBy, usage),
    );
    expect(partial.unsettled).toBeDefined();
    expect(partial.unsettled?.wireRequests).toBe(1);
    expect(partial.unsettled?.usd).toBeCloseTo(100e-6 + 50 * 1e-5, 10);

    releaseSecondTurn();
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const settled = await store.load('BILLED');
    // The terminal set and the incremental rows agree: two calls each.
    const terminal = settled.find((entry) => entry.kind === 'agent' && entry.status !== 'running');
    expect(terminal?.providerCalls).toHaveLength(2);
    expect(providerCallDecisions(settled)).toHaveLength(2);
    // The settled invoice carries no unsettled lane: the roster closed.
    const full = invoiceFromJournal(settled, (servedBy, usage) => PRICE(servedBy, usage));
    expect(full.unsettled).toBeUndefined();
  });

  it('a replayed segment appends no duplicate rows', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const crash = { now: true };
    const wf = defineWorkflow({ name: 'twice' }, async (ctx) => {
      const first = await ctx.agent('one call');
      if (crash.now) {
        throw new Error('host crash after the first call');
      }
      const second = await ctx.agent('another call');
      return { first: first !== null, second: second !== null };
    });
    const make = () =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'x' }))],
        stores: { journal: store, transcripts },
        defaults: { routing: { loop: 'fake:model' } },
      });
    const first = await make().run(wf, undefined, { runId: 'TWICE' }).result;
    expect(first.status).toBe('error');
    const afterCrash = providerCallDecisions(await store.load('TWICE')).length;
    expect(afterCrash).toBe(1);

    crash.now = false;
    const resumed = await make().resume('TWICE', wf).result;
    expect(resumed.status).toBe('ok');
    const rows = providerCallDecisions(await store.load('TWICE'));
    // The replayed first call minted NO second row; the live second
    // call minted exactly one.
    expect(rows).toHaveLength(2);
  });

  it('the awaited posture lands each receipt before the loop proceeds (RV3405)', async () => {
    // The RV2008 append is fire and forget, so the receipt most likely
    // to lose the race with a crash is exactly the wire being paid for
    // at the moment of death. Under defaults.billingReceipts 'awaited'
    // the loop awaits the settled append before the next dispatch: the
    // order log must show the first turn's receipt durable BEFORE the
    // second wire opens.
    class SlowReceiptStore extends InMemoryStore {
      readonly order: string[] = [];

      override async append(runId: string, entry: Parameters<InMemoryStore['append']>[1]) {
        const key = (entry as { key?: string }).key ?? '';
        if (entry.kind === 'decision' && key.startsWith('pc:')) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          this.order.push('receipt');
        }
        await super.append(runId, entry);
      }
    }
    const run = async (billingReceipts: 'async' | 'awaited') => {
      const store = new SlowReceiptStore();
      const adapter = scriptedAdapter((req: ChatRequest, call: number): ScriptedTurn => {
        void req;
        return call === 0
          ? { toolCall: { name: 'echo', args: { value: 'ping' } } }
          : { text: 'done' };
      });
      const logged: typeof adapter = {
        ...adapter,
        async *stream(req, signal) {
          store.order.push(`wire:${String(adapter.calls.length)}`);
          yield* adapter.stream(req, signal);
        },
      };
      const engine = createEngine({
        adapters: [logged],
        stores: { journal: store, transcripts: new InMemoryTranscriptStore() },
        defaults: { routing: { loop: 'fake:model' }, billingReceipts },
      });
      const wf = defineWorkflow({ name: `receipts-${billingReceipts}` }, async (ctx) => {
        const result = await ctx.agent('use the echo tool once, then stop', {
          tools: [echo],
          result: 'full',
        });
        return result.status;
      });
      const outcome = await engine.run(wf, undefined, {
        runId: `RECEIPTS-${billingReceipts}`,
      }).result;
      expect(outcome.status).toBe('ok');
      const journalRows = providerCallDecisions(await store.load(`RECEIPTS-${billingReceipts}`));
      expect(journalRows).toHaveLength(2);
      return store.order;
    };
    const awaited = await run('awaited');
    // Both receipts landed strictly before the NEXT wire opened.
    expect(awaited.indexOf('receipt')).toBeGreaterThan(awaited.indexOf('wire:0'));
    expect(awaited.indexOf('receipt')).toBeLessThan(awaited.indexOf('wire:1'));
    // The default posture stays fire and forget: both receipts still
    // land (the RV2008 durability), no ordering promised or asserted.
    const async = await run('async');
    expect(async.filter((item) => item === 'receipt')).toHaveLength(2);
  });
});
