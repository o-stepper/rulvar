/**
 * Live-budget parity for the cache-write TTL split (RV1001): the
 * mid-stream usage inlet, the reported/remainder fold, and the usage
 * aggregates carry cacheWrite5mTokens/cacheWrite1hTokens end to end, so
 * the live debit and the settled fold price ONE provider usage to the
 * SAME dollars. The fourteenth experiment's probe fed a $4 ceiling a
 * stream whose differentiated write priced $4.50 while the unsplit fold
 * read $3.75: the run settled ok half a dollar over its own hard
 * ceiling, because the mid-stream cleaner and the aggregates dropped
 * the split before the money could see it.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest, Usage } from '../l0/messages.js';
import type { ModelCaps, ProviderAdapter } from '../l0/spi/provider.js';
import { usageViolations } from '../l0/usage.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';

const TTL_CAPS: Omit<ModelCaps, 'pricing'> = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 1_000_000,
  maxOutputTokens: 128_000,
};

const TTL_PRICING = {
  inputUsdPerMTok: 10,
  outputUsdPerMTok: 50,
  cacheReadUsdPerMTok: 1,
  cacheWriteUsdPerMTok: 12.5,
  cacheWrite1hUsdPerMTok: 20,
};

/** 200k at the 5m write rate + 100k at the 1h rate: $2.50 + $2.00. */
const SPLIT_USAGE: Usage = {
  inputTokens: 300_000,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 300_000,
  cacheWrite5mTokens: 200_000,
  cacheWrite1hTokens: 100_000,
};

/**
 * An adapter that reports usage mid-stream (the live-budget inlet) and
 * restates the same total on finish, exactly like a real wire whose
 * message_start carries the differentiated cache-write counts.
 */
function ttlAdapter(turns: Usage[], options?: { midstream?: boolean }): ProviderAdapter {
  let call = 0;
  const midstream = options?.midstream ?? true;
  return {
    id: 'ttl',
    caps: () => ({ ...TTL_CAPS, pricing: TTL_PRICING }),
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(_req: ChatRequest): AsyncIterable<ChatEvent> {
      const usage = turns[call] ?? turns[turns.length - 1];
      if (usage === undefined) {
        throw new Error('ttlAdapter needs at least one scripted usage');
      }
      call += 1;
      if (midstream) {
        yield { type: 'usage', usage: { ...usage } };
      }
      yield { type: 'text-delta', text: 'done' };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { ...usage },
        providerMetadata: { ttl: { responseId: `ttl-${String(call)}` } },
      };
    },
  };
}

interface ParityRun {
  status: string;
  totalUsd: number;
  maxLiveSpentUsd: number;
  usage: Usage;
}

async function runParity(
  turns: Usage[],
  budgetUsd: number,
  agents: number = turns.length,
  adapterOptions?: { midstream?: boolean },
): Promise<ParityRun> {
  const engine = createEngine({
    adapters: [ttlAdapter(turns, adapterOptions)],
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: 'ttl:model' } },
  });
  const workflow = defineWorkflow({ name: 'ttl-parity' }, async (ctx) => {
    for (let i = 0; i < agents; i += 1) {
      await ctx.agent('go', { estCost: 0 });
    }
    return 'done';
  });
  const handle = engine.run(workflow, undefined, { budgetUsd });
  let maxLiveSpentUsd = 0;
  handle.on('budget:update', (event) => {
    if (event.spentUsd > maxLiveSpentUsd) {
      maxLiveSpentUsd = event.spentUsd;
    }
  });
  const outcome = await handle.result;
  return {
    status: outcome.status,
    totalUsd: outcome.cost.totalUsd,
    maxLiveSpentUsd,
    usage: outcome.usage,
  };
}

describe('live-budget parity for the cache-write TTL split (RV1001)', () => {
  it('the live debit prices the split exactly like the settled fold', async () => {
    const run = await runParity([SPLIT_USAGE], 10);
    expect(run.status).toBe('ok');
    expect(run.totalUsd).toBe(4.5);
    // The live ledger saw the SAME dollars settlement recorded, not the
    // cheaper unsplit reading ($3.75) of the same provider usage.
    expect(run.maxLiveSpentUsd).toBe(4.5);
  });

  it('the run usage aggregate keeps the split it was billed under', async () => {
    const run = await runParity([SPLIT_USAGE], 10);
    expect(run.usage.cacheWriteTokens).toBe(300_000);
    expect(run.usage.cacheWrite5mTokens).toBe(200_000);
    expect(run.usage.cacheWrite1hTokens).toBe(100_000);
    expect(usageViolations(run.usage)).toEqual([]);
  });

  it('a ceiling between the unsplit and split price can never settle ok', async () => {
    const run = await runParity([SPLIT_USAGE], 4);
    // Pre-RV1001 this settled ok: the live path read $3.75 under the $4
    // ceiling while settlement recorded $4.50 over it. The live debit
    // now prices the split, crosses the ceiling mid-stream, and the
    // layer-3 signal severs the run before it can claim success.
    expect(run.status).toBe('exhausted');
    expect(run.totalUsd).toBe(4.5);
    expect(run.maxLiveSpentUsd).toBe(run.totalUsd);
  });

  it('an aggregate over split and unsplit calls stays canonical: undifferentiated writes count as the 5m share', async () => {
    const unsplit: Usage = {
      inputTokens: 50_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 50_000,
    };
    const run = await runParity([SPLIT_USAGE, unsplit], 10);
    expect(run.status).toBe('ok');
    // $4.50 + 50k at the plain write rate ($0.625).
    expect(run.totalUsd).toBe(5.125);
    expect(run.maxLiveSpentUsd).toBe(run.totalUsd);
    expect(run.usage.cacheWriteTokens).toBe(350_000);
    expect(run.usage.cacheWrite5mTokens).toBe(250_000);
    expect(run.usage.cacheWrite1hTokens).toBe(100_000);
    expect(usageViolations(run.usage)).toEqual([]);
  });

  it('the finish remainder carries the split when no mid-stream event reported it', async () => {
    const run = await runParity([SPLIT_USAGE], 10, 1, { midstream: false });
    expect(run.status).toBe('ok');
    expect(run.totalUsd).toBe(4.5);
    // With no mid-stream report the whole turn reaches the ledger as
    // the finish remainder; the remainder must keep the attribution or
    // the live fold under-prices the 1h share at the plain write rate.
    expect(run.maxLiveSpentUsd).toBe(4.5);
    expect(run.usage.cacheWrite5mTokens).toBe(200_000);
    expect(run.usage.cacheWrite1hTokens).toBe(100_000);
  });

  it('live and settled dollars agree over generated TTL splits', async () => {
    // Deterministic LCG: the property is exact equality, so the seeds
    // are fixtures, not wall-clock randomness.
    let state = 0xc0ffee;
    const next = (bound: number): number => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state % bound;
    };
    for (let round = 0; round < 24; round += 1) {
      const write5m = next(400_000);
      const write1h = next(400_000);
      const uncached = next(50_000);
      const usage: Usage = {
        inputTokens: write5m + write1h + uncached,
        outputTokens: next(20_000),
        cacheReadTokens: 0,
        cacheWriteTokens: write5m + write1h,
        cacheWrite5mTokens: write5m,
        cacheWrite1hTokens: write1h,
      };
      const run = await runParity([usage], 1_000);
      expect(run.status).toBe('ok');
      expect(Math.abs(run.maxLiveSpentUsd - run.totalUsd)).toBeLessThanOrEqual(1e-12);
    }
  });
});
