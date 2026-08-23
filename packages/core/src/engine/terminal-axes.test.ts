/**
 * The five terminal axes and their persistence (RV4403, the seventh
 * comparison experiment). The run settled `exhausted` with both judge
 * metas and the ten-unsupported count only inside `error.data`: the
 * outcome's top level read nothing, the settle recorded nothing, and
 * a restarted reader's production gate answered 'not-judged' about a
 * failure whose own message counted the findings. The matrix below
 * pins every path: the semantic facts ride the outcome, the journaled
 * settle, and the rebuilt envelope, live and restart byte-agreeing,
 * and absence keeps meaning NOT RECORDED on runs that never judged.
 */
import { describe, expect, it } from 'vitest';

import { FailRunError } from '../l0/errors.js';
import { normalizeEntry } from '../l0/entries.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { readRunMeta } from '../stores/meta-lookup.js';
import { lastRunSettle } from '../stores/reconcile.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { persistedTerminalEnvelope } from './persisted-terminal.js';
import { scriptedAdapter } from './test-harness.js';

const USAGE = {
  inputTokens: 1000,
  outputTokens: 100,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/** The seventh run's judged facts, in the settle-worthy shapes. */
const CLAIM_META = {
  judgeInvoked: true,
  coverage: 'partial',
  judgedStage: 'final' as const,
  judgedHash: 'c'.repeat(64),
  findings: 0,
  draftCitingSentences: 105,
  coveredCitingSentences: 82,
};
const AUDIT_META = {
  sampled: 24,
  supported: 8,
  partial: 6,
  unsupported: 10,
  auditedHash: 'c'.repeat(64),
};
const VERDICT = {
  verdict: 'findings',
  finalHash: 'c'.repeat(64),
  coverage: 'partial',
  contradictions: 0,
  unsupportedCitations: 10,
  partialCitations: 6,
  semanticRepairRounds: 0,
  judgeFailures: [] as string[],
};

function engineOver(store: InMemoryStore) {
  return createEngine({
    adapters: [scriptedAdapter(() => ({ text: 'done', usage: USAGE }))],
    stores: { journal: store },
    defaults: { routing: { loop: 'fake:model' } },
  });
}

async function reload(store: InMemoryStore, runId: string) {
  const entries = (await store.load(runId)).map((raw) => normalizeEntry(raw));
  const meta = await readRunMeta(store, runId);
  return { entries, meta };
}

describe('the five terminal axes persist on every path (RV4403)', () => {
  it("the seventh run's shape: a typed failure carries the metas and the verdict everywhere", async () => {
    // The exact class: error.data holds completion, both metas and
    // the verdict; the value path holds nothing.
    const failing = defineWorkflow({ name: 'seventh' }, async (ctx) => {
      await ctx.agent('work');
      throw new FailRunError(
        'the semantic repair round could not dispatch; 10 unsupported citations stand',
        {
          data: {
            source: 'orchestrator_claim_consistency',
            completion: 'rejected',
            claimConsistencyMeta: CLAIM_META,
            citationAuditMeta: AUDIT_META,
            semanticTerminalVerdict: VERDICT,
          },
        },
      );
    });
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(failing, undefined, { runId: 'AX1' }).result;
    expect(outcome.status).toBe('error');
    // Axis by axis on the LIVE outcome.
    expect(outcome.completion).toBe('rejected');
    expect(outcome.claimConsistencyMeta).toMatchObject({ coveredCitingSentences: 82 });
    expect(outcome.citationAuditMeta).toMatchObject({ unsupported: 10, sampled: 24 });
    expect(outcome.semanticTerminalVerdict).toMatchObject({
      verdict: 'findings',
      unsupportedCitations: 10,
    });
    expect(outcome.envelope.citationAuditMeta).toMatchObject({ unsupported: 10 });
    expect(outcome.envelope.semanticTerminalVerdict).toMatchObject({ verdict: 'findings' });

    // The journaled settle recorded the same facts.
    const { entries, meta } = await reload(store, 'AX1');
    const settle = lastRunSettle(entries);
    expect(settle?.runStatus).toBe('error');
    expect(settle?.citationAuditMeta).toMatchObject({ unsupported: 10, sampled: 24 });
    expect(settle?.semanticTerminalVerdict).toMatchObject({ verdict: 'findings' });
    expect(settle?.claimConsistencyMeta).toMatchObject({ judgedHash: 'c'.repeat(64) });

    // The restart parity: the rebuilt envelope carries the same
    // judged hash, the same counts, the same one-word verdict.
    const derived = persistedTerminalEnvelope({
      runId: 'AX1',
      meta,
      entries,
      priceUsd: () => undefined,
    });
    expect(derived.available).toBe(true);
    if (!derived.available) {
      return;
    }
    expect(derived.envelope.provenance).toBe('journal');
    expect(derived.envelope.citationAuditMeta).toEqual(outcome.envelope.citationAuditMeta);
    expect(derived.envelope.semanticTerminalVerdict).toEqual(
      outcome.envelope.semanticTerminalVerdict,
    );
    expect(derived.envelope.claimConsistencyMeta).toEqual(outcome.envelope.claimConsistencyMeta);
  });

  it('a typed failure WITHOUT a completion literal still settles its semantic facts', async () => {
    // The RV4403 core: the completion lift requires a completion, so
    // this shape used to drop every semantic fact on the floor.
    const failing = defineWorkflow({ name: 'no-completion' }, async (ctx) => {
      await ctx.agent('work');
      throw new FailRunError('judged and failed with no completion claim', {
        data: {
          source: 'orchestrator_citation_audit',
          citationAuditMeta: AUDIT_META,
          semanticTerminalVerdict: VERDICT,
        },
      });
    });
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(failing, undefined, { runId: 'AX2' }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.completion).toBeUndefined();
    expect(outcome.citationAuditMeta).toMatchObject({ unsupported: 10 });
    expect(outcome.semanticTerminalVerdict).toMatchObject({ verdict: 'findings' });
    const { entries } = await reload(store, 'AX2');
    const settle = lastRunSettle(entries);
    expect(settle?.completion).toBeUndefined();
    expect(settle?.citationAuditMeta).toMatchObject({ unsupported: 10 });
    expect(settle?.semanticTerminalVerdict).toMatchObject({ verdict: 'findings' });
  });

  it('an accepted run carries the same axes green, live and restarted', async () => {
    const accepted = defineWorkflow({ name: 'accepted' }, async (ctx) => {
      await ctx.agent('work');
      return {
        result: 'done',
        completion: 'complete' as const,
        deliverableAccepted: true,
        resultAvailable: true,
        claimConsistencyMeta: { ...CLAIM_META, coverage: 'full' },
        citationAuditMeta: { ...AUDIT_META, unsupported: 0, supported: 18 },
        semanticTerminalVerdict: {
          ...VERDICT,
          verdict: 'clean',
          coverage: 'full',
          unsupportedCitations: 0,
          partialCitations: 6,
        },
      };
    });
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(accepted, undefined, { runId: 'AX3' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.deliverableAccepted).toBe(true);
    expect(outcome.citationAuditMeta).toMatchObject({ unsupported: 0 });
    expect(outcome.envelope.semanticTerminalVerdict).toMatchObject({ verdict: 'clean' });
    const { entries, meta } = await reload(store, 'AX3');
    const settle = lastRunSettle(entries);
    expect(settle?.deliverableAccepted).toBe(true);
    expect(settle?.citationAuditMeta).toMatchObject({ unsupported: 0 });
    expect(settle?.semanticTerminalVerdict).toMatchObject({ verdict: 'clean' });
    const derived = persistedTerminalEnvelope({
      runId: 'AX3',
      meta,
      entries,
      priceUsd: () => undefined,
    });
    expect(derived.available).toBe(true);
    if (derived.available) {
      expect(derived.envelope.semanticTerminalVerdict).toEqual(
        outcome.envelope.semanticTerminalVerdict,
      );
      expect(derived.envelope.citationAuditMeta).toEqual(outcome.envelope.citationAuditMeta);
    }
  });

  it('a run that never judged keeps every semantic axis ABSENT: not recorded, never a verdict', async () => {
    const plain = defineWorkflow({ name: 'plain' }, async (ctx) => {
      await ctx.agent('work');
      return { result: 'done', completion: 'complete' as const };
    });
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(plain, undefined, { runId: 'AX4' }).result;
    expect(outcome.citationAuditMeta).toBeUndefined();
    expect(outcome.semanticTerminalVerdict).toBeUndefined();
    expect(outcome.envelope.citationAuditMeta).toBeUndefined();
    const { entries } = await reload(store, 'AX4');
    const settle = lastRunSettle(entries);
    expect(settle?.citationAuditMeta).toBeUndefined();
    expect(settle?.semanticTerminalVerdict).toBeUndefined();
  });

  it('a malformed persisted verdict reads back as NOT RECORDED, never as a claim', async () => {
    // Defensive read-back: a foreign journal carrying a garbage
    // verdict literal or a partial audit meta must not read as one.
    const failing = defineWorkflow({ name: 'foreign' }, async (ctx) => {
      await ctx.agent('work');
      throw new FailRunError('foreign shapes', {
        data: {
          source: 'orchestrator_claim_consistency',
          citationAuditMeta: { sampled: 'many', unsupported: 10 },
          semanticTerminalVerdict: { verdict: 'greenish' },
        },
      });
    });
    const store = new InMemoryStore();
    await engineOver(store).run(failing, undefined, { runId: 'AX5' }).result;
    const { entries } = await reload(store, 'AX5');
    const settle = lastRunSettle(entries);
    expect(settle?.citationAuditMeta).toBeUndefined();
    expect(settle?.semanticTerminalVerdict).toBeUndefined();
  });
});
