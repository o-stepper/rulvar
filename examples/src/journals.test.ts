/**
 * Production-journal replay (M9-T04): every dogfood journal under
 * journals/ replays
 * STRICT against its shipped workflow with zero live calls. Journals
 * are frozen fixtures (fixtures.sha256).
 *
 * Recording: RECORD_DOGFOOD=1 pnpm vitest run examples/src/journals.test.ts
 * re-runs each scenario live on FakeAdapter and rewrites the files; then
 * refresh the lock (node scripts/check-frozen-fixtures.mjs --update).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createEngine, InMemoryStore, type JournalEntry, type Workflow } from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF, replayRun, type FakeCall } from '@rulvar/testing';

import { judgePanel } from './judge-panel.js';

interface DogfoodJournal {
  id: string;
  note: string;
  workflow: string;
  args: unknown;
  entries: JournalEntry[];
}

const JOURNALS_URL = new URL('../../journals/', import.meta.url);
const BASE_MS = Date.parse('2026-02-01T00:00:00.000Z');

/** The shipped workflows dogfood journals may reference, by name. */
const WORKFLOWS: Record<string, Workflow<never, unknown>> = {
  judgePanel: judgePanel as unknown as Workflow<never, unknown>,
};

/** The deterministic responders each scenario recorded against. */
const RESPONDERS: Record<string, (call: FakeCall) => unknown> = {
  'judge-panel-fake': (call) => {
    const label = call.label ?? '';
    if (label.startsWith('judge-')) {
      const score = label.includes('risk-first') ? 9 : label.includes('user-first') ? 6 : 4;
      return JSON.stringify({ score, rationale: 'dogfood fixture' });
    }
    return `attempt for ${label}`;
  },
};

const SCENARIOS: Array<{ id: string; workflow: string; args: unknown; note: string }> = [
  {
    id: 'judge-panel-fake',
    workflow: 'judgePanel',
    args: { task: 'name the fastest sort' },
    note:
      'Dogfood journal (M9-T04): the shipped judge-panel example run end to end on ' +
      'FakeAdapter; replays strict with zero live calls.',
  },
];

function normalize(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.map((entry) => ({
    ...entry,
    spanId: 'fixture-span',
    startedAt: new Date(BASE_MS + entry.seq * 1000).toISOString(),
    ...(entry.endedAt === undefined
      ? {}
      : { endedAt: new Date(BASE_MS + entry.seq * 1000).toISOString() }),
  }));
}

async function recordScenario(scenario: (typeof SCENARIOS)[number]): Promise<void> {
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [new FakeAdapter({ agents: { '*': RESPONDERS[scenario.id] } })],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const workflow = WORKFLOWS[scenario.workflow];
  if (workflow === undefined) {
    throw new Error(`unknown workflow '${scenario.workflow}'`);
  }
  const outcome = await engine.run(workflow, scenario.args as never, { runId: 'dogfood' }).result;
  if (outcome.status !== 'ok') {
    throw new Error(`dogfood recording '${scenario.id}' ended '${outcome.status}'`);
  }
  const fixture: DogfoodJournal = {
    id: scenario.id,
    note: scenario.note,
    workflow: scenario.workflow,
    args: scenario.args,
    entries: normalize(await store.load('dogfood')),
  };
  writeFileSync(
    new URL(`${scenario.id}.json`, JOURNALS_URL),
    `${JSON.stringify(fixture, null, 2)}\n`,
  );
}

describe('production-journal replay (journals/)', () => {
  if (process.env.RECORD_DOGFOOD === '1') {
    for (const scenario of SCENARIOS) {
      it(`records ${scenario.id}`, async () => {
        await recordScenario(scenario);
      });
    }
    return;
  }

  const files = readdirSync(JOURNALS_URL).filter((file) => file.endsWith('.json'));
  it('the journals directory is not empty', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  for (const file of files) {
    it(`${file} replays strict with zero live calls`, async () => {
      const fixture = JSON.parse(
        readFileSync(new URL(file, JOURNALS_URL), 'utf8'),
      ) as DogfoodJournal;
      const workflow = WORKFLOWS[fixture.workflow];
      if (workflow === undefined) {
        throw new Error(
          `journals/${file} references unknown workflow '${fixture.workflow}'; register it ` +
            'in examples/src/journals.test.ts',
        );
      }
      const { outcome, preview } = await replayRun(workflow, fixture.args as never, {
        journal: fixture.entries,
      });
      expect(outcome.status).toBe('ok');
      expect(preview.misses).toBe(0);
      expect(preview.orphaned).toEqual([]);
    });
  }
});
