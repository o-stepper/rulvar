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

import type { JournalEntry } from '../l0/entries.js';
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
      adapters: [
        scriptedAdapter(() => ({
          text: 'done',
          usage: USAGE,
          providerMetadata: { fake: { responseId: 'msg-only' } },
        })),
      ],
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

describe('single-wire join coverage (RV1410)', () => {
  it('a single-wire request with no recorded response id counts as a missing join key', async () => {
    const store = new InMemoryStore();
    // The adapter surfaced no response id at all: the run's one wire
    // request has no join key against a per-request statement. Counting
    // missing ids only inside multi-wire rows read this run as fully
    // joined (`wireIdsMissing: 0`) while its row-level verdict said
    // missing-provider-id: the aggregate contradicted its own rows.
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'done', usage: USAGE }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    expect((await engine.run(echo, undefined, { runId: 'WU5' }).result).status).toBe('ok');
    const invoice = invoiceFromJournal(await store.load('WU5'), () => undefined);
    expect(invoice.rows.at(0)?.reconciliation).toBe('missing-provider-id');
    expect(invoice.reconciliationFailures).toBe(1);
    expect(invoice.cardinality).toEqual({
      dispatchRows: 1,
      wireRequests: 1,
      multiWireRows: 0,
      wireIdsMissing: 1,
    });
  });

  it('failed single-wire requests without ids count too: the statement cannot join them either', () => {
    // One dispatch with an id, one failed with none, one ok with none.
    // The failed request still hit the provider (prompt processing may
    // have been billed before the failure), so a join-coverage counter
    // that skips it undercounts the requests a statement line can fail
    // to match.
    const usage = { inputTokens: 100, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const entry = {
      hashVersion: 2,
      spanId: 's0',
      startedAt: '2026-08-02T00:00:00.000Z',
      seq: 1,
      scope: '',
      key: 'agent:x',
      ordinal: 0,
      kind: 'agent',
      status: 'ok',
      servedBy: 'fake:model',
      usage: { ...usage, inputTokens: 300, outputTokens: 30 },
      providerCalls: [
        {
          ordinal: 1,
          role: 'loop',
          servedBy: 'fake:model',
          attempt: 1,
          outcome: 'ok',
          responseId: 'resp-1',
          usage,
        },
        {
          ordinal: 2,
          role: 'loop',
          servedBy: 'fake:model',
          attempt: 2,
          outcome: 'error',
          errorCode: 'agent',
          usage,
        },
        { ordinal: 3, role: 'loop', servedBy: 'fake:model', attempt: 3, outcome: 'ok', usage },
      ],
    } as unknown as JournalEntry;
    const invoice = invoiceFromJournal([entry], () => undefined);
    expect(invoice.rows.map((row) => row.reconciliation)).toEqual([
      'provider-id-present',
      'unconfirmed',
      'missing-provider-id',
    ]);
    expect(invoice.cardinality).toEqual({
      dispatchRows: 3,
      wireRequests: 3,
      multiWireRows: 0,
      wireIdsMissing: 2,
    });
  });
});

describe('the absorbed wire set survives an errored dispatch (RV1805)', () => {
  it('an error carrying wireRequests data keeps the paid segments joinable', async () => {
    const store = new InMemoryStore();
    const adapter = scriptedAdapter(() => ({
      error: {
        code: 'agent',
        message: 'pause_turn continuation cap (1) exceeded',
        retryable: false,
        data: {
          kind: 'terminal',
          wireRequests: { count: 2, responseIds: ['seg-1', 'seg-2'] },
        },
      },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(echo, undefined, { runId: 'WU-ERR' }).result;
    expect(outcome.status).toBe('error');
    const record = (await store.load('WU-ERR'))
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    // Before RV1805 the error arm dropped the ids the finish would have
    // named, and the paid segments fell out of every statement join.
    expect(record?.outcome).toBe('error');
    expect(record?.wireResponseIds).toEqual(['seg-1', 'seg-2']);
    expect(record?.wireRequests).toBe(2);
  });

  it('a SINGLE absorbed segment still rides the error record', async () => {
    const store = new InMemoryStore();
    const adapter = scriptedAdapter(() => ({
      error: {
        code: 'agent',
        message: 'stream severed after the first absorbed segment',
        retryable: false,
        data: {
          kind: 'terminal',
          wireRequests: { count: 1, responseIds: ['seg-only'] },
        },
      },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(echo, undefined, { runId: 'WU-ERR1' }).result;
    expect(outcome.status).toBe('error');
    const record = (await store.load('WU-ERR1'))
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    expect(record?.wireResponseIds).toEqual(['seg-only']);
    expect(record?.wireRequests).toBe(1);
  });

  it('an error without absorbed segments stays a bare record', async () => {
    const store = new InMemoryStore();
    const adapter = scriptedAdapter(() => ({
      error: {
        code: 'agent',
        message: 'plain transport failure',
        retryable: false,
        data: { kind: 'terminal' },
      },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(echo, undefined, { runId: 'WU-ERR0' }).result;
    expect(outcome.status).toBe('error');
    const record = (await store.load('WU-ERR0'))
      .filter((entry) => entry.kind === 'agent')
      .flatMap((entry) => entry.providerCalls ?? [])
      .at(0);
    expect(record !== undefined && 'wireResponseIds' in record).toBe(false);
    expect(record !== undefined && 'wireRequests' in record).toBe(false);
  });
});
