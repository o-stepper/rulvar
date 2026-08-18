/**
 * The pre-wire provider intent (RV4006, the fifth comparison
 * experiment's P0.5): receipts journal after a wire settles, so the
 * wire most exposed at a crash is exactly the one being paid for.
 * Under `billingReceipts: 'intent'` every dispatched attempt journals
 * its intent BEFORE the provider could bill, a resume that finds an
 * intent with no receipt and no terminal coverage refuses the blind
 * retry typed, and the invoice names every open intent in its
 * `openIntents` lane. The intent narrows the unknown-outcome window
 * to the wire itself; dispatch stays at-least-once with attempt
 * binding, and nothing here claims more.
 */
import { mkdtempSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { memoryQuotaLimiter } from '../model/quota.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';
import { invoiceFromJournal, openWireIntentsOf } from './invoice.js';

const wf = defineWorkflow({ name: 'intent-smoke' }, async (ctx) => {
  return await ctx.agent('one turn');
});

describe("billingReceipts: 'intent' (RV4006)", () => {
  it('refuses a garbage posture with the three literals named', () => {
    expect(() =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'x' }))],
        defaults: {
          routing: { loop: 'fake:model' },
          billingReceipts: 'promise' as unknown as 'intent',
        },
      }),
    ).toThrow(/'async', 'awaited' or 'intent'/);
  });

  it('journals one intent per dispatched wire, strictly before its receipt', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-intent-'));
    const store = new JsonlFileStore({ dir });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' }, billingReceipts: 'intent' },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'WI-CLEAN', budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('WI-CLEAN');
    const intents = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'provider-intent',
    );
    expect(intents.length).toBeGreaterThan(0);
    for (const intent of intents) {
      const value = intent.value as {
        agentRef: number;
        ordinal: number;
        attempt: number;
        servedBy: string;
        requestFingerprint: string;
      };
      expect(value.servedBy).toBe('fake:model');
      expect(value.requestFingerprint).toMatch(/^[0-9a-f]{64}$/);
      // The receipt for the same wire lands strictly AFTER the intent.
      const receipt = entries.find(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'provider-call' &&
          (entry.value as { agentRef?: number }).agentRef === value.agentRef &&
          (entry.value as { record?: { ordinal?: number } }).record?.ordinal === value.ordinal,
      );
      expect(receipt).toBeDefined();
      expect(receipt !== undefined && receipt.seq > intent.seq).toBe(true);
    }
    // Every intent is closed: no lane, no open rows.
    expect(openWireIntentsOf(entries)).toEqual([]);
    const invoice = invoiceFromJournal(entries, () => 0.01);
    expect('openIntents' in invoice).toBe(false);
  });

  it('the quota-reserved arm journals its intent too, after the reservation', async () => {
    // The intent must be durable whichever dispatch arm runs: the
    // quota arm fires it after the reservation is granted (denials
    // never mint an intent, exactly like the record they never mint).
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-intent-quota-'));
    const store = new JsonlFileStore({ dir });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      stores: { journal: store },
      quota: { limiter: memoryQuotaLimiter([{ provider: 'fake', requestsPerMinute: 100 }]) },
      defaults: { routing: { loop: 'fake:model' }, billingReceipts: 'intent' },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'WI-QUOTA', budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('WI-QUOTA');
    const intents = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'provider-intent',
    );
    expect(intents.length).toBeGreaterThan(0);
    expect(openWireIntentsOf(entries)).toEqual([]);
  });

  it('the default posture journals no intents: the dispatch path is byte identical', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-intent-off-'));
    const store = new JsonlFileStore({ dir });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    await engine.run(wf, undefined, { runId: 'WI-OFF', budgetUsd: 5 }).result;
    const entries = await store.load('WI-OFF');
    expect(
      entries.some(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'provider-intent',
      ),
    ).toBe(false);
  });

  it('an intent with no receipt and no terminal coverage is the open lane and refuses a blind resume', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-intent-open-'));
    const store = new JsonlFileStore({ dir });
    const makeEngine = (): ReturnType<typeof createEngine> =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
        stores: { journal: store },
        defaults: {
          routing: { loop: 'fake:model' },
          billingReceipts: 'intent',
        },
      });
    await makeEngine().run(wf, undefined, { runId: 'WI-OPEN', budgetUsd: 5 }).result;
    // The crash window, reconstructed: an intent journaled before a
    // dispatch that never came back (no receipt row, no terminal for
    // that agent seq).
    const journalPath = join(dir, 'WI-OPEN.jsonl');
    const lines = readFileSync(journalPath, 'utf8').trim().split('\n');
    const maxSeq = Math.max(...lines.map((line) => (JSON.parse(line) as { seq: number }).seq));
    const orphan = {
      seq: maxSeq + 1,
      kind: 'decision',
      scope: '',
      key: 'pi:99999:1:1',
      status: 'ok',
      spanId: 'crash-window',
      site: 'provider-intent',
      value: {
        decisionType: 'provider-intent',
        agentRef: 99999,
        ordinal: 1,
        attempt: 1,
        servedBy: 'fake:model',
        requestFingerprint: 'f'.repeat(64),
      },
    };
    writeFileSync(journalPath, `${lines.join('\n')}\n${JSON.stringify(orphan)}\n`, 'utf8');
    const entries = await store.load('WI-OPEN');
    const open = openWireIntentsOf(entries);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ agentRef: 99999, ordinal: 1, attempt: 1 });
    const invoice = invoiceFromJournal(entries, () => 0.01);
    expect(invoice.openIntents?.count).toBe(1);
    expect(invoice.openIntents?.rows[0]?.requestFingerprint).toBe('f'.repeat(64));

    // A receipt CLOSES its intent even with no terminal yet: append
    // the pair for a still-running agent seq and the lane must not
    // grow (the receipt is the outcome the intent was waiting for).
    const paired = [
      {
        seq: maxSeq + 2,
        kind: 'decision',
        scope: '',
        key: 'pi:88888:1:1',
        status: 'ok',
        spanId: 'crash-window',
        site: 'provider-intent',
        value: {
          decisionType: 'provider-intent',
          agentRef: 88888,
          ordinal: 1,
          attempt: 1,
          servedBy: 'fake:model',
          requestFingerprint: 'e'.repeat(64),
        },
      },
      {
        seq: maxSeq + 3,
        kind: 'decision',
        scope: '',
        key: 'pc:88888:1',
        status: 'ok',
        spanId: 'crash-window',
        site: 'provider-call',
        value: {
          decisionType: 'provider-call',
          agentRef: 88888,
          record: {
            ordinal: 1,
            attempt: 1,
            role: 'loop',
            servedBy: 'fake:model',
            outcome: 'ok',
            usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
          },
        },
      },
    ];
    writeFileSync(
      journalPath,
      `${readFileSync(journalPath, 'utf8').trim()}\n${paired.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
      'utf8',
    );
    const withPair = openWireIntentsOf(await store.load('WI-OPEN'));
    expect(withPair).toHaveLength(1);
    expect(withPair[0]?.agentRef).toBe(99999);

    await expect(makeEngine().resume('WI-OPEN', wf).result).rejects.toThrow(ConfigError);
    await expect(makeEngine().resume('WI-OPEN', wf).result).rejects.toThrow(
      /unknown outcome[\s\S]*could pay twice[\s\S]*acknowledgeOpenWireIntents/,
    );
    // The acknowledged door: the resume proceeds and journals the
    // acknowledgment durably in the new segment.
    const acked = await makeEngine().resume('WI-OPEN', wf, {
      acknowledgeOpenWireIntents: true,
    }).result;
    expect(acked.status).toBe('ok');
    const after = await store.load('WI-OPEN');
    const ack = after.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'open_wire_intents_acknowledged',
    );
    expect(ack).toBeDefined();
    expect((ack?.value as { count?: number } | undefined)?.count).toBe(1);
  });
});
