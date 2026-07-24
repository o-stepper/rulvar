/**
 * Durable provider reconciliation (the experiment-review P1.3).
 * Reproduced on published 1.60.0: both shipped adapters surface a
 * provider responseId on every finish, and the core never persisted
 * it; a billed failed attempt's usage folded into the aggregate with
 * no per-attempt record; retry evidence was live telemetry only;
 * abandoned subtree spend was excluded from CostReport.totalUsd and
 * visible nowhere in the report; no invoice export existed. The
 * contract now: every live provider dispatch mints a
 * ProviderCallRecord (failed, retried, and failover attempts
 * included), the ledger rides the terminal entry and every checkpoint
 * boundary and replays verbatim, CostReport splits gross from net, and
 * invoiceFromJournal exports rows whose totals equal the gross ledger
 * by construction.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  checkpointRefFor,
  decodeCheckpoint,
  encodeCheckpoint,
  type CheckpointState,
} from '../journal/checkpoint.js';
import { deriveContentKey, type IdentityInput } from '../journal/identity.js';
import { EMPTY_SCHEMA_HASH } from '../l0/schema.js';
import type { JournalEntry, ProviderCallRecord } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { resolveToolset } from '../tools/toolset-hash.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import { costReportFromJournal } from './cost-report.js';
import { invoiceFromJournal } from './invoice.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

const usageOf = (inputTokens: number, outputTokens: number): Usage => ({
  inputTokens,
  outputTokens,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
});

/** testCaps pricing: $1/MTok in, $10/MTok out. */
const capsPriceUsd = (ref: ModelRef, usage: Usage): number | undefined =>
  ref.startsWith('fake:') || ref.startsWith('backup:')
    ? (usage.inputTokens * 1 + usage.outputTokens * 10) / 1_000_000
    : undefined;

const transient = { code: 'agent', message: 'down', retryable: true, data: { kind: 'transport' } };

const lookup = tool({
  name: 'lookup',
  description: 'looks up a fact',
  parameters: {},
  execute: () => Promise.resolve({ fact: 'sunny' }),
});

describe('the per-dispatch reconciliation ledger (P1.3)', () => {
  it('records every dispatched call with the provider response ids and the exact per-call usage', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCall: { name: 'lookup', args: {} },
            usage: usageOf(11, 7),
            providerMetadata: { fake: { responseId: 'resp_1' } },
          }
        : {
            text: 'done',
            usage: usageOf(13, 3),
            providerMetadata: { fake: { responseId: 'resp_2' } },
          },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', { tools: [lookup], result: 'full' }),
    );
    expect(result.status).toBe('ok');
    expect(result.providerCalls).toEqual([
      {
        ordinal: 1,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'ok',
        responseId: 'resp_1',
        usage: usageOf(11, 7),
      },
      {
        ordinal: 2,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'ok',
        responseId: 'resp_2',
        usage: usageOf(13, 3),
      },
    ]);
    await internals.replayer.flush();
    const entries = await store.load('test-run');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    // The journaled ledger is the result's, and its records sum to the
    // entry's aggregate exactly.
    expect(terminal?.providerCalls).toEqual(result.providerCalls);
    expect(terminal?.usage).toEqual(usageOf(24, 10));
  });

  it('keeps a billed failed attempt: the retry is a second record, nothing is lost', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { usage: usageOf(100, 0), error: transient }
        : {
            text: 'recovered',
            usage: usageOf(200, 20),
            providerMetadata: { fake: { responseId: 'resp_ok' } },
          },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.providerCalls).toEqual([
      {
        ordinal: 1,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'error',
        usage: usageOf(100, 0),
        usageApprox: true,
        errorCode: 'agent',
      },
      {
        ordinal: 2,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 2,
        outcome: 'ok',
        responseId: 'resp_ok',
        usage: usageOf(200, 20),
      },
    ]);
    await internals.replayer.flush();
    const terminal = (await store.load('test-run')).find(
      (e) => e.kind === 'agent' && e.status === 'ok',
    );
    // The failed attempt's usage is inside the aggregate AND attributable.
    expect(terminal?.usage).toEqual(usageOf(300, 20));
    expect(terminal?.providerCalls).toEqual(result.providerCalls);
  });

  it('failover: each serving target records its own attempts', async () => {
    const primary = scriptedAdapter(() => ({ usage: usageOf(10, 0), error: transient }));
    const backup = scriptedAdapter(
      () => ({
        text: 'served by backup',
        usage: usageOf(50, 5),
        providerMetadata: { backup: { responseId: 'resp_b' } },
      }),
      { id: 'backup' },
    );
    const { internals } = makeInternals({
      adapters: [primary, backup],
      routing: { loop: { model: 'fake:model', fallbacks: ['backup:model-b'] } },
    });
    const result = fullResult(
      await createCtx(internals).agent('do the thing', {
        retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.providerCalls?.map((r) => [r.ordinal, r.servedBy, r.attempt, r.outcome])).toEqual(
      [
        [1, 'fake:model', 1, 'error'],
        [2, 'fake:model', 2, 'error'],
        [3, 'backup:model-b', 1, 'ok'],
      ],
    );
    expect(result.providerCalls?.[2]?.responseId).toBe('resp_b');
  });

  it('separate-extract phases record their own role', async () => {
    // Plain z.object with tools routes the separate extract (the RV-207
    // forced-tool rule), so the extract dispatch is its own wire call:
    // a forced emit_result tool turn, not a text turn.
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return { toolCall: { name: 'lookup', args: {} } };
      }
      if (call === 1) {
        return { text: 'the verdict is pass' };
      }
      return {
        toolCall: { name: 'emit_result', args: { verdict: 'pass' } },
        providerMetadata: { fake: { responseId: 'resp_extract' } },
      };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('judge', {
        schema: z.object({ verdict: z.enum(['pass', 'fail']) }),
        tools: [lookup],
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.providerCalls?.map((r) => [r.ordinal, r.role, r.outcome])).toEqual([
      [1, 'loop', 'ok'],
      [2, 'loop', 'ok'],
      [3, 'extract', 'ok'],
    ]);
    expect(result.providerCalls?.[2]?.responseId).toBe('resp_extract');
  });

  it('replays the ledger verbatim with zero live calls', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { usage: usageOf(100, 0), error: transient }
        : {
            text: 'recovered',
            usage: usageOf(200, 20),
            providerMetadata: { fake: { responseId: 'resp_ok' } },
          },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const live = fullResult(
      await createCtx(internals).agent('audit', {
        retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
        result: 'full',
      }),
    );
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = scriptedAdapter(() => ({ text: 'unused' }));
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('audit', {
        retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
        result: 'full',
      }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    // Presence first, so the parity assertion can never pass vacuously.
    expect(live.providerCalls).toHaveLength(2);
    expect(replayed.providerCalls).toEqual(live.providerCalls);
  });
});

const PROMPT = 'check the weather twice';

/** The exact spawn identity ctx.agent derives for this call shape. */
async function spawnKey(): Promise<string> {
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
  return deriveContentKey(identity);
}

function midFlightCheckpoint(): CheckpointState {
  return {
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
    usage: usageOf(20, 10),
    toolCallsUsed: 1,
    schemaAttempts: 0,
    compaction: [],
  };
}

describe('the ledger across kill-and-resume (P1.3)', () => {
  const resumeFromCheckpoint = async (
    checkpoint: CheckpointState,
  ): Promise<{ terminal: JournalEntry | undefined; entries: readonly JournalEntry[] }> => {
    const transcripts = new InMemoryTranscriptStore();
    const key = await spawnKey();
    const seed = makeInternals({ adapters: [], transcripts });
    const running = await seed.internals.replayer.appendRunning({
      scope: '',
      key,
      kind: 'agent',
      spanId: 's0',
    });
    await transcripts.put(checkpointRefFor('test-run', running.seq), encodeCheckpoint(checkpoint));
    const prior = await seed.store.load('test-run');

    const adapter = scriptedAdapter(() => ({
      text: 'sunny twice',
      providerMetadata: { fake: { responseId: 'resp_live' } },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const output = await createCtx(internals).agent(PROMPT, { tools: [lookup] });
    expect(output).toBe('sunny twice');
    expect(adapter.calls).toHaveLength(1);
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    return { terminal: entries.find((e) => e.kind === 'agent' && e.status === 'ok'), entries };
  };

  it('restored records keep their ordinals and the live call continues them', async () => {
    const checkpoint = midFlightCheckpoint();
    const restored: ProviderCallRecord[] = [
      {
        ordinal: 1,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'ok',
        responseId: 'resp_ckpt',
        usage: usageOf(20, 10),
      },
    ];
    checkpoint.providerCalls = restored;
    const { terminal } = await resumeFromCheckpoint(checkpoint);
    expect(terminal?.usage).toEqual(usageOf(30, 15));
    expect(terminal?.providerCalls).toEqual([
      ...restored,
      {
        ordinal: 2,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'ok',
        responseId: 'resp_live',
        usage: usageOf(10, 5),
      },
    ]);
  });

  it('a pre-ledger checkpoint restores none; the invoice surfaces the gap as an unattributed remainder', async () => {
    const { terminal, entries } = await resumeFromCheckpoint(midFlightCheckpoint());
    // Only the live call is attributable.
    expect(terminal?.providerCalls?.map((r) => r.ordinal)).toEqual([1]);
    expect(terminal?.usage).toEqual(usageOf(30, 15));

    const invoice = invoiceFromJournal(entries, capsPriceUsd);
    const rows = invoice.rows.filter((row) => row.entrySeq === terminal?.seq);
    expect(rows.map((row) => [row.outcome, row.reconciliation])).toEqual([
      ['ok', 'matched'],
      ['unattributed', 'unattributed'],
    ]);
    // The remainder is exactly the restored usage: nothing vanished.
    expect(rows[1]?.usage).toEqual(usageOf(20, 10));
    const report = costReportFromJournal(entries, capsPriceUsd);
    expect(invoice.totalUsd).toBe(report.grossUsd);
  });

  it('the checkpoint codec roundtrips the ledger and keeps its absence absent', () => {
    const withLedger = midFlightCheckpoint();
    withLedger.providerCalls = [
      {
        ordinal: 1,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'ok',
        usage: usageOf(20, 10),
      },
    ];
    const decoded = decodeCheckpoint(encodeCheckpoint(withLedger));
    expect(decoded?.providerCalls).toEqual(withLedger.providerCalls);
    const bare = decodeCheckpoint(encodeCheckpoint(midFlightCheckpoint()));
    expect(bare).toBeDefined();
    expect(bare?.providerCalls).toBeUndefined();
  });
});

/** A minimal priced terminal pair plus an optional abandon cover. */
function syntheticEntries(options: { abandon: boolean }): JournalEntry[] {
  const running: JournalEntry = {
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-24T00:00:00.000Z',
    seq: 1,
    scope: '',
    key: 'agent:x',
    ordinal: 0,
    kind: 'agent',
    status: 'running',
  };
  const terminal: JournalEntry = {
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-24T00:00:00.000Z',
    seq: 2,
    ref: 1,
    scope: '',
    key: 'agent:x',
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    usage: usageOf(1_000_000, 0),
    servedBy: 'fake:model',
  };
  const abandon: JournalEntry = {
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-24T00:00:00.000Z',
    seq: 3,
    ref: 1,
    scope: '',
    key: 'abandon:x',
    ordinal: 0,
    kind: 'abandon',
    status: 'ok',
    abandon: { target: 1, authorizedBy: 1, reason: 'branch abandoned' },
  };
  return options.abandon ? [running, terminal, abandon] : [running, terminal];
}

describe('the gross/net cost split (P1.3)', () => {
  it('abandoned subtree spend folds into abandoned and grossUsd, never totalUsd', () => {
    const kept = costReportFromJournal(syntheticEntries({ abandon: false }), capsPriceUsd);
    expect(kept.totalUsd).toBe(1);
    expect(kept.grossUsd).toBe(1);
    expect(kept.abandoned).toEqual({ usd: 0, unpriced: [] });

    const report = costReportFromJournal(syntheticEntries({ abandon: true }), capsPriceUsd);
    // The net report is exactly what it was: zero, empty breakdowns.
    expect(report.totalUsd).toBe(0);
    expect(report.byModel).toEqual({});
    // The provider still billed the branch: the gross side keeps it.
    expect(report.abandoned.usd).toBe(1);
    expect(report.grossUsd).toBe(1);
  });

  it('abandoned unpriced slices surface in abandoned.unpriced only', () => {
    const entries = syntheticEntries({ abandon: true });
    const report = costReportFromJournal(entries, () => undefined);
    expect(report.unpriced).toEqual([]);
    expect(report.abandoned.unpriced).toEqual([
      { model: 'fake:model', usage: usageOf(1_000_000, 0) },
    ]);
    expect(report.grossUsd).toBe(0);
  });
});

describe('the invoice export (P1.3)', () => {
  it('classifies rows, marks abandoned spend, and reconciles to the gross ledger exactly', () => {
    const entries = syntheticEntries({ abandon: true });
    const terminal = entries[1];
    terminal.providerCalls = [
      {
        ordinal: 1,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 1,
        outcome: 'ok',
        responseId: 'resp_1',
        usage: usageOf(400_000, 0),
      },
      {
        ordinal: 2,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 2,
        outcome: 'error',
        errorCode: 'agent',
        usage: usageOf(100_000, 0),
        usageApprox: true,
      },
      {
        ordinal: 3,
        role: 'loop',
        servedBy: 'fake:model',
        attempt: 3,
        outcome: 'ok',
        usage: usageOf(200_000, 0),
      },
    ];
    // A second, kept invocation with no ledger at all (a pre-ledger run).
    entries.push(
      {
        hashVersion: 2,
        spanId: 's0',
        startedAt: '2026-07-24T00:00:00.000Z',
        seq: 4,
        scope: '',
        key: 'agent:y',
        ordinal: 0,
        kind: 'agent',
        status: 'running',
      },
      {
        hashVersion: 2,
        spanId: 's0',
        startedAt: '2026-07-24T00:00:00.000Z',
        seq: 5,
        ref: 4,
        scope: '',
        key: 'agent:y',
        ordinal: 0,
        kind: 'agent',
        status: 'ok',
        usage: usageOf(500_000, 0),
        servedBy: 'fake:model',
      },
    );
    const invoice = invoiceFromJournal(entries, capsPriceUsd);
    expect(
      invoice.rows.map((row) => [
        row.entrySeq,
        row.ordinal,
        row.outcome,
        row.reconciliation,
        row.abandoned === true,
      ]),
    ).toEqual([
      // The abandoned invocation: three recorded calls plus the
      // remainder its records do not cover (1M - 700k).
      [2, 1, 'ok', 'matched', true],
      [2, 2, 'error', 'unconfirmed', true],
      [2, 3, 'ok', 'missing-provider-id', true],
      [2, 4, 'unattributed', 'unattributed', true],
      // The kept pre-ledger invocation: one slice row.
      [5, 1, 'unattributed', 'unattributed', false],
    ]);
    expect(invoice.rows[3]?.usage).toEqual(usageOf(300_000, 0));
    const report = costReportFromJournal(entries, capsPriceUsd);
    expect(invoice.totalUsd).toBe(report.grossUsd);
    expect(invoice.netUsd).toBe(report.totalUsd);
    expect(invoice.abandonedUsd).toBe(report.abandoned.usd);
    expect(invoice.netUsd).toBe(0.5);
    expect(invoice.totalUsd).toBe(1.5);
    expect(invoice.reconciliationFailures).toBe(4);
    // The abandoned entry carried approximate usage nowhere at the
    // entry level, so the export stays exact.
    expect(invoice.usageApprox).toBeUndefined();
  });

  it('reconciles a real run: rows from the journaled ledger, totals from the same fold', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { usage: usageOf(100, 0), error: transient }
        : {
            text: 'recovered',
            usage: usageOf(200, 20),
            providerMetadata: { fake: { responseId: 'resp_ok' } },
          },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    await createCtx(internals).agent('audit', {
      retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
    });
    await internals.replayer.flush();
    const entries = await store.load('test-run');
    const invoice = invoiceFromJournal(entries, capsPriceUsd);
    expect(
      invoice.rows.map((row) => [row.outcome, row.responseId ?? null, row.reconciliation]),
    ).toEqual([
      ['error', null, 'unconfirmed'],
      ['ok', 'resp_ok', 'matched'],
    ]);
    const report = costReportFromJournal(entries, capsPriceUsd);
    expect(invoice.totalUsd).toBe(report.grossUsd);
    // Linear pricing: the informational per-row prices sum to the total.
    const rowSum = invoice.rows.reduce((sum, row) => sum + (row.usd ?? 0), 0);
    expect(rowSum).toBeCloseTo(invoice.totalUsd, 10);
    // The failed attempt severed its stream, so the export is an estimate.
    expect(invoice.usageApprox).toBe(true);
  });
});
