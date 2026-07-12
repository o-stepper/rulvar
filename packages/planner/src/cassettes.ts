/**
 * The M6 gating cassette scenarios owned by the planner (M6-T11):
 * sandbox-determinism and planner-self-repair.
 * The scenario builders are exported so scripts/record-m6-cassettes.mjs
 * and the replay tests execute EXACTLY one implementation; the committed
 * cassette bytes are the compatibility contract.
 */
import type { Engine, JournalEntry, Json, ModelSpec } from '@rulvar/core';
import { createEngine, InMemoryStore } from '@rulvar/core';

import { compileScript } from './compile.js';
import { plan, planRunIdOf, type PlanResult } from './plan.js';
import { WorkerSandboxRunner } from './sandbox-runner.js';

/** The M3-convention cassette normalization: wall clock and spans only. */
export function normalizeCassetteEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.map((entry) => ({
    ...entry,
    spanId: 'fixture-span',
    startedAt: '2026-02-01T00:00:00.000Z',
    ...(entry.endedAt === undefined ? {} : { endedAt: '2026-02-01T00:00:00.000Z' }),
  }));
}

export const SANDBOX_DETERMINISM_RUN_ID = 'm6-sandbox-determinism';

/** A script exercising agents, parallel, step, and every seeded shim. */
export const SANDBOX_DETERMINISM_SOURCE: string = [
  "const first = await agent('probe alpha');",
  "const both = await parallel([() => agent('branch zero'), () => agent('branch one')]);",
  "const folded = await step('fold', () => [first, ...both].join(' | '), { deps: [now()] });",
  "log('info', 'progress ' + random());",
  'return { folded, id: uuid(), at: now() };',
].join('\n');

export interface FakeAdapterLike {
  id: string;
  caps: (model: string) => unknown;
  stream: (req: unknown, signal?: AbortSignal) => AsyncIterable<unknown>;
}

/**
 * One fresh sandbox-determinism run on a fresh store; two invocations
 * with the same worker produce byte-identical normalized journals (the
 * cassette assertion). The adapter factory keeps @rulvar/testing out of
 * the planner's dependency graph.
 */
export async function runSandboxDeterminism(options: {
  workerUrl: URL;
  makeAdapter: () => unknown;
  modelRef: string;
}): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [options.makeAdapter() as never],
    stores: { journal: store },
    defaults: {
      routing: {
        loop: options.modelRef as ModelSpec,
        extract: options.modelRef as ModelSpec,
      },
    },
    runners: { sandbox: new WorkerSandboxRunner({ workerUrl: options.workerUrl }) },
  });
  const workflow = compileScript(SANDBOX_DETERMINISM_SOURCE);
  const outcome = await engine.run(workflow, null, { runId: SANDBOX_DETERMINISM_RUN_ID }).result;
  if (outcome.status !== 'ok') {
    throw new Error(`sandbox-determinism run settled '${outcome.status}'`);
  }
  return normalizeCassetteEntries(await store.load(SANDBOX_DETERMINISM_RUN_ID));
}

export const SELF_REPAIR_GOAL = 'm6 cassette: summarize the corpus';

/** The failing first draft: bare Date.now trips rulvar/no-bare-date. */
export const SELF_REPAIR_BAD_DRAFT: string = [
  '```js',
  'const startedAt = Date.now();',
  "const summary = await agent('summarize the corpus');",
  'return { startedAt, summary };',
  '```',
].join('\n');

/** The repaired draft the fake planner returns once diagnostics arrive. */
export const SELF_REPAIR_GOOD_DRAFT: string = [
  '```js',
  'const startedAt = now();',
  "const summary = await agent('summarize the corpus');",
  'return { startedAt, summary };',
  '```',
].join('\n');

export const SELF_REPAIR_RUN_ID: string = planRunIdOf(SELF_REPAIR_GOAL);

/**
 * One planner-self-repair run: the first draft fails lint, the JSON
 * diagnostics ride the repair prompt, the second draft compiles. Returns
 * the normalized planning journal plus the plan result.
 */
export async function runPlannerSelfRepair(options: {
  makeAdapter: () => unknown;
  modelRef: string;
  store?: InMemoryStore;
  seedEntries?: JournalEntry[];
}): Promise<{ entries: JournalEntry[]; planned: PlanResult; engine: Engine }> {
  const store = options.store ?? new InMemoryStore();
  if (options.seedEntries !== undefined) {
    for (const entry of options.seedEntries) {
      await store.append(SELF_REPAIR_RUN_ID, entry);
    }
  }
  const engine = createEngine({
    adapters: [options.makeAdapter() as never],
    stores: { journal: store },
    defaults: { routing: { plan: options.modelRef as ModelSpec } },
  });
  const planned = await plan(engine, SELF_REPAIR_GOAL);
  return {
    entries: normalizeCassetteEntries(await store.load(SELF_REPAIR_RUN_ID)),
    planned,
    engine,
  };
}

/** The cassette file shape shared with the M3 sets. */
export interface M6CassetteFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
  extra?: Json;
}
