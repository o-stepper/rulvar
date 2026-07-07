import { readFileSync } from 'node:fs';

import type { InMemoryStore } from '@lurker/core';
import { createEngine, InMemoryStore as Store } from '@lurker/core';
import { FAKE_MODEL_REF, FakeAdapter } from '@lurker/testing';
import { describe, expect, it } from 'vitest';

import {
  runPlannerSelfRepair,
  runSandboxDeterminism,
  SELF_REPAIR_BAD_DRAFT,
  SELF_REPAIR_GOOD_DRAFT,
  type M6CassetteFixture,
} from './cassettes.js';
import { WorkerSandboxRunner } from './sandbox-runner.js';

const WORKER_URL = new URL('../dist/sandbox-worker.js', import.meta.url);

function cassette(id: string): M6CassetteFixture {
  const url = new URL(`../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M6CassetteFixture;
}

const echoAdapter = (): FakeAdapter =>
  new FakeAdapter({ agents: { '*': (call) => `answer to ${call.prompt}` } });

const plannerAdapter = (): FakeAdapter =>
  new FakeAdapter({
    agents: {
      '*': (call) =>
        call.prompt.includes('DIAGNOSTICS (JSON)') ? SELF_REPAIR_GOOD_DRAFT : SELF_REPAIR_BAD_DRAFT,
    },
  });

describe('M6 gating cassettes (M6-T11; docs/09 6.10)', () => {
  it('sandbox-determinism: two fresh runs produce identical journals matching the cassette', async () => {
    const committed = cassette('sandbox-determinism');
    const first = await runSandboxDeterminism({
      workerUrl: WORKER_URL,
      makeAdapter: echoAdapter,
      modelRef: FAKE_MODEL_REF,
    });
    const second = await runSandboxDeterminism({
      workerUrl: WORKER_URL,
      makeAdapter: echoAdapter,
      modelRef: FAKE_MODEL_REF,
    });
    // Identical journals across two fresh runs (seeded shims, JSON
    // boundary), byte-for-byte after the wall-clock normalization.
    expect(JSON.stringify(second, null, 2)).toBe(JSON.stringify(first, null, 2));
    // The committed cassette is the compatibility contract.
    expect(first).toEqual(committed.entries);
  });

  it('planner-self-repair: the draft round-trips through repair and matches the cassette', async () => {
    const committed = cassette('planner-self-repair');
    const fresh = await runPlannerSelfRepair({
      makeAdapter: plannerAdapter,
      modelRef: FAKE_MODEL_REF,
    });
    expect(fresh.planned.source).toContain('now()');
    expect(fresh.planned.source).not.toContain('Date.now');
    expect(fresh.entries).toEqual(committed.entries);
  });

  it('planner-self-repair: re-planning from the committed journal is free and executes deterministically', async () => {
    const committed = cassette('planner-self-repair');
    const store: InMemoryStore = new Store();
    const coldAdapter = new FakeAdapter({
      agents: {
        '*': () => {
          throw new Error('the planner was re-paid on replay');
        },
      },
    });
    const replayed = await runPlannerSelfRepair({
      makeAdapter: () => coldAdapter,
      modelRef: FAKE_MODEL_REF,
      store,
      seedEntries: committed.entries,
    });
    expect(coldAdapter.calls).toHaveLength(0);
    expect(replayed.planned.source).toContain('now()');

    // The accepted script executes deterministically in the sandbox.
    const runEngine = createEngine({
      adapters: [new FakeAdapter({ agents: { '*': 'corpus summary' } })],
      defaults: { routing: { loop: FAKE_MODEL_REF } },
      runners: { sandbox: new WorkerSandboxRunner({ workerUrl: WORKER_URL }) },
    });
    const outcome = await runEngine.run(replayed.planned.workflow, null, {
      runId: 'm6-self-repair-exec',
    }).result;
    expect(outcome.status).toBe('ok');
    expect((outcome.value as { summary: string }).summary).toBe('corpus summary');
  });
});
