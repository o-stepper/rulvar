/**
 * The canary fingerprint (M11-T04; docs/05, section "Grounding and
 * decay"): a mutated fake model changes the fingerprint, and the drift
 * flips exactly the fingerprinted eval claims of that model to stale
 * in one command.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  FileModelKnowledgeStore,
  InMemoryStore,
  type Engine,
  type ProviderAdapter,
} from '@lurker/core';
import { FakeAdapter, FAKE_MODEL_REF } from '@lurker/testing';

import { canaryFingerprint, flipStaleOnCanaryDrift, normalizeCanaryOutput } from './canary.js';
import { commitEvalMeasured, type MeasuredClaimInput } from './committer.js';

const PROBES = { agentType: 'probe', prompts: ['probe alpha', 'probe beta'] };

function engineOver(adapters: ProviderAdapter[]): Engine {
  return createEngine({
    adapters,
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: FAKE_MODEL_REF }, profiles: { probe: {} } },
  });
}

function measured(id: string, fingerprint?: string): MeasuredClaimInput {
  return {
    id,
    subject: { model: FAKE_MODEL_REF },
    taskClass: 'code-edit',
    polarity: 'weakness',
    statement: 'sweep passRate 0.40 over 5 code-edit cases: in the weakness band',
    metrics: { passRate: 0.4, n: 5, graderId: 'eval-suite' },
    confidence: 'medium',
    observedAt: '2026-07-10T00:00:00.000Z',
    evidence: [{ kind: 'eval', reportId: 'sweep-1', caseIds: ['a'] }],
    ...(fingerprint === undefined ? {} : { modelEpoch: { canaryFingerprint: fingerprint } }),
  };
}

describe('the canary fingerprint (M11-T04; OQ-06)', () => {
  it('normalization is NFC, trim, and whitespace collapse', () => {
    expect(normalizeCanaryOutput('  a\n\n b\tc  ')).toBe('a b c');
    expect(normalizeCanaryOutput({ answer: 42 })).toBe('{"answer":42}');
  });

  it('identical models fingerprint identically; a mutation drifts it', async () => {
    const responder = { agents: { probe: 'steady output' } };
    const first = await canaryFingerprint(engineOver([new FakeAdapter(responder)]), PROBES);
    const second = await canaryFingerprint(engineOver([new FakeAdapter(responder)]), PROBES);
    expect(first).toBe(second);
    const mutated = await canaryFingerprint(
      engineOver([new FakeAdapter({ agents: { probe: 'SILENTLY REPOINTED output' } })]),
      PROBES,
    );
    expect(mutated).not.toBe(first);
    // A probe-set edit never collides with drift (the count prefix).
    const fewerProbes = await canaryFingerprint(engineOver([new FakeAdapter(responder)]), {
      agentType: 'probe',
      prompts: ['probe alpha'],
    });
    expect(fewerProbes).not.toBe(first);
  });

  it('drift flips exactly the fingerprinted claims of the model, in one command', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lurker-canary-'));
    const store = new FileModelKnowledgeStore({ path: join(dir, 'lurker.models.json') });
    const baseline = await canaryFingerprint(
      engineOver([new FakeAdapter({ agents: { probe: 'steady output' } })]),
      PROBES,
    );
    await commitEvalMeasured(
      store,
      [measured('with-baseline', baseline), measured('no-baseline')],
      { committerId: 'ci-evals', reportId: 'sweep-1' },
    );

    // The same fingerprint: nothing flips.
    const same = await flipStaleOnCanaryDrift(store, FAKE_MODEL_REF, baseline);
    expect(same.flipped).toEqual([]);

    // The model drifted: exactly the fingerprinted claim flips.
    const drifted = await canaryFingerprint(
      engineOver([new FakeAdapter({ agents: { probe: 'SILENTLY REPOINTED output' } })]),
      PROBES,
    );
    const report = await flipStaleOnCanaryDrift(store, FAKE_MODEL_REF, drifted);
    expect(report.flipped).toEqual(['with-baseline']);
    expect(report.version).toBe(2);
    const snapshot = await store.current();
    expect(snapshot.claims.find((claim) => claim.id === 'with-baseline')?.status).toBe('stale');
    // No recorded fingerprint means no baseline: untouched (documented).
    expect(snapshot.claims.find((claim) => claim.id === 'no-baseline')?.status).toBe('active');

    // Idempotent: the second command flips nothing further.
    const again = await flipStaleOnCanaryDrift(store, FAKE_MODEL_REF, drifted);
    expect(again.flipped).toEqual([]);
    expect((await store.current()).version).toBe(2);
  });
});
