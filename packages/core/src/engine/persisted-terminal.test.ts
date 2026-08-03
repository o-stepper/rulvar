/**
 * The persisted terminal (RV1209, the P1-4 arc): a run that left this
 * process is still a settled run, and its terminal must be readable
 * from the journal that recorded it. The fold reuses the ONE envelope
 * assembler (RV1105), so a restarted reader gets the SAME shape a live
 * consumer holds, marked `provenance: 'journal'` and honest about the
 * two facts the journal never records (the semantic completion claim
 * and the terminal wire error). Where the journal proves no terminal
 * at all, the fold refuses with a typed reason instead of dressing the
 * meta projection up as an envelope.
 */
import { describe, expect, it } from 'vitest';

import { normalizeEntry, type JournalEntry } from '../l0/entries.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { readRunMeta } from '../stores/meta-lookup.js';
import { auditRun } from '../stores/reconcile.js';
import { tool } from '../tools/tool.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { ExternalRegistry } from './external.js';
import { persistedTerminalEnvelope } from './persisted-terminal.js';
import { journalPricingSnapshot } from './pricing-snapshot.js';
import { scriptedAdapter } from './test-harness.js';

const USAGE = {
  inputTokens: 100_000,
  outputTokens: 10_000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/** 100k in at 10/MTok + 10k out at 50/MTok = 1.5 USD per call, exactly. */
const PRICING = {
  pricingVersion: 'persisted-v1',
  models: { 'fake:model': { inputUsdPerMTok: 10, outputUsdPerMTok: 50 } },
};

const claiming = defineWorkflow({ name: 'persisted' }, async (ctx) => {
  await ctx.agent('hi');
  return { result: 'done', completion: 'complete' as const };
});

function engineOver(store: InMemoryStore) {
  return createEngine({
    adapters: [scriptedAdapter(() => ({ text: 'done', usage: USAGE }))],
    stores: { journal: store },
    defaults: { routing: { loop: 'fake:model' } },
    pricing: PRICING,
  });
}

/** Reloads the run exactly as a restarted reader would: store, not memory. */
async function reload(store: InMemoryStore, runId: string) {
  const entries = (await store.load(runId)).map((raw) => normalizeEntry(raw));
  const meta = await readRunMeta(store, runId);
  const snapshot = journalPricingSnapshot(entries);
  const priceUsd =
    snapshot === undefined
      ? (): undefined => undefined
      : snapshot.composedPriceUsd((): undefined => undefined);
  return { entries, meta, priceUsd };
}

describe('the persisted terminal envelope (RV1209)', () => {
  it('reproduces every envelope fact the journal records, marked as journal-derived', async () => {
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(claiming, undefined, { runId: 'PT1' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.envelope.completion).toBe('complete');
    expect(outcome.envelope.totalUsd).toBe(1.5);

    const { entries, meta, priceUsd } = await reload(store, 'PT1');
    const derived = persistedTerminalEnvelope({ runId: 'PT1', meta, entries, priceUsd });
    expect(derived.available).toBe(true);
    if (!derived.available) {
      return;
    }
    // The dollars, the usage, the agent count and the settlement
    // verdict all survive the restart, priced by the settle's own pin.
    expect(derived.envelope.runId).toBe('PT1');
    expect(derived.envelope.workflow).toBe('persisted');
    expect(derived.envelope.status).toBe('ok');
    expect(derived.envelope.settled).toBe(true);
    expect(derived.envelope.totalUsd).toBe(outcome.envelope.totalUsd);
    expect(derived.envelope.grossUsd).toBe(outcome.envelope.grossUsd);
    expect(derived.envelope.costByModel).toEqual(outcome.envelope.costByModel);
    expect(derived.envelope.usage).toEqual(outcome.envelope.usage);
    expect(derived.envelope.usageApprox).toBe(outcome.envelope.usageApprox);
    expect(derived.envelope.agentsSpawned).toBe(outcome.envelope.agentsSpawned);
    // The semantic completion survives the restart too, read back
    // from the lift the settle recorded beside its output digest (the
    // persisted-terminal tail); the error remains the one fact the
    // journal never records as the run's own.
    expect(derived.envelope.provenance).toBe('journal');
    expect(derived.envelope.completion).toBe(outcome.envelope.completion);
    expect('error' in derived.envelope).toBe(false);
  });

  it('a settle written before the lift rode it stays honestly absent', async () => {
    const store = new InMemoryStore();
    await engineOver(store).run(claiming, undefined, { runId: 'PT-LEGACY' }).result;
    const { entries, meta, priceUsd } = await reload(store, 'PT-LEGACY');
    // A pre-lift journal, byte for byte: strip the recorded lift from
    // the settle value, exactly what an older engine wrote.
    const legacy = entries.map((entry) => {
      const value = entry.value as { decisionType?: string } | undefined;
      if (value?.decisionType !== 'run_settle') {
        return entry;
      }
      const {
        completion: _c,
        childStatusCounts: _n,
        ...rest
      } = entry.value as Record<string, unknown>;
      return { ...entry, value: rest } as typeof entry;
    });
    const derived = persistedTerminalEnvelope({
      runId: 'PT-LEGACY',
      meta,
      entries: legacy,
      priceUsd,
    });
    expect(derived.available).toBe(true);
    if (!derived.available) {
      return;
    }
    expect('completion' in derived.envelope).toBe(false);
    expect(derived.envelope.provenance).toBe('journal');
  });

  it('a live assembly carries no provenance marker: absent means assembled at the settle', async () => {
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(claiming, undefined, { runId: 'PT2' }).result;
    expect('provenance' in outcome.envelope).toBe(false);
  });

  it('refuses typed when the journal carries no settle at all', async () => {
    const store = new InMemoryStore();
    await engineOver(store).run(claiming, undefined, { runId: 'PT3' }).result;
    const { entries, meta, priceUsd } = await reload(store, 'PT3');
    const withoutSettle = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType !== 'run_settle',
    );
    const derived = persistedTerminalEnvelope({
      runId: 'PT3',
      meta,
      entries: withoutSettle,
      priceUsd,
    });
    expect(derived.available).toBe(false);
    if (derived.available) {
      return;
    }
    expect(derived.reason).toBe('unsettled');
  });

  it('refuses typed when nothing names the workflow the terminal belongs to', async () => {
    const store = new InMemoryStore();
    await engineOver(store).run(claiming, undefined, { runId: 'PT4' }).result;
    const { entries, priceUsd } = await reload(store, 'PT4');
    const derived = persistedTerminalEnvelope({
      runId: 'PT4',
      meta: undefined,
      entries,
      priceUsd,
    });
    expect(derived.available).toBe(false);
    if (derived.available) {
      return;
    }
    expect(derived.reason).toBe('unknown-workflow');
  });
});

describe('the tail-aware persisted terminal (RV1407)', () => {
  it('a detached resolution appended after the suspended settle blocks the stale envelope, agreeing with the audit', async () => {
    const store = new InMemoryStore();
    const deploy = tool({
      name: 'deploy',
      description: 'deploys the site',
      parameters: { type: 'object' },
      needsApproval: true,
      execute: () => Promise.resolve('deployed'),
    });
    const gated = defineWorkflow({ name: 'persisted-gated' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deploy] }),
    );
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'deploy', args: { site: 'prod' } } }
        : { text: 'released', usage: USAGE },
    );
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store, transcripts: new InMemoryTranscriptStore() },
      defaults: { routing: { loop: 'fake:model' } },
      pricing: PRICING,
    });
    const handle = engine.run(gated, undefined, { runId: 'PT5' });
    const outcome = await handle.result;
    expect(outcome.status).toBe('suspended');

    // The parked run's settle IS servable: 'suspended' is an honest
    // terminal of its segment and nothing continued past it yet.
    const parked = await reload(store, 'PT5');
    const before = persistedTerminalEnvelope({ runId: 'PT5', ...parked });
    expect(before.available).toBe(true);
    if (before.available) {
      expect(before.envelope.status).toBe('suspended');
    }

    // The detached resolution appends PAST the settle: the run is now
    // destined to continue, and the old settle is a stale claim.
    const approval = parked.entries.find((entry) => entry.kind === 'approval');
    await handle.resolveExternal(ExternalRegistry.approvalKey(approval?.seq ?? -1), {
      decision: 'allow',
    });
    const continued = await reload(store, 'PT5');
    const derived = persistedTerminalEnvelope({ runId: 'PT5', ...continued });
    expect(derived.available).toBe(false);
    if (derived.available) {
      return;
    }
    expect(derived.reason).toBe('not-terminal');
    expect(derived.message).toContain('past the settle');

    // The audit reads the same journal the same way: entries after the
    // settle mean the latest segment is not settled.
    const audit = await auditRun(store, 'PT5');
    expect(audit.entriesAfterSettle).toBeGreaterThan(0);
    expect(audit.repairTo).toBe('running');
  }, 15_000);

  it('a successor entry after the ok settle blocks the stale envelope', async () => {
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(claiming, undefined, { runId: 'PT6' }).result;
    expect(outcome.status).toBe('ok');
    const raw = await store.load('PT6');
    const entries = raw.map((entry) => normalizeEntry(entry));
    const template = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
    );
    const last = entries[entries.length - 1];
    await store.append('PT6', {
      ...(template as JournalEntry),
      seq: (last?.seq ?? 0) + 1,
      value: { decisionType: 'successor-marker' },
    });
    const continued = await reload(store, 'PT6');
    const derived = persistedTerminalEnvelope({ runId: 'PT6', ...continued });
    expect(derived.available).toBe(false);
    if (derived.available) {
      return;
    }
    expect(derived.reason).toBe('not-terminal');
    expect(derived.message).toContain('past the settle');
  });
});
