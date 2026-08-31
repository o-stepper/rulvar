/**
 * The construction snapshot of the price table (RV4803, the ninth
 * experiment review). Pricing resolution used to read the caller's
 * live object on every debit, so a host mutating its table mid-run
 * silently changed what wires cost after the strict gates had judged
 * the original. The snapshot severs the alias: a rates update is a new
 * engine with a bumped pricingVersion, never a mutation of a running
 * one.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { PriceTable } from '../model/pricing.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

async function spentOf(handle: {
  events: AsyncIterable<{ type: string } & Record<string, unknown>>;
  result: Promise<{ status: string }>;
}): Promise<number> {
  let spent = 0;
  const drain = (async () => {
    for await (const event of handle.events) {
      if (event.type === 'budget:update') {
        spent = event.spentUsd as number;
      }
    }
  })();
  const outcome = await handle.result;
  await drain;
  expect(outcome.status).toBe('ok');
  return spent;
}

describe('the price table snapshot (RV4803)', () => {
  it('mutating the host table after construction does not move debits', async () => {
    const table: PriceTable = {
      pricingVersion: 'v1',
      models: { 'fake:model': { inputUsdPerMTok: 2, outputUsdPerMTok: 0 } },
    };
    const adapter = scriptedAdapter(() => ({
      text: 'ok',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
    }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
      pricing: table,
    });
    const wf = defineWorkflow({ name: 'priced' }, (ctx) => ctx.agent('work'));

    const first = await spentOf(engine.run(wf, undefined, { runId: 'SNAP-1', budgetUsd: 10 }));
    expect(first).toBeCloseTo(2, 9);

    // The host mutates its object: row, new model, version, all of it.
    table.models['fake:model'] = { inputUsdPerMTok: 2000, outputUsdPerMTok: 500 };
    table.pricingVersion = 'v2-mutated';

    const second = await spentOf(engine.run(wf, undefined, { runId: 'SNAP-2', budgetUsd: 10 }));
    expect(second).toBeCloseTo(2, 9);
  });

  it('a table the structured clone cannot take refuses typed at construction', () => {
    const table = {
      pricingVersion: 'v1',
      models: { 'fake:model': { inputUsdPerMTok: 2, outputUsdPerMTok: 0 } },
      live: () => 0,
    } as unknown as PriceTable;
    expect(() =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'x' }))],
        defaults: { routing: { loop: 'fake:model' } },
        pricing: table,
      }),
    ).toThrow(ConfigError);
  });
});
