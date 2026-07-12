/**
 * Matrix sweeps e2e under VCR (M11-T02): a sweep records against
 * the (fake) live adapters, its
 * claims carry EvidenceRef eval reports and commit through the
 * eval-committer identity, and the whole sweep replays hermetically
 * from the cassette with zero live calls.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  FileModelKnowledgeStore,
  InMemoryStore,
  type Engine,
  type ProviderAdapter,
} from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF, record, replay } from '@rulvar/testing';

import { goldenGrader } from './graders/golden.js';
import { runSweepMatrix, type SweepPool, type SweepReport } from './sweeps.js';

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'number' } },
  required: ['answer'],
  additionalProperties: false,
};

const mathWorkflow = defineWorkflow({ name: 'sweep-math' }, async (ctx) => {
  return await ctx.agent('Compute 6*7 and answer as JSON.', {
    agentType: 'worker',
    schema: ANSWER_SCHEMA,
  });
});

const summaryWorkflow = defineWorkflow({ name: 'sweep-summary' }, async (ctx) => {
  return await ctx.agent('Summarize the number 42 as JSON.', {
    agentType: 'worker',
    schema: ANSWER_SCHEMA,
  });
});

/** The fixed pool: one model, two taskClasses (extraction passes, judging fails). */
const POOL: SweepPool = {
  models: [{ model: FAKE_MODEL_REF, effort: 'medium' }],
  cases: [
    {
      taskClass: 'extraction',
      case: { workflow: mathWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
    },
    {
      taskClass: 'judging',
      case: { workflow: summaryWorkflow, args: null, graders: [goldenGrader({ answer: 41 })] },
    },
  ],
};

function engineOver(adapters: ProviderAdapter[]): Engine {
  return createEngine({
    adapters,
    stores: { journal: new InMemoryStore() },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      profiles: { worker: {} },
    },
  });
}

/** Deterministic projection: the report minus nothing (sweeps carry no wall clock). */
function project(report: SweepReport): unknown {
  return { reportId: report.reportId, cells: report.cells, claims: report.claims };
}

describe('matrix sweeps under VCR (M11-T02)', () => {
  it('records, emits committed eval-measured claims, and replays hermetically', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sweep-vcr-'));
    const cassette = join(dir, 'sweep.jsonl');
    const fake = new FakeAdapter({ agents: { worker: { answer: 42 } } });

    const store = new FileModelKnowledgeStore({ path: join(dir, 'rulvar.models.json') });
    const recorded = await runSweepMatrix(POOL, {
      reportId: 'sweep-2026-07-10',
      committerId: 'ci-evals',
      observedAt: '2026-07-10T00:00:00.000Z',
      engineFor: () => engineOver(record({ adapters: [fake], cassette })),
      store,
    });

    // Two cells: extraction passRate 1 (strength), judging passRate 0
    // (weakness): both cross a threshold and emit claims.
    expect(recorded.cells).toHaveLength(2);
    expect(recorded.claims).toHaveLength(2);
    const strength = recorded.claims.find((claim) => claim.polarity === 'strength');
    const weakness = recorded.claims.find((claim) => claim.polarity === 'weakness');
    expect(strength?.taskClass).toBe('extraction');
    expect(weakness?.taskClass).toBe('judging');
    // Claims carry EvidenceRef eval reports (the acceptance).
    for (const claim of recorded.claims) {
      expect(claim.evidence).toHaveLength(1);
      const evidence = claim.evidence[0];
      if (evidence?.kind !== 'eval') {
        throw new Error('sweep evidence must be an eval report ref');
      }
      expect(evidence.reportId).toBe('sweep-2026-07-10');
      expect(evidence.caseIds.length).toBeGreaterThan(0);
      expect(claim.metrics.graderId).toBe('eval-suite');
    }
    // Committed through the eval-committer identity.
    expect(recorded.committedVersion).toBe(1);
    const snapshot = await store.current();
    expect(snapshot.claims).toHaveLength(2);
    expect(snapshot.claims.every((claim) => claim.class === 'eval-measured')).toBe(true);
    expect(snapshot.claims.every((claim) => claim.author.id === 'ci-evals')).toBe(true);
    // The eval TTL table applied from observedAt (strength 90d, weakness 30d).
    expect(snapshot.claims.find((claim) => claim.polarity === 'strength')?.expiresAt).toBe(
      '2026-10-08T00:00:00.000Z',
    );
    expect(snapshot.claims.find((claim) => claim.polarity === 'weakness')?.expiresAt).toBe(
      '2026-08-09T00:00:00.000Z',
    );

    // Replay: hermetic, zero live surface, identical report (no store:
    // the replay proves the measurement, not the commit).
    const replayed = await runSweepMatrix(POOL, {
      reportId: 'sweep-2026-07-10',
      committerId: 'ci-evals',
      observedAt: '2026-07-10T00:00:00.000Z',
      engineFor: () => engineOver(replay({ cassette, onMiss: 'throw' })),
    });
    expect(project(replayed)).toEqual(project(recorded));
    expect(replayed.committedVersion).toBeUndefined();
  });

  it('emits no claim in the mid band (uninformative pass rates)', async () => {
    const fake = new FakeAdapter({ agents: { worker: { answer: 42 } } });
    const midPool: SweepPool = {
      models: [{ model: FAKE_MODEL_REF }],
      cases: [
        {
          taskClass: 'extraction',
          case: { workflow: mathWorkflow, args: null, graders: [goldenGrader({ answer: 42 })] },
        },
        {
          taskClass: 'extraction',
          case: { workflow: summaryWorkflow, args: null, graders: [goldenGrader({ answer: 41 })] },
        },
      ],
    };
    const report = await runSweepMatrix(midPool, {
      reportId: 'sweep-mid',
      committerId: 'ci-evals',
      observedAt: '2026-07-10T00:00:00.000Z',
      engineFor: () => engineOver([fake]),
    });
    // passRate 0.5 sits at the weakness default boundary: emits weakness.
    expect(report.cells[0]?.passRate).toBe(0.5);
    expect(report.claims).toHaveLength(1);
    // A tightened weakness threshold parks the same rate in the mid band.
    const tightened = await runSweepMatrix(midPool, {
      reportId: 'sweep-mid-2',
      committerId: 'ci-evals',
      observedAt: '2026-07-10T00:00:00.000Z',
      engineFor: () => engineOver([new FakeAdapter({ agents: { worker: { answer: 42 } } })]),
      thresholds: { weakness: 0.3 },
    });
    expect(tightened.claims).toHaveLength(0);
  });
});
