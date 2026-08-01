/**
 * pause_turn continuations as accounted wire units (RV905, the
 * thirteenth experiment's fifth release risk). An adapter may absorb
 * provider-side continuations, making up to several wire requests
 * inside ONE core dispatch; before this shipped, the request quota
 * window, the provider call record, and the invoice row all saw one.
 * The adapter now reports the segment set on the finish metadata
 * (`providerMetadata[<adapter>].wireRequests = { count, responseIds }`),
 * the record and the invoice row carry every segment id, and the
 * quota reconciliation settles the reservation against the TRUE wire
 * request count so the window reflects what the provider metered.
 */
import { describe, expect, it } from 'vitest';

import { memoryQuotaLimiter } from '../model/quota.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { invoiceFromJournal } from './invoice.js';
import { scriptedAdapter } from './test-harness.js';

const USAGE = { inputTokens: 900, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 };
const echo = defineWorkflow({ name: 'wire-units' }, async (ctx) => await ctx.agent('hi'));

function segmentedAdapter() {
  return scriptedAdapter(() => ({
    text: 'done',
    usage: USAGE,
    providerMetadata: {
      fake: {
        responseId: 'msg-3',
        wireRequests: { count: 3, responseIds: ['msg-1', 'msg-2', 'msg-3'] },
      },
    },
  }));
}

describe('pause_turn continuations as accounted wire units (RV905)', () => {
  it('journals the segment ids on the provider call record and the invoice row', async () => {
    const store = new InMemoryStore();
    const adapter = segmentedAdapter();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(echo, undefined, { runId: 'WU1' }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('WU1');
    const record = entries
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    expect(record?.responseId).toBe('msg-3');
    expect(record?.wireResponseIds).toEqual(['msg-1', 'msg-2', 'msg-3']);
    const invoice = invoiceFromJournal(entries, () => undefined);
    const row = invoice.rows.at(0);
    expect(row?.responseId).toBe('msg-3');
    expect(row?.wireResponseIds).toEqual(['msg-1', 'msg-2', 'msg-3']);
  });

  it('settles the request window against every wire call, not one per dispatch', async () => {
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 100 }]);
    const adapter = segmentedAdapter();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
      quota: { limiter },
    });
    const outcome = await engine.run(echo, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    // One dispatch, three wire requests: a window that keeps reading 1
    // lets a pause_turn-heavy workload overrun the provider's RPM cap
    // by the continuation factor.
    expect(limiter.snapshot().at(0)?.requests).toBe(3);
  });

  it('a single-wire dispatch carries no segment ids and settles one request', async () => {
    const limiter = memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 100 }]);
    const store = new InMemoryStore();
    const adapter = scriptedAdapter(() => ({
      text: 'done',
      usage: USAGE,
      providerMetadata: { fake: { responseId: 'msg-only' } },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
      quota: { limiter },
    });
    const outcome = await engine.run(echo, undefined, { runId: 'WU2' }).result;
    expect(outcome.status).toBe('ok');
    const record = (await store.load('WU2'))
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    expect(record?.responseId).toBe('msg-only');
    expect(record !== undefined && 'wireResponseIds' in record).toBe(false);
    expect(limiter.snapshot().at(0)?.requests).toBe(1);
  });
});

describe('logical dispatches versus provider wire requests (RV1210)', () => {
  it('records the reported wire count even where the provider named fewer ids', async () => {
    const store = new InMemoryStore();
    // Three wire requests, two ids: the provider left one segment
    // unnamed. Counting the ids alone understates the cardinality by
    // exactly the segments the provider did not name, and the quota
    // window (which reads `count`) and the invoice then disagree.
    const adapter = scriptedAdapter(() => ({
      text: 'done',
      usage: USAGE,
      providerMetadata: {
        fake: {
          responseId: 'msg-3',
          wireRequests: { count: 3, responseIds: ['msg-1', 'msg-3'] },
        },
      },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    expect((await engine.run(echo, undefined, { runId: 'WU3' }).result).status).toBe('ok');
    const entries = await store.load('WU3');
    const record = entries
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    expect(record?.wireRequests).toBe(3);
    expect(record?.wireResponseIds).toEqual(['msg-1', 'msg-3']);
    const invoice = invoiceFromJournal(entries, () => undefined);
    expect(invoice.rows.at(0)?.wireRequests).toBe(3);
    // The export states the cardinality instead of leaving a host to
    // discover it as a row-count mismatch against the statement.
    expect(invoice.cardinality).toEqual({
      dispatchRows: 1,
      wireRequests: 3,
      multiWireRows: 1,
      wireIdsMissing: 1,
    });
  });

  it('a single-wire run declares one dispatch per wire request and no missing ids', async () => {
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'done', usage: USAGE }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    expect((await engine.run(echo, undefined, { runId: 'WU4' }).result).status).toBe('ok');
    const entries = await store.load('WU4');
    const record = entries
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    // Single-wire dispatches stay byte identical: the count rides the
    // record only where an absorption made it differ from one.
    expect(record !== undefined && 'wireRequests' in record).toBe(false);
    const invoice = invoiceFromJournal(entries, () => undefined);
    expect(invoice.rows.at(0) !== undefined && 'wireRequests' in invoice.rows[0]).toBe(false);
    expect(invoice.cardinality).toEqual({
      dispatchRows: 1,
      wireRequests: 1,
      multiWireRows: 0,
      wireIdsMissing: 0,
    });
  });
});
