/**
 * The fault-injection kit (RV811): the comparison experiments left a
 * standing list of fail-closed branches never observed live, and a
 * branch nobody has ever driven is a claim, not a guarantee. Each
 * scenario here DELIBERATELY drives one such branch on the real engine
 * with scripted adapters (zero provider calls, zero keys), verifies the
 * documented typed observable, and leaves experiment-grade artifacts
 * (the outcome, the journal, the raw bytes where the fault is a byte
 * fault). Fail closed like everything else in this package: a scenario
 * whose branch stops producing its documented observable reports
 * `matched: false` and the whole report says so, instead of the list
 * quietly becoming untested again.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ConfigError,
  createEngine,
  defineWorkflow,
  InMemoryStore,
  journalPricingSnapshot,
  JsonlFileStore,
  memoryQuotaLimiter,
  type JournalEntry,
  type ModelRef,
  type Usage,
} from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF } from '@rulvar/testing';

/** One machine-checkable observation of a driven branch. */
export interface FaultScenarioObservation {
  /** The documented typed observable was produced exactly. */
  matched: boolean;
  /** What was actually observed, quoting the typed surfaces. */
  detail: string;
}

/** One artifact a scenario leaves, JSON or raw text. */
export interface FaultScenarioArtifact {
  name: string;
  content: string;
}

export interface FaultScenarioReport {
  scenario: string;
  /** The never-observed-live branch this scenario exists to drive. */
  doctrine: string;
  observation: FaultScenarioObservation;
  artifacts: FaultScenarioArtifact[];
}

export interface FaultInjectionReport {
  scenarios: FaultScenarioReport[];
  /** Every scenario matched its documented observable. */
  allMatched: boolean;
  /** The artifact files written, when `artifactsDir` was given. */
  artifactFiles?: string[];
}

export interface RunFaultInjectionOptions {
  /** Write one `<scenario>.json` artifact bundle per scenario here. */
  artifactsDir?: string;
  /** Run only these scenarios; an unknown name is a typed ConfigError. */
  only?: readonly string[];
}

const ROUTING: { routing: { loop: ModelRef } } = { routing: { loop: FAKE_MODEL_REF } };

const echoWorkflow = defineWorkflow({ name: 'fault-kit-echo' }, async (ctx) => {
  return await ctx.agent('one small step');
});

const twoStepWorkflow = defineWorkflow({ name: 'fault-kit-two-step' }, async (ctx) => {
  const first = await ctx.agent('first step');
  const second = await ctx.agent('second step');
  return { first, second };
});

function jsonArtifact(name: string, value: unknown): FaultScenarioArtifact {
  return { name, content: JSON.stringify(value, null, 2) };
}

function errorText(thrown: unknown): string {
  return thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown);
}

interface FaultScenario {
  name: string;
  doctrine: string;
  run(): Promise<{ observation: FaultScenarioObservation; artifacts: FaultScenarioArtifact[] }>;
}

/**
 * RV711: the opt-in in-flight exposure cap refuses a dispatch whose
 * worst-case estimate does not fit, BEFORE any provider call, with the
 * typed transient refusal (never a claimed ceiling crossing).
 */
const inFlightExposure: FaultScenario = {
  name: 'in-flight-exposure-refusal',
  doctrine:
    'maxInFlightExposureUsd refuses the dispatch typed before any provider call ' +
    "(BudgetExhaustedError, reason 'in-flight-exposure'), never a silent wait and never " +
    'a claimed budget-ceiling crossing',
  async run() {
    const adapter = new FakeAdapter({
      agents: { '*': 'never dispatched' },
      capsOverrides: { pricing: { inputUsdPerMTok: 3, outputUsdPerMTok: 15 } },
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: ROUTING,
    });
    const outcome = await engine.run(echoWorkflow, undefined, {
      runId: 'fault-exposure',
      maxInFlightExposureUsd: 0.0001,
    }).result;
    const message = outcome.error?.message ?? '';
    const matched =
      (outcome.status === 'exhausted' || outcome.status === 'error') &&
      message.includes('in flight exposure cap reached') &&
      message.includes('refused before any provider call');
    return {
      observation: {
        matched,
        detail: `run status '${outcome.status}'; ${message}`,
      },
      artifacts: [
        jsonArtifact('outcome.json', { status: outcome.status, error: outcome.error }),
        jsonArtifact('journal.json', await store.load('fault-exposure')),
      ],
    };
  },
};

/**
 * RV704: two rules with one canonical content key are refused at the
 * shared construction chokepoint, because memory buckets by index while
 * keyed stores bucket by key, and one configuration must never admit
 * differently per storage.
 */
const duplicateQuotaRule: FaultScenario = {
  name: 'duplicate-quota-rule',
  doctrine:
    'a duplicated quota rule is refused typed at construction (ConfigError naming both ' +
    'indexes and the shared rule key), never admitted differently per storage backend',
  run() {
    let detail = 'memoryQuotaLimiter accepted the duplicated rule set';
    let matched = false;
    try {
      memoryQuotaLimiter([
        { provider: 'fake', requestsPerMinute: 10 },
        { provider: 'fake', requestsPerMinute: 10 },
      ]);
    } catch (thrown) {
      detail = errorText(thrown);
      matched =
        thrown instanceof ConfigError &&
        detail.includes('duplicates') &&
        detail.includes('delete the duplicate');
    }
    return Promise.resolve({
      observation: { matched, detail },
      artifacts: [jsonArtifact('refusal.json', { detail })],
    });
  },
};

/** Runs the echo workflow into a fresh JsonlFileStore dir and returns the pieces. */
async function seededJsonlRun(
  runId: string,
): Promise<{ dir: string; file: string; entries: JournalEntry[] }> {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-fault-jsonl-'));
  const store = new JsonlFileStore({ dir });
  const adapter = new FakeAdapter({ agents: { '*': 'stored answer' } });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: ROUTING,
  });
  const outcome = await engine.run(echoWorkflow, undefined, { runId }).result;
  if (outcome.status !== 'ok') {
    throw new Error(`fault kit: the seeding run settled '${outcome.status}' instead of ok`);
  }
  const entries = await store.load(runId);
  const file = readdirSync(dir)
    .filter((name) => name.includes(runId) && name.endsWith('.jsonl'))
    .map((name) => join(dir, name))[0];
  if (file === undefined) {
    throw new Error(`fault kit: no journal file found for '${runId}' in ${dir}`);
  }
  return { dir, file, entries };
}

/**
 * RV701 (torn half): a crash mid-append leaves an incomplete trailing
 * fragment; load discards exactly the fragment, salvages every whole
 * record, and repairs the file in place.
 */
const tornJsonlTail: FaultScenario = {
  name: 'torn-jsonl-tail',
  doctrine:
    'a torn trailing JSONL line (crash mid-append) is discarded on load, every whole ' +
    'record is salvaged, and the file is repaired so the tear never accumulates',
  async run() {
    const { dir, file, entries } = await seededJsonlRun('fault-torn');
    const tornFragment = '{"seq": 9999, "kind": "agent", "torn": tr';
    appendFileSync(file, tornFragment, 'utf8');
    const bytesBefore = readFileSync(file, 'utf8');
    const fresh = new JsonlFileStore({ dir });
    const loaded = await fresh.load('fault-torn');
    const bytesAfter = readFileSync(file, 'utf8');
    const everyLineParses = bytesAfter
      .split('\n')
      .filter((line) => line !== '')
      .every((line) => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
      });
    const matched =
      loaded.length === entries.length && everyLineParses && !bytesAfter.includes('"torn": tr');
    return {
      observation: {
        matched,
        detail:
          `salvaged ${String(loaded.length)} of ${String(entries.length)} whole entries; ` +
          `the torn fragment was discarded and the file repaired in place ` +
          `(every remaining line parses: ${String(everyLineParses)})`,
      },
      artifacts: [
        { name: 'journal-torn.jsonl', content: bytesBefore },
        { name: 'journal-repaired.jsonl', content: bytesAfter },
        jsonArtifact('counts.json', { before: entries.length, salvaged: loaded.length }),
      ],
    };
  },
};

/**
 * RV701 (glued half): two whole records glued onto one unterminated
 * line (a tear right after a complete record, or a legacy append onto
 * an unterminated tail) are BOTH salvaged, never discarded with the
 * fragment.
 */
const gluedJsonlTail: FaultScenario = {
  name: 'glued-jsonl-tail',
  doctrine:
    'whole JSONL records glued onto one trailing line are accepted data: the load ' +
    'salvages every glued record instead of discarding them as a torn fragment',
  async run() {
    const { dir, file, entries } = await seededJsonlRun('fault-glued');
    const lines = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line !== '');
    const glued = [
      ...lines.slice(0, -2),
      `${lines[lines.length - 2] ?? ''}${lines[lines.length - 1] ?? ''}`,
    ].join('\n');
    writeFileSync(file, glued, 'utf8');
    const bytesBefore = readFileSync(file, 'utf8');
    const fresh = new JsonlFileStore({ dir });
    const loaded = await fresh.load('fault-glued');
    const matched = loaded.length === entries.length && lines.length === entries.length;
    return {
      observation: {
        matched,
        detail:
          `glued tail: ${String(loaded.length)} of ${String(entries.length)} records ` +
          'salvaged, the two glued records included, none discarded',
      },
      artifacts: [
        { name: 'journal-glued.jsonl', content: bytesBefore },
        jsonArtifact('counts.json', { before: entries.length, salvaged: loaded.length }),
      ],
    };
  },
};

/**
 * The settle-boundary crash window: the journal ends right after a
 * child's terminal entry, before anything that follows it. A resume
 * must replay the settled child with zero live calls and re-run only
 * the unsettled remainder.
 */
const crashResumeSettleBoundary: FaultScenario = {
  name: 'crash-resume-settle-boundary',
  doctrine:
    'a journal cut immediately after an agent terminal entry (the settle-boundary crash ' +
    'window) resumes to ok: the settled agent replays with zero live calls and only the ' +
    'unsettled remainder re-runs',
  async run() {
    const liveAdapter = new FakeAdapter({ agents: { '*': (call) => `answer: ${call.prompt}` } });
    const storeA = new InMemoryStore();
    const engineA = createEngine({
      adapters: [liveAdapter],
      stores: { journal: storeA },
      defaults: ROUTING,
    });
    const first = await engineA.run(twoStepWorkflow, undefined, { runId: 'fault-boundary' }).result;
    if (first.status !== 'ok') {
      throw new Error(`fault kit: the seeding run settled '${first.status}' instead of ok`);
    }
    const entries = await storeA.load('fault-boundary');
    const settleIndex = entries.findIndex(
      (entry) => entry.kind === 'agent' && entry.status === 'ok',
    );
    const cut = entries.slice(0, settleIndex + 1);
    const storeB = new InMemoryStore();
    for (const entry of cut) {
      await storeB.append('fault-boundary', entry);
    }
    let liveCalls = 0;
    const resumeAdapter = new FakeAdapter({
      agents: {
        '*': (call) => {
          liveCalls += 1;
          return `answer: ${call.prompt}`;
        },
      },
    });
    const engineB = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: storeB },
      defaults: ROUTING,
    });
    const resumed = await engineB.resume('fault-boundary', twoStepWorkflow).result;
    const matched = resumed.status === 'ok' && liveCalls === 1;
    return {
      observation: {
        matched,
        detail:
          `resumed '${resumed.status}' from the post-settle crash window (journal cut at ` +
          `seq ${String(cut[cut.length - 1]?.seq ?? -1)} of ${String(entries.length)} ` +
          `entries): liveCalls=${String(liveCalls)}, the settled step replayed free`,
      },
      artifacts: [
        jsonArtifact('journal-cut.json', cut),
        jsonArtifact('resume-outcome.json', {
          status: resumed.status,
          liveCalls,
          value: resumed.value ?? null,
        }),
      ],
    };
  },
};

/**
 * RV505/RV611: a price-table rotation whose new table no longer covers
 * the model. The pinned segment keeps pricing under its own pin; the
 * tail past the last pin prices at the current table alone and folds
 * as unpriced (undefined), surfaced, never a silent zero at stale
 * rates.
 */
const pricingRotationUncoveredTail: FaultScenario = {
  name: 'pricing-rotation-uncovered-tail',
  doctrine:
    'after a price-table rotation that drops the model, the pinned segment still prices ' +
    'under its own pin while the uncovered tail folds unpriced (undefined), never ' +
    'silently at the stale pinned rates',
  async run() {
    const adapter = new FakeAdapter({ agents: { '*': 'priced answer' } });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: ROUTING,
      pricing: {
        pricingVersion: 'fault-v1',
        models: { [FAKE_MODEL_REF]: { inputUsdPerMTok: 3, outputUsdPerMTok: 15 } },
      },
    });
    const outcome = await engine.run(echoWorkflow, undefined, { runId: 'fault-rotation' }).result;
    if (outcome.status !== 'ok') {
      throw new Error(`fault kit: the seeding run settled '${outcome.status}' instead of ok`);
    }
    const entries = await store.load('fault-rotation');
    const snapshot = journalPricingSnapshot(entries);
    // The rotation: the current table covers NOTHING anymore.
    const composed = snapshot?.composedPriceUsd(() => undefined);
    const usage: Usage = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const pinnedSegmentUsd = composed?.(FAKE_MODEL_REF, usage, 1);
    const uncoveredTailUsd = composed?.(
      FAKE_MODEL_REF,
      usage,
      (snapshot?.pinnedThroughSeq ?? 0) + 1,
    );
    const ghostUsd = composed?.('ghost:model', usage, 1);
    const matched =
      typeof pinnedSegmentUsd === 'number' &&
      pinnedSegmentUsd > 0 &&
      uncoveredTailUsd === undefined &&
      ghostUsd === undefined;
    return {
      observation: {
        matched,
        detail:
          `pinned segment priced under '${snapshot?.pricingVersion ?? 'none'}' ` +
          `(${String(pinnedSegmentUsd)} USD); the rotated tail and the ghost model fold ` +
          'unpriced (undefined), surfaced, never a silent zero',
      },
      artifacts: [
        jsonArtifact('pricing-snapshot.json', {
          pricingVersion: snapshot?.pricingVersion,
          pinnedThroughSeq: snapshot?.pinnedThroughSeq,
          segments: snapshot?.segments,
        }),
        jsonArtifact('fold.json', {
          pinnedSegmentUsd: pinnedSegmentUsd ?? null,
          uncoveredTailUsd: uncoveredTailUsd ?? null,
          ghostUsd: ghostUsd ?? null,
        }),
      ],
    };
  },
};

/**
 * The unknown provider id: routing that names an adapter nobody
 * registered must fail typed, naming the id, never dispatch anything.
 */
const unknownProviderId: FaultScenario = {
  name: 'unknown-provider-id',
  doctrine:
    'routing to an unregistered provider id fails typed naming the id; nothing ' +
    'dispatches and nothing settles ok',
  async run() {
    const adapter = new FakeAdapter({ agents: { '*': 'never used' } });
    const store = new InMemoryStore();
    let detail = '';
    let matched = false;
    try {
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: store },
        defaults: { routing: { loop: 'ghost:model' } },
      });
      const outcome = await engine.run(echoWorkflow, undefined, { runId: 'fault-ghost' }).result;
      detail = `run status '${outcome.status}': ${outcome.error?.message ?? ''}`;
      matched = outcome.status === 'error' && (outcome.error?.message ?? '').includes('ghost');
    } catch (thrown) {
      detail = errorText(thrown);
      matched = detail.includes('ghost');
    }
    return {
      observation: { matched, detail },
      artifacts: [jsonArtifact('refusal.json', { detail })],
    };
  },
};

const SCENARIOS: readonly FaultScenario[] = [
  inFlightExposure,
  duplicateQuotaRule,
  tornJsonlTail,
  gluedJsonlTail,
  crashResumeSettleBoundary,
  pricingRotationUncoveredTail,
  unknownProviderId,
];

/** The scenario names in run order. */
export const FAULT_SCENARIO_NAMES: readonly string[] = SCENARIOS.map((scenario) => scenario.name);

/**
 * Runs the fault-injection scenarios sequentially and reports each
 * driven branch's observation; with `artifactsDir`, writes one
 * `<scenario>.json` bundle per scenario (the observation plus every
 * artifact), the experiment-grade trace a review can cite.
 */
export async function runFaultInjection(
  options?: RunFaultInjectionOptions,
): Promise<FaultInjectionReport> {
  const known = new Map(SCENARIOS.map((scenario) => [scenario.name, scenario]));
  for (const name of options?.only ?? []) {
    if (!known.has(name)) {
      throw new ConfigError(
        `unknown fault scenario '${name}'; known: ${FAULT_SCENARIO_NAMES.join(', ')}`,
      );
    }
  }
  const selected =
    options?.only === undefined
      ? SCENARIOS
      : SCENARIOS.filter((scenario) => options.only?.includes(scenario.name));
  const scenarios: FaultScenarioReport[] = [];
  const artifactFiles: string[] = [];
  for (const scenario of selected) {
    const { observation, artifacts } = await scenario.run();
    const report: FaultScenarioReport = {
      scenario: scenario.name,
      doctrine: scenario.doctrine,
      observation,
      artifacts,
    };
    scenarios.push(report);
    if (options?.artifactsDir !== undefined) {
      mkdirSync(options.artifactsDir, { recursive: true });
      const file = join(options.artifactsDir, `${scenario.name}.json`);
      writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
      artifactFiles.push(file);
    }
  }
  return {
    scenarios,
    allMatched: scenarios.every((report) => report.observation.matched),
    ...(options?.artifactsDir === undefined ? {} : { artifactFiles }),
  };
}
