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
 * quietly becoming untested again. The RV909 scenarios extend the list
 * with the thirteenth experiment's fixed defects, so each fix's probe
 * is a permanent gate: reverting the fixed behavior reports
 * `matched: false` here, not only in the unit suite that shipped it.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ANTHROPIC_PRICING, anthropic } from '@rulvar/anthropic';
import {
  compareRates,
  ConfigError,
  createEngine,
  defineWorkflow,
  InMemoryStore,
  invoiceFromJournal,
  journalPricingSnapshot,
  JsonlFileStore,
  LeaseHeldError,
  memoryQuotaLimiter,
  priceComponentsOf,
  SettlementError,
  SupersededError,
  type ChatEvent,
  type ChatRequest,
  type InvoiceExport,
  type JournalEntry,
  type ModelCaps,
  type ModelRef,
  type PriceTable,
  type ProviderAdapter,
  type QuotaLimiter,
  type RunMeta,
  type Usage,
} from '@rulvar/core';
import { reconcileStatement, type ProviderStatement } from '@rulvar/openai';
import { orchestratePlanned } from '@rulvar/plan';
import { FakeAdapter, FAKE_MODEL_REF, fakeToolCalls } from '@rulvar/testing';

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
  /**
   * Scenarios the call asked for: the full registry size, or the
   * `only` selection's length (RV1014). With `selected` beside it the
   * report is self-describing: a consumer pinning these can never
   * watch the gate quietly shrink.
   */
  requested: number;
  /** Scenarios actually run; always equals `requested` (the intake refuses misses). */
  selected: number;
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

const WIRE_CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: true,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 1_000_000,
  maxOutputTokens: 64_000,
};

interface WireTurn {
  text: string;
  usage: Usage;
  /** Namespaced under the adapter id on the finish event. */
  metadata?: Record<string, unknown>;
  /**
   * Also report the turn's usage as a mid-stream usage event before any
   * content, the way a real wire's message_start does: the RV1002
   * scenario drives the LIVE budget inlet, not the finish remainder.
   */
  reportUsageMidStream?: boolean;
  /**
   * Yield a RETRYABLE error before any usage or content: the attempt
   * fails with nothing reported, its ledger row settles usageUnknown,
   * and the next scripted turn serves the retry. The RV1006 scenario
   * needs a real unknown-usage attempt, never a hand-built invoice row.
   */
  failBeforeUsage?: boolean;
}

/**
 * A minimal real adapter whose finish events carry scripted usage and
 * provider metadata: the RV909 scenarios need exact provider-reported
 * token counts, response ids, and wire-request segment sets, which the
 * pattern-matching FakeAdapter deliberately does not script.
 */
function wireAdapter(
  id: string,
  turns: readonly WireTurn[],
): ProviderAdapter & { served: WireTurn[] } {
  const served: WireTurn[] = [];
  return {
    id,
    served,
    caps: () => WIRE_CAPS,
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      void req;
      // Yield to the microtask queue like a real transport before the
      // first event, so consumers never observe a fully synchronous
      // stream.
      await Promise.resolve();
      if (signal?.aborted === true) {
        return;
      }
      const turn = turns[served.length];
      if (turn === undefined) {
        yield {
          type: 'error',
          error: {
            code: 'agent',
            message: `wire adapter '${id}': no scripted turn ${String(served.length)}`,
            retryable: false,
            data: { kind: 'terminal' },
          },
        };
        return;
      }
      served.push(turn);
      if (turn.failBeforeUsage === true) {
        yield {
          type: 'error',
          error: {
            code: 'agent',
            message: `wire adapter '${id}': scripted pre-usage transport failure`,
            retryable: true,
          },
        };
        return;
      }
      if (turn.reportUsageMidStream === true) {
        yield { type: 'usage', usage: { ...turn.usage } };
      }
      yield { type: 'text-delta', text: turn.text };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: turn.usage,
        ...(turn.metadata === undefined ? {} : { providerMetadata: { [id]: turn.metadata } }),
      };
    },
  };
}

const WIRE_PRICING: PriceTable = {
  pricingVersion: 'fault-wire-v1',
  models: { 'wire:model': { inputUsdPerMTok: 3, outputUsdPerMTok: 15 } },
};

const wirePricingOf = (servedBy: ModelRef) => WIRE_PRICING.models[servedBy];

/**
 * One priced run whose single provider call carries the response id
 * 'resp-1' and exact usage (1000 in, 200 out): the invoice both
 * statement scenarios reconcile against.
 */
async function statementSeedRun(runId: string): Promise<InvoiceExport> {
  const adapter = wireAdapter('wire', [
    {
      text: 'priced answer',
      usage: { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0 },
      metadata: { responseId: 'resp-1' },
    },
  ]);
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: { loop: 'wire:model' } },
    pricing: WIRE_PRICING,
  });
  const outcome = await engine.run(echoWorkflow, undefined, { runId }).result;
  if (outcome.status !== 'ok') {
    throw new Error(`fault kit: the seeding run settled '${outcome.status}' instead of ok`);
  }
  const entries = await store.load(runId);
  const composed = journalPricingSnapshot(entries)?.composedPriceUsd(() => undefined);
  if (composed === undefined) {
    throw new Error('fault kit: the seeded journal carries no pricing snapshot');
  }
  return invoiceFromJournal(entries, composed);
}

/**
 * RV903 (intake half): a statement whose dollars are not finite is
 * refused typed, because NaN flowed through the sums in the thirteenth
 * experiment's probe and `Math.abs(NaN) > tolerance` is false, so the
 * old verdict was 'match' with the divergence check silently disarmed.
 */
const nanStatementRefusal: FaultScenario = {
  name: 'nan-statement-refusal',
  doctrine:
    'a statement whose dollars cannot be summed is refused typed at intake (RV903), never ' +
    "verdict 'match' over NaN totals with the divergence check silently disarmed",
  async run() {
    const invoice = await statementSeedRun('fault-nan-statement');
    let detail =
      "reconcileStatement accepted usd NaN (the pre-v1.126 behavior: verdict 'match' " +
      'with NaN totals)';
    let matched = false;
    try {
      reconcileStatement(
        invoice,
        { kind: 'requests', rows: [{ responseId: 'resp-1', usd: Number.NaN }] },
        { pricingOf: wirePricingOf },
      );
    } catch (thrown) {
      detail = errorText(thrown);
      matched =
        thrown instanceof Error &&
        thrown.name === 'ConfigError' &&
        detail.includes('cannot be summed');
    }
    return {
      observation: { matched, detail },
      artifacts: [jsonArtifact('invoice.json', invoice), jsonArtifact('refusal.json', { detail })],
    };
  },
};

/**
 * RV903 (verdict half): our recorded counts ARE the provider's own
 * wire-reported numbers, so an export that disagrees with them
 * describes a different request than the wire served, and its dollars
 * cannot be trusted to mean the same thing even when they agree.
 */
const tokenMismatchDivergence: FaultScenario = {
  name: 'token-mismatch-divergence',
  doctrine:
    'provider-reported token counts that disagree with our recorded usage decide the ' +
    'verdict (RV903) even when the dollars agree; tokenComparison informational stays the ' +
    'declared opt-out with the mismatch still counted',
  async run() {
    const invoice = await statementSeedRun('fault-token-mismatch');
    const statement: ProviderStatement = {
      kind: 'requests',
      rows: [{ responseId: 'resp-1', usd: 0.006, usage: { inputTokens: 999, outputTokens: 200 } }],
    };
    const byDefault = reconcileStatement(invoice, statement, { pricingOf: wirePricingOf });
    const optedOut = reconcileStatement(invoice, statement, {
      pricingOf: wirePricingOf,
      tokenComparison: 'informational',
    });
    const mismatch = byDefault.tokenMismatchSample[0];
    const matched =
      byDefault.verdict === 'divergence' &&
      byDefault.tokenMismatches === 1 &&
      mismatch?.field === 'inputTokens' &&
      mismatch.ours === 1000 &&
      mismatch.statement === 999 &&
      optedOut.verdict === 'match' &&
      optedOut.tokenMismatches === 1;
    return {
      observation: {
        matched,
        detail:
          `the dollars agree yet the default verdict is '${byDefault.verdict}' on ` +
          `${String(byDefault.tokenMismatches)} token mismatch (${mismatch?.field ?? 'none'}: ` +
          `ours ${String(mismatch?.ours)} vs statement ${String(mismatch?.statement)}); ` +
          `under 'informational' the verdict is '${optedOut.verdict}' with the mismatch ` +
          'still counted, advisory only',
      },
      artifacts: [
        jsonArtifact('verdict-default.json', byDefault),
        jsonArtifact('verdict-informational.json', optedOut),
      ],
    };
  },
};

/**
 * RV902 + RV1007: the documented-rates comparator the weekly audit
 * runs, driven from its published home. The 1h write premium hid
 * exactly in the page-only direction; the fourteenth plan found two
 * more silent passes on the same surface: a page-only long-context
 * tier (the tier loop ran only when the SEED declared tiers) and a
 * NaN scalar (`NaN > epsilon` is false, so a broken extraction read
 * as agreement).
 */
const auditMissingFieldFinding: FaultScenario = {
  name: 'audit-missing-field-finding',
  doctrine:
    'the documented-rates comparator fails closed in BOTH directions (RV902): a billable ' +
    'page rate the seed never declared is a named finding, and so is a seed rate the page ' +
    'dropped, never a silent pass; page-only long-context tiers and NaN scalars are ' +
    'findings too (RV1007)',
  run() {
    const withPremium = {
      inputUsdPerMTok: 5,
      outputUsdPerMTok: 25,
      cacheWriteUsdPerMTok: 6.25,
      cacheWrite1hUsdPerMTok: 10,
    };
    const { cacheWrite1hUsdPerMTok: _dropped, ...withoutPremium } = withPremium;
    const seedGap = compareRates(withoutPremium, withPremium);
    const pageGap = compareRates(withPremium, withoutPremium);
    const clean = compareRates(withPremium, { ...withPremium });
    // The RV1007 arcs: a long-context premium only the page documents,
    // and a rate whose extraction stopped parsing.
    const tier = { aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 };
    const tierGap = compareRates(withPremium, { ...withPremium, tiers: [tier] });
    const nanGap = compareRates({ ...withPremium, inputUsdPerMTok: Number.NaN }, withPremium);
    const matched =
      seedGap.length === 1 &&
      (seedGap[0] ?? '').includes('the seed declares no such rate') &&
      pageGap.length === 1 &&
      (pageGap[0] ?? '').includes('the page shows no such rate') &&
      clean.length === 0 &&
      tierGap.length === 1 &&
      (tierGap[0] ?? '').includes('the seed declares none') &&
      nanGap.length === 1 &&
      (nanGap[0] ?? '').includes('NaN');
    return Promise.resolve({
      observation: {
        matched,
        detail:
          `page-only premium: '${seedGap[0] ?? 'no finding'}'; dropped premium: ` +
          `'${pageGap[0] ?? 'no finding'}'; identical rates compare clean ` +
          `(${String(clean.length)} findings); page-only tier: '${tierGap[0] ?? 'no finding'}'; ` +
          `NaN scalar: '${nanGap[0] ?? 'no finding'}'`,
      },
      artifacts: [jsonArtifact('findings.json', { seedGap, pageGap, clean, tierGap, nanGap })],
    });
  },
};

/**
 * RV901 over RV810: the shipped Anthropic table's 1h cache-write
 * premium (2x input, the provider's fifth published column) actually
 * prices a run whose usage carries the TTL split, under the pinned
 * pricingVersion, instead of the whole write count folding at the 5m
 * rate.
 */
const anthropic1hPriced: FaultScenario = {
  name: 'anthropic-1h-priced',
  doctrine:
    'the shipped Anthropic table prices the 1h cache-write share at the documented ' +
    '2x-input premium under its pinned pricingVersion (RV901 over the RV810 TTL split), ' +
    'never the whole write count at the 5m rate',
  async run() {
    const ref: ModelRef = 'anthropic:claude-opus-4-8';
    const usage: Usage = {
      inputTokens: 1_000_000,
      outputTokens: 1_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 300_000,
      cacheWrite5mTokens: 200_000,
      cacheWrite1hTokens: 100_000,
    };
    const adapter = wireAdapter('anthropic', [{ text: 'cached answer', usage }]);
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: ref } },
      pricing: ANTHROPIC_PRICING,
    });
    const outcome = await engine.run(echoWorkflow, undefined, { runId: 'fault-1h' }).result;
    if (outcome.status !== 'ok') {
      throw new Error(`fault kit: the seeding run settled '${outcome.status}' instead of ok`);
    }
    const entries = await store.load('fault-1h');
    const snapshot = journalPricingSnapshot(entries);
    const pinnedVersion = snapshot?.pricingVersion;
    const seed = ANTHROPIC_PRICING.models[ref];
    // Billing rides the per-dispatch reconciliation ledger: the TTL
    // split lives on the provider call record (and the settled fold and
    // the invoice price per call); since RV1001 the aggregates carry
    // the split too, and the per-call record stays the billing basis.
    const terminal = entries.find((entry) => entry.kind === 'agent' && entry.status === 'ok');
    const recorded = terminal?.providerCalls?.[0]?.usage;
    const writeRate = seed?.cacheWriteUsdPerMTok;
    const premiumRate = seed?.cacheWrite1hUsdPerMTok;
    const splitUsd =
      seed === undefined || recorded === undefined
        ? undefined
        : priceComponentsOf(seed, recorded).cacheWrite.usd;
    const undifferentiatedUsd =
      writeRate === undefined || recorded === undefined
        ? undefined
        : (recorded.cacheWriteTokens / 1_000_000) * writeRate;
    const expectedUsd =
      writeRate === undefined || premiumRate === undefined
        ? undefined
        : 0.2 * writeRate + 0.1 * premiumRate;
    const composed = snapshot?.composedPriceUsd(() => undefined);
    const invoice = invoiceFromJournal(entries, composed ?? (() => undefined));
    const rowUsd = invoice.rows.find((row) => row.servedBy === ref)?.usd;
    const matched =
      pinnedVersion === 'anthropic-2026-07-31' &&
      seed !== undefined &&
      premiumRate === 2 * seed.inputUsdPerMTok &&
      recorded?.cacheWrite1hTokens === 100_000 &&
      splitUsd !== undefined &&
      expectedUsd !== undefined &&
      undifferentiatedUsd !== undefined &&
      Math.abs(splitUsd - expectedUsd) < 1e-9 &&
      splitUsd > undifferentiatedUsd &&
      rowUsd !== undefined &&
      Math.abs(rowUsd - (3.5 + 0.025 + splitUsd)) < 1e-9;
    return {
      observation: {
        matched,
        detail:
          `the journal pinned '${pinnedVersion ?? 'none'}'; the 1h premium is 2x input ` +
          `(${String(premiumRate)} vs ${String(seed?.inputUsdPerMTok)}); the recorded ` +
          `call's split write component priced ${String(splitUsd)} USD against ` +
          `${String(undifferentiatedUsd)} at the undifferentiated 5m fold, and the ` +
          `invoice row priced ${String(rowUsd)} USD on the per-call basis`,
      },
      artifacts: [
        jsonArtifact('seed-row.json', seed ?? null),
        jsonArtifact('recorded-usage.json', recorded ?? null),
        jsonArtifact('fold.json', {
          splitUsd: splitUsd ?? null,
          undifferentiatedUsd: undifferentiatedUsd ?? null,
          invoiceRowUsd: rowUsd ?? null,
        }),
      ],
    };
  },
};

/**
 * RV905: an adapter absorbing provider-side continuations (pause_turn)
 * makes several wire calls inside one reserved dispatch. The quota
 * window, the invoice row, and the statement join must all speak true
 * wire units, or a continuation-heavy workload overruns the provider's
 * RPM cap and a per-request export manufactures false divergence.
 */
const pauseTurnUnits: FaultScenario = {
  name: 'pause-turn-units',
  doctrine:
    'provider-side continuations absorbed into one dispatch settle at true wire units ' +
    '(RV905): the quota reservation reconciles the actual request count, the invoice row ' +
    'names every segment id, and a per-request statement joins the whole set ' +
    'all-or-nothing (a partial segment set reads partial-coverage, never no-overlap)',
  async run() {
    const reconciled: Array<{ requests?: number }> = [];
    const limiter: QuotaLimiter = {
      reserve: () => Promise.resolve({ granted: true, reservationId: 'fault-r1' }),
      reconcile: (_reservationId, _usage, actual) => {
        reconciled.push(actual?.requests === undefined ? {} : { requests: actual.requests });
        return Promise.resolve();
      },
    };
    const adapter = wireAdapter('wire', [
      {
        text: 'continued answer',
        usage: { inputTokens: 3000, outputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 0 },
        metadata: {
          responseId: 'seg-1',
          wireRequests: { count: 3, responseIds: ['seg-1', 'seg-2', 'seg-3'] },
        },
      },
    ]);
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'wire:model' } },
      pricing: WIRE_PRICING,
      quota: { limiter },
    });
    const outcome = await engine.run(echoWorkflow, undefined, { runId: 'fault-pause' }).result;
    if (outcome.status !== 'ok') {
      throw new Error(`fault kit: the seeding run settled '${outcome.status}' instead of ok`);
    }
    const entries = await store.load('fault-pause');
    const composed = journalPricingSnapshot(entries)?.composedPriceUsd(() => undefined);
    const invoice = invoiceFromJournal(entries, composed ?? (() => undefined));
    const row = invoice.rows.find((candidate) => candidate.wireResponseIds !== undefined);
    const segments = row?.wireResponseIds?.join(',');
    const full = reconcileStatement(
      invoice,
      {
        kind: 'requests',
        rows: [
          { responseId: 'seg-1', usd: 0.005 },
          { responseId: 'seg-2', usd: 0.005 },
          { responseId: 'seg-3', usd: 0.0035 },
        ],
      },
      { pricingOf: wirePricingOf },
    );
    const partial = reconcileStatement(
      invoice,
      {
        kind: 'requests',
        rows: [
          { responseId: 'seg-1', usd: 0.005 },
          { responseId: 'seg-2', usd: 0.005 },
        ],
      },
      { pricingOf: wirePricingOf },
    );
    const matched =
      segments === 'seg-1,seg-2,seg-3' &&
      reconciled.some((entry) => entry.requests === 3) &&
      full.verdict === 'match' &&
      full.coverage.complete &&
      partial.verdict === 'partial-coverage';
    return {
      observation: {
        matched,
        detail:
          `the reservation settled at 3 wire requests (reconciled ` +
          `${JSON.stringify(reconciled)}); the invoice row names segments ` +
          `${segments ?? 'none'}; the full segment statement reads '${full.verdict}' and a ` +
          `partial segment set reads '${partial.verdict}', never no-overlap`,
      },
      artifacts: [
        jsonArtifact('invoice.json', invoice),
        jsonArtifact('verdicts.json', {
          full: { verdict: full.verdict, coverage: full.coverage },
          partial: { verdict: partial.verdict, coverage: partial.coverage },
        }),
      ],
    };
  },
};

/**
 * RV904: the count request carries the FULL child prompt, so it is
 * provider egress exactly like a dispatch. A spawn the budget could
 * never admit must refuse before that prompt leaves the process, on
 * the same refusal arithmetic real admission decides with.
 */
const preAdmissionCountRefusal: FaultScenario = {
  name: 'pre-admission-count-refusal',
  doctrine:
    'a spawn the budget could never admit refuses BEFORE the countTokens egress (RV904): ' +
    'the full child prompt never leaves the process, and the refusal is the same typed ' +
    'ceiling refusal real admission would throw',
  async run() {
    let counted = 0;
    const inner = new FakeAdapter({
      agents: { '*': 'never dispatched' },
      capsOverrides: { pricing: { inputUsdPerMTok: 3, outputUsdPerMTok: 15 } },
    });
    const adapter: ProviderAdapter = {
      id: inner.id,
      caps: inner.caps,
      stream: (req, signal) => inner.stream(req, signal),
      countTokens: () => {
        counted += 1;
        return Promise.resolve(500);
      },
    };
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: ROUTING,
    });
    const outcome = await engine.run(echoWorkflow, undefined, {
      runId: 'fault-count',
      budgetUsd: 0.001,
    }).result;
    const message = outcome.error?.message ?? '';
    const matched =
      outcome.status === 'exhausted' &&
      message.includes('budget ceiling reached') &&
      counted === 0 &&
      inner.calls.length === 0;
    return {
      observation: {
        matched,
        detail:
          `run status '${outcome.status}' (${message}); the count endpoint was never ` +
          `called (counted=${String(counted)}) and no prompt left the process ` +
          `(dispatches=${String(inner.calls.length)})`,
      },
      artifacts: [
        jsonArtifact('outcome.json', { status: outcome.status, error: outcome.error }),
        jsonArtifact('egress.json', { counted, dispatches: inner.calls.length }),
      ],
    };
  },
};

/**
 * RV906: the reserved finalizer's result rides the honest completion
 * envelope. A consumer reading only `status: 'ok'` off a capped run
 * used to execute a truncated plan as a full success; the envelope and
 * the outcome mirror make the partiality machine-readable. The at-cap
 * freeze is adaptive machinery, so the scenario runs the PlanRunner
 * extension exactly like a production adaptive orchestration.
 */
const forcedFinishCompletion: FaultScenario = {
  name: 'forced-finish-completion',
  doctrine:
    'a budget-capped orchestration settles ok with the honest completion envelope ' +
    "(RV906): the forced finish returns { result, completion: 'partial' } and mirrors " +
    'completion onto the outcome, never a bare result a consumer could execute as a ' +
    'full success',
  async run() {
    const adapter = new FakeAdapter({
      agents: {
        // The boot turn parks on quiescence; the wake evaluation that
        // follows trips the soft boundary (turn estimate 0.5 over the
        // 0.4 cap), so the only other turn is the reserved final wake.
        '*': (call) =>
          JSON.stringify(call.req.messages).includes('budget cap was reached')
            ? fakeToolCalls({ name: 'finish', args: { result: 'partial but honest' } })
            : fakeToolCalls({
                name: 'wait_for_events',
                args: { triggers: [{ kind: 'quiescence' }] },
              }),
      },
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: FAKE_MODEL_REF, orchestrate: FAKE_MODEL_REF } },
    });
    const outcome = await orchestratePlanned(
      engine,
      'a goal the cap interrupts',
      { budget: { capUsd: 0.4, finalizeReserveUsd: 0.01 } },
      { runId: 'fault-forced-finish' },
    ).result;
    const value = outcome.value as { result?: unknown; completion?: unknown } | undefined;
    const matched =
      outcome.status === 'ok' &&
      value?.result === 'partial but honest' &&
      value.completion === 'partial' &&
      outcome.completion === 'partial' &&
      outcome.cost.orchestrator?.forcedFinish === true &&
      adapter.calls.length === 2;
    return {
      observation: {
        matched,
        detail:
          `the capped run settled '${outcome.status}' with envelope completion ` +
          `'${String(value?.completion)}' mirrored onto the outcome ` +
          `('${String(outcome.completion)}'); forcedFinish=` +
          `${String(outcome.cost.orchestrator?.forcedFinish)} across ` +
          `${String(adapter.calls.length)} turns (the parked boot turn and the reserved ` +
          'final wake)',
      },
      artifacts: [
        jsonArtifact('outcome.json', {
          status: outcome.status,
          value: outcome.value ?? null,
          completion: outcome.completion ?? null,
          orchestrator: outcome.cost.orchestrator ?? null,
        }),
        jsonArtifact('journal.json', await store.load('fault-forced-finish')),
      ],
    };
  },
};

/** Fails the run_settle journal append while armed; heals on disarm. */
class RunSettleOutageStore extends InMemoryStore {
  armed = true;

  override append(runId: string, entry: JournalEntry): Promise<void> {
    const decisionType = (entry.value as { decisionType?: string } | undefined)?.decisionType;
    if (this.armed && decisionType === 'run_settle') {
      return Promise.reject(new Error('injected outage: the run_settle append failed'));
    }
    return super.append(runId, entry);
  }
}

/**
 * RV907: a terminal that exists in no store must not read green off
 * the event stream. The settlement-failure run:end carries
 * `settled: false`; the healed resume re-settles the same outcome by
 * replay, free, and its terminal carries no such mark.
 */
const settlementTerminalHonesty: FaultScenario = {
  name: 'settlement-terminal-honesty',
  doctrine:
    'a run whose settlement write fails rejects typed (SettlementError) and its run:end ' +
    'carries settled=false so an event-only consumer never takes the terminal green ' +
    '(RV907); the healed resume re-settles by replay with zero live calls and its ' +
    'settled terminal carries no such mark',
  async run() {
    const store = new RunSettleOutageStore();
    let liveCalls = 0;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          liveCalls += 1;
          return 'settled answer';
        },
      },
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: ROUTING,
    });
    const handle = engine.run(echoWorkflow, undefined, { runId: 'fault-settle' });
    let runEnd: { status?: string; settled?: boolean } | undefined;
    handle.on('run:end', (event) => {
      runEnd = event;
    });
    let thrown: unknown;
    try {
      await handle.result;
    } catch (raised) {
      thrown = raised;
    }
    await new Promise((resolve) => setImmediate(resolve));
    store.armed = false;
    let resumedEnd: Record<string, unknown> | undefined;
    const resumedHandle = engine.resume('fault-settle', echoWorkflow);
    resumedHandle.on('run:end', (event) => {
      resumedEnd = event;
    });
    const resumed = await resumedHandle.result;
    await new Promise((resolve) => setImmediate(resolve));
    const matched =
      thrown instanceof SettlementError &&
      thrown.stage === 'run-settle' &&
      runEnd?.status === 'ok' &&
      runEnd.settled === false &&
      resumed.status === 'ok' &&
      liveCalls === 1 &&
      resumedEnd !== undefined &&
      !('settled' in resumedEnd);
    return {
      observation: {
        matched,
        detail:
          `the failed settlement rejected typed ('${errorText(thrown)}') while run:end ` +
          `reported status '${runEnd?.status ?? 'none'}' with ` +
          `settled=${String(runEnd?.settled)}; the healed resume re-settled by replay ` +
          `(liveCalls=${String(liveCalls)}) and its terminal carries no settled mark`,
      },
      artifacts: [
        jsonArtifact('run-end.json', { failed: runEnd ?? null, resumed: resumedEnd ?? null }),
        jsonArtifact('journal.json', await store.load('fault-settle')),
      ],
    };
  },
};

/**
 * RV1002 over the RV1001 fix: the fourteenth experiment's probe fed a
 * $4 ceiling a stream whose differentiated cache write priced $4.50
 * while the unsplit live fold read $3.75, and the run settled ok half a
 * dollar over its own hard ceiling. The gate drives the REAL live path
 * (a mid-stream usage event against the layer-3 ceiling), never the
 * post-hoc pricing the 1h scenario already covers: the live debit and
 * the settled fold must price one differentiated write to the same
 * dollars, and a ceiling between the unsplit and split readings must
 * sever the run instead of letting it claim success.
 */
const TTL_PRICING: PriceTable = {
  pricingVersion: 'fault-ttl-v1',
  models: {
    'ttl:model': {
      inputUsdPerMTok: 10,
      outputUsdPerMTok: 50,
      cacheReadUsdPerMTok: 1,
      cacheWriteUsdPerMTok: 12.5,
      cacheWrite1hUsdPerMTok: 20,
    },
  },
};

/** 200k at the 5m write rate + 100k at the 1h rate: $2.50 + $2.00. */
const TTL_SPLIT_USAGE: Usage = {
  inputTokens: 300_000,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 300_000,
  cacheWrite5mTokens: 200_000,
  cacheWrite1hTokens: 100_000,
};

const ttlLiveBudgetParity: FaultScenario = {
  name: 'ttl-live-budget-parity',
  doctrine:
    'the live budget debit prices the cache-write TTL split exactly like the settled fold ' +
    '(RV1001): one differentiated write reads the same dollars on both money paths, the run ' +
    'usage aggregate keeps the split it was billed under, and a ceiling between the unsplit ' +
    'and split readings severs the run instead of settling ok over its own hard ceiling',
  async run() {
    const runTtl = async (runId: string, budgetUsd: number) => {
      const adapter = wireAdapter('ttl', [
        { text: 'cached answer', usage: TTL_SPLIT_USAGE, reportUsageMidStream: true },
      ]);
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore() },
        defaults: { routing: { loop: 'ttl:model' } },
        pricing: TTL_PRICING,
      });
      const handle = engine.run(echoWorkflow, undefined, { runId, budgetUsd });
      let maxLiveSpentUsd = 0;
      handle.on('budget:update', (event) => {
        if (event.spentUsd > maxLiveSpentUsd) {
          maxLiveSpentUsd = event.spentUsd;
        }
      });
      const outcome = await handle.result;
      return { outcome, maxLiveSpentUsd };
    };
    const parity = await runTtl('fault-ttl-parity', 10);
    const capped = await runTtl('fault-ttl-capped', 4);
    const parityUsage = parity.outcome.usage;
    const matched =
      parity.outcome.status === 'ok' &&
      parity.outcome.cost.totalUsd === 4.5 &&
      parity.maxLiveSpentUsd === 4.5 &&
      parityUsage.cacheWrite5mTokens === 200_000 &&
      parityUsage.cacheWrite1hTokens === 100_000 &&
      capped.outcome.status !== 'ok' &&
      capped.outcome.cost.totalUsd === 4.5 &&
      capped.maxLiveSpentUsd === capped.outcome.cost.totalUsd;
    return {
      observation: {
        matched,
        detail:
          `one differentiated write debited live=${String(parity.maxLiveSpentUsd)} USD and ` +
          `settled=${String(parity.outcome.cost.totalUsd)} USD on the same run (aggregate ` +
          `5m=${String(parityUsage.cacheWrite5mTokens)}, ` +
          `1h=${String(parityUsage.cacheWrite1hTokens)}); under the $4 ceiling the run ` +
          `settled '${capped.outcome.status}' at ${String(capped.outcome.cost.totalUsd)} USD ` +
          `with live=${String(capped.maxLiveSpentUsd)}`,
      },
      artifacts: [
        jsonArtifact('parity-run.json', {
          status: parity.outcome.status,
          settledUsd: parity.outcome.cost.totalUsd,
          liveUsd: parity.maxLiveSpentUsd,
          usage: parityUsage,
        }),
        jsonArtifact('capped-run.json', {
          status: capped.outcome.status,
          settledUsd: capped.outcome.cost.totalUsd,
          liveUsd: capped.maxLiveSpentUsd,
          error: capped.outcome.error?.message ?? null,
        }),
      ],
    };
  },
};

/**
 * RV1003 + RV1004 over the fourteenth experiment's P0: a legitimate
 * two-segment pause_turn through the REAL Anthropic adapter and the
 * real engine used to die on the usage invariant (each segment's
 * message_start emitted its own mid-stream usage, 5 then 6, while the
 * terminal finish carried only the last segment's count: 11 > 6), and
 * `pauseTurnMaxContinuations: NaN` silently disarmed the continuation
 * bound. The gate drives the real adapter with an injected client,
 * never a synthetic adapter with ready wire metadata: the finish must
 * speak for the whole logical turn, the wire units must land in the
 * quota window and the invoice row, and an invalid cap must refuse
 * typed before any wire.
 */
const pauseTurnRealAdapter: FaultScenario = {
  name: 'pause-turn-real-adapter',
  doctrine:
    'a legitimate provider-side continuation survives the real adapter end to end: the ' +
    'terminal finish carries the whole logical turn (per-segment mid-stream reports ' +
    'confirmed, every paid segment in the money), the quota window and the invoice row ' +
    'settle at true wire units, and an invalid pauseTurnMaxContinuations refuses typed ' +
    'before any wire instead of silently disarming the bound (RV1003 + RV1004)',
  async run() {
    async function* segmentStream(
      events: Array<Record<string, unknown>>,
    ): AsyncIterable<Record<string, unknown>> {
      await Promise.resolve();
      yield* events;
    }
    let wireCalls = 0;
    const client = {
      messages: {
        create(): Promise<unknown> {
          wireCalls += 1;
          const first = wireCalls === 1;
          const events: Array<Record<string, unknown>> = first
            ? [
                { type: 'message_start', message: { id: 'm1', usage: { input_tokens: 5 } } },
                { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
                {
                  type: 'content_block_delta',
                  index: 0,
                  delta: { type: 'text_delta', text: 'a ' },
                },
                { type: 'content_block_stop', index: 0 },
                { type: 'message_delta', delta: { stop_reason: 'pause_turn' }, usage: {} },
                { type: 'message_stop' },
              ]
            : [
                { type: 'message_start', message: { id: 'm2', usage: { input_tokens: 6 } } },
                { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
                { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'b' } },
                { type: 'content_block_stop', index: 0 },
                {
                  type: 'message_delta',
                  delta: { stop_reason: 'end_turn' },
                  usage: { output_tokens: 2 },
                },
                { type: 'message_stop' },
              ];
          return Promise.resolve(segmentStream(events));
        },
        countTokens: () => Promise.resolve({ input_tokens: 1 }),
      },
      models: { list: () => Promise.resolve({ data: [] }) },
    };
    const limiter = memoryQuotaLimiter([{ provider: 'anthropic', requestsPerMinute: 30 }]);
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [anthropic({ client })],
      stores: { journal: store },
      defaults: { routing: { loop: 'anthropic:claude-fable-5' } },
      quota: { limiter },
    });
    const outcome = await engine.run(echoWorkflow, undefined, { runId: 'fault-pause-real' }).result;
    const entries = await store.load('fault-pause-real');
    const terminal = entries.find((entry) => entry.kind === 'agent' && entry.status === 'ok');
    const recorded = terminal?.providerCalls?.[0]?.usage;
    const invoice = invoiceFromJournal(entries, () => undefined);
    const row = invoice.rows.find((r) => r.servedBy === 'anthropic:claude-fable-5');
    const snapshot = limiter.snapshot() as unknown as Array<{ requests?: number }> & {
      windows?: Array<{ requests?: number }>;
    };
    const quotaRequests = snapshot.windows?.[0]?.requests ?? snapshot[0]?.requests;

    // The invalid cap: refused typed before any wire, never a silent
    // disarm (the experiment observed 8 unbounded paid wires).
    const callsBeforeNan = wireCalls;
    let nanRefusal: unknown;
    try {
      for await (const event of anthropic({ client }).stream({
        model: 'claude-fable-5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
        providerOptions: { anthropic: { pauseTurnMaxContinuations: Number.NaN } },
      })) {
        void event;
      }
    } catch (thrown) {
      nanRefusal = thrown;
    }
    const matched =
      outcome.status === 'ok' &&
      wireCalls === callsBeforeNan &&
      wireCalls === 2 &&
      outcome.usage.inputTokens === 11 &&
      outcome.usage.outputTokens === 2 &&
      recorded?.inputTokens === 11 &&
      recorded.outputTokens === 2 &&
      row?.responseId === 'm2' &&
      row.wireResponseIds?.length === 2 &&
      row.wireResponseIds[0] === 'm1' &&
      row.wireResponseIds[1] === 'm2' &&
      quotaRequests === 2 &&
      nanRefusal instanceof ConfigError &&
      nanRefusal.message.includes('pauseTurnMaxContinuations');
    return {
      observation: {
        matched,
        detail:
          `the real adapter's two-segment pause_turn settled '${outcome.status}' with ` +
          `usage 11/2 observed as ${String(outcome.usage.inputTokens)}/` +
          `${String(outcome.usage.outputTokens)} across ${String(wireCalls)} wires, invoice ` +
          `row [${(row?.wireResponseIds ?? []).join(',')}], quota window ` +
          `${String(quotaRequests)}; pauseTurnMaxContinuations=NaN refused typed before any ` +
          `wire ('${errorText(nanRefusal)}')`,
      },
      artifacts: [
        jsonArtifact('outcome.json', {
          status: outcome.status,
          usage: outcome.usage,
          recorded: recorded ?? null,
          invoiceRow: row ?? null,
          quotaRequests: quotaRequests ?? null,
        }),
        jsonArtifact('nan-refusal.json', {
          refused: nanRefusal instanceof ConfigError,
          message: errorText(nanRefusal),
        }),
      ],
    };
  },
};

/** Bounces BOTH settlement writes off the fence while armed; heals on disarm. */
class SupersededSettleStore extends InMemoryStore {
  armed = true;

  override append(runId: string, entry: JournalEntry): Promise<void> {
    const decisionType = (entry.value as { decisionType?: string } | undefined)?.decisionType;
    if (this.armed && decisionType === 'run_settle') {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: a successor holds the lease'));
    }
    return super.append(runId, entry);
  }

  override putMeta(meta: RunMeta): Promise<void> {
    if (this.armed && meta.status !== 'running' && meta.status !== 'suspended') {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: a successor holds the lease'));
    }
    return super.putMeta(meta);
  }
}

/**
 * RV1009: a fenced-out segment must not read green anywhere. Before
 * this gate a superseded segment's LeaseHeldError was swallowed on both
 * settlement writes and the stale handle resolved ok with an unmarked
 * run:end: a green terminal no durable store wrote, the exact split
 * view RV907 forbids.
 */
const supersededTerminalHonesty: FaultScenario = {
  name: 'superseded-terminal-honesty',
  doctrine:
    'a superseded segment rejects typed (SupersededError) with run:end refusing green under ' +
    'the DISTINCT superseded reason, and exactly one successor settles the run (RV1009); a ' +
    'fenced-out terminal that no durable store wrote must never read ok',
  async run() {
    const store = new SupersededSettleStore();
    let liveCalls = 0;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          liveCalls += 1;
          return 'superseded answer';
        },
      },
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: ROUTING,
    });
    const settleCount = async (): Promise<number> =>
      (await store.load('fault-superseded')).filter(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
      ).length;
    const handle = engine.run(echoWorkflow, undefined, { runId: 'fault-superseded' });
    let runEnd: { status?: string; settled?: boolean; settledReason?: string } | undefined;
    handle.on('run:end', (event) => {
      runEnd = event;
    });
    let thrown: unknown;
    try {
      await handle.result;
    } catch (raised) {
      thrown = raised;
    }
    await new Promise((resolve) => setImmediate(resolve));
    const staleSettles = await settleCount();
    // The successor: a resume once the fence no longer rejects this
    // holder records the one authoritative settle by replay, free.
    store.armed = false;
    let resumedEnd: Record<string, unknown> | undefined;
    const resumedHandle = engine.resume('fault-superseded', echoWorkflow);
    resumedHandle.on('run:end', (event) => {
      resumedEnd = event;
    });
    const resumed = await resumedHandle.result;
    await new Promise((resolve) => setImmediate(resolve));
    const settles = await settleCount();
    const matched =
      thrown instanceof SupersededError &&
      thrown.code === 'superseded' &&
      thrown.retryable === false &&
      thrown.cause instanceof LeaseHeldError &&
      runEnd?.status === 'ok' &&
      runEnd.settled === false &&
      runEnd.settledReason === 'superseded' &&
      staleSettles === 0 &&
      resumed.status === 'ok' &&
      liveCalls === 1 &&
      settles === 1 &&
      resumedEnd !== undefined &&
      !('settled' in resumedEnd);
    return {
      observation: {
        matched,
        detail:
          `the fenced-out segment rejected typed ('${errorText(thrown)}') while run:end ` +
          `refused green with settledReason=${String(runEnd?.settledReason)} and zero settle ` +
          `entries; the successor settled ok by replay (liveCalls=${String(liveCalls)}) with ` +
          `exactly one settle entry (${String(settles)})`,
      },
      artifacts: [
        jsonArtifact('run-end.json', { superseded: runEnd ?? null, successor: resumedEnd ?? null }),
        jsonArtifact('journal.json', await store.load('fault-superseded')),
      ],
    };
  },
};

const retryingWorkflow = defineWorkflow({ name: 'fault-kit-retrying' }, async (ctx) => {
  // The default policy already retries transport-class failures; only
  // the waits shrink so the kit stays quick.
  return await ctx.agent('one small step', {
    retry: { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 2 } },
  });
});

/**
 * RV1005 + RV1006: the fourteenth experiment showed that a 'match'
 * verdict is a weaker claim than settlement needs (a clean export
 * beside a usage-unknown attempt leaves unattributed money on the
 * table with every surface reading green) and that an export row could
 * carry a total contradicting its own component split with each claim
 * sitting inside its own tolerance.
 */
const statementSettleableGuard: FaultScenario = {
  name: 'statement-settleable-guard',
  doctrine:
    "a 'match' verdict alone is not settlement-grade evidence: settleable states the " +
    'composite (match, complete coverage, zero usage-unknown rows, no unpriced models) ' +
    'first class (RV1006), and an export row whose own total contradicts its own ' +
    'component split refuses typed at intake (RV1005)',
  async run() {
    // A REAL run whose first attempt dies before any usage report: its
    // ledger row settles usageUnknown, money no export can ever name.
    const adapter = wireAdapter('wire', [
      {
        text: 'never delivered',
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        failBeforeUsage: true,
      },
      {
        text: 'priced answer',
        usage: { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0 },
        metadata: { responseId: 'resp-1' },
      },
    ]);
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'wire:model' } },
      pricing: WIRE_PRICING,
    });
    const outcome = await engine.run(retryingWorkflow, undefined, {
      runId: 'fault-settleable-unknown',
    }).result;
    if (outcome.status !== 'ok') {
      throw new Error(
        `fault kit: the unknown-usage seed settled '${outcome.status}' instead of ok`,
      );
    }
    const entries = await store.load('fault-settleable-unknown');
    const composed = journalPricingSnapshot(entries)?.composedPriceUsd(() => undefined);
    if (composed === undefined) {
      throw new Error('fault kit: the seeded journal carries no pricing snapshot');
    }
    const invoice = invoiceFromJournal(entries, composed);
    const statement: ProviderStatement = {
      kind: 'requests',
      rows: [{ responseId: 'resp-1', usd: 0.006 }],
    };
    const guarded = reconcileStatement(invoice, statement, { pricingOf: wirePricingOf });
    const clean = reconcileStatement(await statementSeedRun('fault-settleable-clean'), statement, {
      pricingOf: wirePricingOf,
    });
    let refusal =
      'reconcileStatement accepted a row whose usd 100 contradicts its components summing 1';
    let refused = false;
    try {
      reconcileStatement(
        invoice,
        {
          kind: 'requests',
          rows: [{ responseId: 'resp-1', usd: 100, componentsUsd: { input: 1 } }],
        },
        { pricingOf: wirePricingOf },
      );
    } catch (thrown) {
      refusal = errorText(thrown);
      refused =
        thrown instanceof Error && thrown.name === 'ConfigError' && refusal.includes('contradict');
    }
    const matched =
      guarded.verdict === 'match' &&
      guarded.coverage.complete &&
      guarded.usageUnknownRows === 1 &&
      guarded.settleable === false &&
      clean.verdict === 'match' &&
      clean.settleable === true &&
      refused;
    return {
      observation: {
        matched,
        detail:
          `verdict '${guarded.verdict}' with complete coverage still reads settleable=false ` +
          `over ${String(guarded.usageUnknownRows)} usage-unknown row (unattributed money on ` +
          'the table); the clean twin reads settleable=true; and the row whose total ' +
          'contradicts its own component split refused typed at intake',
      },
      artifacts: [
        jsonArtifact('report-usage-unknown.json', guarded),
        jsonArtifact('report-clean.json', clean),
        jsonArtifact('refusal.json', { detail: refusal }),
      ],
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
  nanStatementRefusal,
  tokenMismatchDivergence,
  auditMissingFieldFinding,
  anthropic1hPriced,
  pauseTurnUnits,
  preAdmissionCountRefusal,
  forcedFinishCompletion,
  settlementTerminalHonesty,
  ttlLiveBudgetParity,
  pauseTurnRealAdapter,
  statementSettleableGuard,
  supersededTerminalHonesty,
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
  // An empty selection refuses typed (RV1014): `only: []` used to
  // select zero scenarios and report allMatched true, a gate that ran
  // nothing claiming success. In tone with the unknown-name refusal.
  if (options?.only !== undefined && options.only.length === 0) {
    throw new ConfigError(
      'runFaultInjection: only is empty; a gate that runs zero scenarios cannot report ' +
        'success (omit only to run the full kit)',
    );
  }
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
    requested: options?.only === undefined ? SCENARIOS.length : options.only.length,
    selected: scenarios.length,
    ...(options?.artifactsDir === undefined ? {} : { artifactFiles }),
  };
}
