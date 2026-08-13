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
  makeOrchestratorWorkflow,
  memoryQuotaLimiter,
  citedValueValidator,
  evidenceGradeValidator,
  preflightEstimate,
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
import { FakeAdapter, FAKE_MODEL_REF, fakeToolCalls, fakeWireError } from '@rulvar/testing';

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
  /**
   * Report the turn's usage as mid-stream DELTAS in this order before
   * any content, the way a long prompt's counts arrive in increments;
   * the finish still carries the accumulated total. The RV1101
   * scenario needs a call whose SUM crosses a long-context tier while
   * no single slice does. Takes precedence over reportUsageMidStream.
   */
  usageSlices?: readonly Usage[];
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
      if (turn.usageSlices !== undefined) {
        for (const slice of turn.usageSlices) {
          yield { type: 'usage', usage: { ...slice } };
        }
      } else if (turn.reportUsageMidStream === true) {
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

/**
 * RV1101 over the fourteenth plan's backlog: the settled fold prices
 * every provider call whole, so a long-context tier fires on the
 * call's full prompt, while the live budget priced each mid-stream
 * slice alone. A 250k prompt arriving as 150k + 100k slices debited
 * $3.00 live while settlement recorded $5.75, and a $4 ceiling
 * between the two readings settled ok over its own hard cap. The gate
 * drives the REAL live path (mid-stream deltas against the layer-3
 * ceiling) through a tier crossing no single slice reached: the
 * per-call marginal meter must debit the retroactive re-price at the
 * crossing slice, live and settled must read the same dollars, and
 * the between-readings ceiling must sever the run.
 */
const TIER_PRICING: PriceTable = {
  pricingVersion: 'fault-tier-v1',
  models: {
    'tier:model': {
      inputUsdPerMTok: 10,
      outputUsdPerMTok: 50,
      tiers: [{ aboveInputTokens: 200_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
    },
  },
};

/** 250k prompt as 150k + 100k mid-stream slices; 10k output on finish. */
const TIER_CROSSING_TURN: WireTurn = {
  text: 'long context answer',
  usage: {
    inputTokens: 250_000,
    outputTokens: 10_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  },
  usageSlices: [
    { inputTokens: 150_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputTokens: 100_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  ],
};

const tierCrossingLiveParity: FaultScenario = {
  name: 'tier-crossing-live-parity',
  doctrine:
    'a long-context tier crossed by the sum of one call that no single mid-stream slice ' +
    'reached debits the live budget exactly like the settled fold (RV1101): the per-call ' +
    'marginal meter re-prices the whole call at the crossing slice, live and settled read ' +
    'the same dollars, and a ceiling between the per-slice and tiered readings severs the ' +
    'run instead of settling ok over its own hard cap',
  async run() {
    const runTier = async (runId: string, budgetUsd: number) => {
      const adapter = wireAdapter('tier', [TIER_CROSSING_TURN]);
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore() },
        defaults: { routing: { loop: 'tier:model' } },
        pricing: TIER_PRICING,
      });
      const handle = engine.run(echoWorkflow, undefined, { runId, budgetUsd });
      let maxLiveSpentUsd = 0;
      const ladder: number[] = [];
      handle.on('budget:update', (event) => {
        if (event.spentUsd > maxLiveSpentUsd) {
          maxLiveSpentUsd = event.spentUsd;
        }
        if (event.spentUsd > 0 && ladder[ladder.length - 1] !== event.spentUsd) {
          ladder.push(event.spentUsd);
        }
      });
      const outcome = await handle.result;
      return { outcome, maxLiveSpentUsd, ladder };
    };
    const parity = await runTier('fault-tier-parity', 100);
    const capped = await runTier('fault-tier-capped', 4);
    // The live ladder pins the DRIVE, not only the destination: the
    // marginal meter must read $1.50 after the first slice, $5.00 at
    // the crossing (the retroactive re-price of the whole call), and
    // $5.75 at the finish remainder. A scenario that stopped slicing
    // (or a meter that stopped re-pricing) cannot reproduce it.
    const expectedLadder = [1.5, 5, 5.75];
    let cursor = 0;
    for (const reading of parity.ladder) {
      if (reading === expectedLadder[cursor]) {
        cursor += 1;
      }
    }
    const ladderDriven = cursor === expectedLadder.length;
    const matched =
      parity.outcome.status === 'ok' &&
      parity.outcome.cost.totalUsd === 5.75 &&
      parity.maxLiveSpentUsd === 5.75 &&
      ladderDriven &&
      capped.outcome.status !== 'ok' &&
      capped.outcome.cost.totalUsd === 5.75 &&
      capped.maxLiveSpentUsd === capped.outcome.cost.totalUsd;
    return {
      observation: {
        matched,
        detail:
          `a 250k call arriving as 150k + 100k slices (no slice crossed the 200k tier) ` +
          `debited live=${String(parity.maxLiveSpentUsd)} USD and ` +
          `settled=${String(parity.outcome.cost.totalUsd)} USD on the same run over the ` +
          `live ladder ${parity.ladder.join(' -> ')}; under the $4 ceiling between the ` +
          `per-slice ($3.00) and tiered readings the run settled ` +
          `'${capped.outcome.status}' at ${String(capped.outcome.cost.totalUsd)} USD with ` +
          `live=${String(capped.maxLiveSpentUsd)}`,
      },
      artifacts: [
        jsonArtifact('parity-run.json', {
          status: parity.outcome.status,
          settledUsd: parity.outcome.cost.totalUsd,
          liveUsd: parity.maxLiveSpentUsd,
          ladder: parity.ladder,
          usage: parity.outcome.usage,
        }),
        jsonArtifact('capped-run.json', {
          status: capped.outcome.status,
          settledUsd: capped.outcome.cost.totalUsd,
          liveUsd: capped.maxLiveSpentUsd,
          ladder: capped.ladder,
          error: capped.outcome.error?.message ?? null,
        }),
      ],
    };
  },
};

/**
 * RV1905, the four-role benchmark's primary arm as a permanent gate:
 * the exact $6.00 / $4.50 cap / $1.00 synthesis / four 0.62 workers
 * configuration whose preflight read 5/5 green while the live gate
 * refused the third worker. Since RV1901 the projection holds the
 * synthesis reserve like both live gates, seats 2 of 4, exposes the
 * equation terms, and names the roster shortfall as an error finding.
 */
const benchmarkPrimaryPreflightParity: FaultScenario = {
  name: 'benchmark-primary-preflight-parity',
  doctrine:
    'the admission projection holds the synthesis reserve exactly like the live gates ' +
    '(RV1901): the benchmark primary configuration projects 2 of 4 seats with the ' +
    'equation terms exposed and the roster shortfall named admission-below-roster-floor, ' +
    'never the 5/5 green wave the live gate is bound to refuse',
  run() {
    const adapter = new FakeAdapter({ agents: { '*': 'unused' } });
    const report = preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: {
          routing: {
            loop: FAKE_MODEL_REF,
            orchestrate: FAKE_MODEL_REF,
            synthesize: FAKE_MODEL_REF,
          },
        },
      },
      run: { budgetUsd: 6 },
      orchestrator: {
        budget: { capUsd: 4.5, capFraction: 1.0, synthesisReserveUsd: 1.0 },
        synthesis: { limits: { maxTurns: 2 } },
        acceptance: { minSpawnedChildren: 4 },
      },
      spawns: ['product', 'finops', 'durability', 'adversarial'].map((label) => ({
        label,
        estCost: 0.62,
      })),
    });
    const denied = report.admission.wave.filter((row) => !row.admitted);
    const floorFinding = report.findings.find(
      (finding) => finding.code === 'admission-below-roster-floor',
    );
    const matched =
      report.admission.admitted === 3 &&
      report.admission.denied === 2 &&
      denied.every((row) => row.deniedBy === 'budget') &&
      report.admission.synthesisReserveUsd === 1.0 &&
      Math.abs((report.admission.wave[0]?.reserveUsd ?? 0) - 3.5) < 1e-9 &&
      Math.abs((report.admission.wave[0]?.heldAtEvaluationUsd ?? 0) - 1.0) < 1e-9 &&
      floorFinding?.severity === 'error';
    return Promise.resolve({
      observation: {
        matched,
        detail:
          `the wave seats ${String(report.admission.admitted)} of 5 rows ` +
          `(${String(report.admission.denied)} denied by budget), synthesis hold ` +
          `${String(report.admission.synthesisReserveUsd)} USD, roster finding ` +
          `'${String(floorFinding?.code)}' at severity '${String(floorFinding?.severity)}'`,
      },
      artifacts: [jsonArtifact('preflight.json', report)],
    });
  },
};

/**
 * RV1905, the four-role benchmark's recovery arm as a permanent gate:
 * four admitted children still finalizing, the root's next turn refused
 * pre-wire by the exposure cap. Since RV1902 the root parks and
 * retries; since RV1903 every child reaches a journaled terminal before
 * run_settle; since RV1904 the terminal and the invoice share one wire
 * denominator. One scenario drives the whole fixed pipeline.
 */
const benchmarkRecoveryRootExposure: FaultScenario = {
  name: 'benchmark-recovery-root-exposure',
  doctrine:
    'a root turn refused by the in-flight exposure cap beside live children parks and ' +
    'completes after a hold releases (RV1902), every child terminal precedes run_settle ' +
    '(RV1903), and the terminal envelope and the invoice cardinality agree on the wire ' +
    'count (RV1904): the recovery arm terminal-failed on every one of these',
  async run() {
    let releaseChildren: () => void = () => {};
    const childrenGate = new Promise<void>((resolve) => {
      releaseChildren = resolve;
    });
    const agentTypeOfReq = (req: ChatRequest): string =>
      (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ??
      '';
    let orchTurn = 0;
    const calls: ChatRequest[] = [];
    const toolEvents = (name: string, args: unknown, call: number): ChatEvent[] => [
      { type: 'tool-call-start', id: `id-${String(call)}-0`, name },
      { type: 'tool-call-delta', id: `id-${String(call)}-0`, argsTextDelta: JSON.stringify(args) },
      { type: 'tool-call-end', id: `id-${String(call)}-0`, args },
    ];
    const handlesIn = (req: ChatRequest): number[] => {
      const found: number[] = [];
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result') {
            const result = part.result as { handle?: number; handles?: number[] };
            if (typeof result.handle === 'number') {
              found.push(result.handle);
            }
          }
        }
      }
      return found;
    };
    const adapter: ProviderAdapter & { calls: ChatRequest[] } = {
      id: 'fake',
      calls,
      caps: () => ({
        contextWindow: 200_000,
        maxOutputTokens: 4_096,
        structuredOutput: 'native',
        supportsTemperature: true,
        supportsParallelTools: true,
        reasoningEfforts: [],
        pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
      }),
      async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
        const call = calls.length;
        calls.push(req);
        if (agentTypeOfReq(req) !== '') {
          await Promise.race([
            childrenGate,
            new Promise<void>((resolve) => {
              signal?.addEventListener('abort', () => resolve(), { once: true });
            }),
          ]);
          if (signal?.aborted === true) {
            return;
          }
          yield { type: 'text-delta', text: 'worked' };
          yield {
            type: 'finish',
            finish: { reason: 'stop' },
            usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
          return;
        }
        orchTurn += 1;
        const turn =
          orchTurn === 1
            ? toolEvents('spawn_agent', { agentType: 'worker', prompt: 'task A' }, call).concat(
                toolEvents('spawn_agent', { agentType: 'worker', prompt: 'task B' }, call + 1000),
              )
            : orchTurn === 2
              ? toolEvents('await_all', { handles: handlesIn(req) }, call)
              : toolEvents('finish', { result: 'joined after the wait' }, call);
        for (const event of turn) {
          yield event;
        }
        yield {
          type: 'finish',
          finish: { reason: 'tool-calls' },
          usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      },
    };
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          worker: { description: 'the gated worker', limits: { maxOutputTokensPerTurn: 2500 } },
        },
      },
    });
    const wf = makeOrchestratorWorkflow('join the gated wave', {
      limits: { maxOutputTokensPerTurn: 4000 },
    });
    const handle = engine.run(wf, undefined, {
      runId: 'fault-recovery-exposure',
      budgetUsd: 10,
      maxInFlightExposureUsd: 0.08,
    });
    const waits: Array<{ willWait?: boolean }> = [];
    const errors: unknown[] = [];
    handle.on('budget:exposure-wait', (event) => {
      waits.push(event);
      releaseChildren();
    });
    handle.on('agent:error', (event) => errors.push(event));
    const timer = setTimeout(() => releaseChildren(), 4000);
    timer.unref?.();
    const outcome = await handle.result;
    const entries = await store.load('fault-recovery-exposure');
    const settle = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
    );
    const childTerminals = entries.filter(
      (entry) =>
        entry.kind === 'agent' && entry.scope.startsWith('agent:') && entry.status !== 'running',
    );
    const invoice = invoiceFromJournal(entries, (servedBy, usage) => {
      return (usage.inputTokens / 1_000_000) * 1 + (usage.outputTokens / 1_000_000) * 10;
    });
    const matched =
      outcome.status === 'ok' &&
      outcome.value === 'joined after the wait' &&
      waits.length >= 1 &&
      waits[0]?.willWait === true &&
      errors.length === 0 &&
      settle !== undefined &&
      childTerminals.length === 2 &&
      childTerminals.every((entry) => entry.seq < settle.seq) &&
      typeof outcome.envelope.wireRequests === 'number' &&
      outcome.envelope.wireRequests === invoice.cardinality.wireRequests;
    return {
      observation: {
        matched,
        detail:
          `run '${outcome.status}' with ${String(waits.length)} exposure wait(s) ` +
          `(first willWait=${String(waits[0]?.willWait)}), ${String(errors.length)} ` +
          `agent:error, ${String(childTerminals.length)} child terminals before settle ` +
          `seq ${String(settle?.seq)}, wires ${String(outcome.envelope.wireRequests)} == ` +
          `invoice ${String(invoice.cardinality.wireRequests)}`,
      },
      artifacts: [
        jsonArtifact('outcome.json', {
          status: outcome.status,
          value: outcome.value ?? null,
          envelope: outcome.envelope,
        }),
        jsonArtifact('events.json', { waits, errors }),
        jsonArtifact('journal.json', entries),
      ],
    };
  },
};

/**
 * The third parity rerun's terminal shape as a permanent gate (RV2009):
 * the coordination turn eats most of the exposure cap, every spawned
 * worker is refused DRAINED (typed 'exposure-drained', zero provider
 * attempts, the RV2002 seat instead of the parity mid-research death),
 * the next coordination turn drains too, and the run forced-finishes
 * partial (RV1902) into an exhausted terminal with a sealed journal:
 * run_settle recorded after every agent terminal, the settled fold and
 * the invoice in one denominator (the RV2003 no-silent-exit invariant,
 * where the parity process left a forever-running root and no settle).
 */
const parityQuiescenceDeadlock: FaultScenario = {
  name: 'parity-quiescence-deadlock',
  doctrine:
    'the parity deadlock shape ends in an exhausted terminal, never a silent exit: drained ' +
    "children die typed 'exposure-drained' at zero provider attempts (RV2001/RV2002), the " +
    'root forced-finishes partial (RV1902), and run_settle seals a one-denominator journal ' +
    '(RV2003); the parity rerun exited mid-run with none of these',
  async run() {
    const agentTypeOfReq = (req: ChatRequest): string =>
      (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ??
      '';
    let orchTurn = 0;
    const calls: ChatRequest[] = [];
    const toolEvents = (name: string, args: unknown, id: string): ChatEvent[] => [
      { type: 'tool-call-start', id, name },
      { type: 'tool-call-delta', id, argsTextDelta: JSON.stringify(args) },
      { type: 'tool-call-end', id, args },
    ];
    const adapter: ProviderAdapter & { calls: ChatRequest[] } = {
      id: 'fake',
      calls,
      caps: () => ({
        contextWindow: 200_000,
        maxOutputTokens: 16_000,
        structuredOutput: 'native',
        supportsTemperature: true,
        supportsParallelTools: true,
        reasoningEfforts: [],
        pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
      }),
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        const call = calls.length;
        calls.push(req);
        // Hop the microtask queue like a real transport before the
        // first event.
        await Promise.resolve();
        if (agentTypeOfReq(req) !== '') {
          yield { type: 'text-delta', text: 'unreachable worker' };
          yield {
            type: 'finish',
            finish: { reason: 'stop' },
            usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
          return;
        }
        orchTurn += 1;
        const turn =
          orchTurn === 1
            ? toolEvents(
                'spawn_agent',
                { agentType: 'worker', prompt: 'research A' },
                `id-${String(call)}-0`,
              ).concat(
                toolEvents(
                  'spawn_agent',
                  { agentType: 'worker', prompt: 'research B' },
                  `id-${String(call)}-1`,
                ),
                toolEvents(
                  'spawn_agent',
                  { agentType: 'worker', prompt: 'research C' },
                  `id-${String(call)}-2`,
                ),
              )
            : toolEvents('finish', { result: 'unreachable' }, `id-${String(call)}-0`);
        for (const event of turn) {
          yield event;
        }
        yield {
          type: 'finish',
          finish: { reason: 'tool-calls' },
          usage: {
            inputTokens: 10,
            outputTokens: orchTurn === 1 ? 2000 : 5,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
        };
      },
    };
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          worker: {
            description: 'the oversized worker',
            limits: { maxOutputTokensPerTurn: 10000 },
          },
        },
      },
    });
    const wf = makeOrchestratorWorkflow('the parity shape', {
      limits: { maxOutputTokensPerTurn: 2500 },
    });
    const waits: Array<{ scope?: string; willWait?: boolean }> = [];
    const handle = engine.run(wf, undefined, {
      runId: 'fault-parity-quiescence',
      budgetUsd: 10,
      maxInFlightExposureUsd: 0.04,
    });
    handle.on('budget:exposure-wait', (event) => waits.push(event));
    const outcome = await handle.result;
    const entries = await store.load('fault-parity-quiescence');
    const drained = entries.filter(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'error' &&
        (entry.error?.data as { reason?: string } | undefined)?.reason === 'exposure-drained',
    );
    const workerCalls = calls.filter((req) => agentTypeOfReq(req) !== '');
    const settle = [...entries]
      .reverse()
      .find(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
      );
    const agentEntries = entries.filter((entry) => entry.kind === 'agent');
    const runningSeqs = agentEntries
      .filter((entry) => entry.status === 'running')
      .map((entry) => entry.seq);
    const rosterClosed = runningSeqs.every((seq) =>
      agentEntries.some((entry) => entry.ref === seq && entry.status !== 'running'),
    );
    const invoice = invoiceFromJournal(
      entries,
      (servedBy, usage) =>
        (usage.inputTokens / 1_000_000) * 1 + (usage.outputTokens / 1_000_000) * 10,
    );
    const envelope = outcome.value as
      { forcedFinishFallback?: boolean; completion?: string } | undefined;
    const matched =
      outcome.status === 'exhausted' &&
      envelope?.forcedFinishFallback === true &&
      envelope.completion === 'partial' &&
      drained.length === 3 &&
      workerCalls.length === 0 &&
      waits.some((event) => event.scope === 'child' && event.willWait === false) &&
      settle !== undefined &&
      rosterClosed &&
      agentEntries.every((entry) => entry.seq < settle.seq) &&
      typeof outcome.envelope.wireRequests === 'number' &&
      outcome.envelope.wireRequests === invoice.cardinality.wireRequests &&
      invoice.unsettled === undefined;
    return {
      observation: {
        matched,
        detail:
          `run '${outcome.status}' (forcedFinishFallback=${String(envelope?.forcedFinishFallback)}, ` +
          `completion=${String(envelope?.completion)}); ${String(drained.length)} drained child ` +
          `terminal(s) at ${String(workerCalls.length)} worker call(s); roster closed=` +
          `${String(rosterClosed)} before settle seq ${String(settle?.seq)}; wires ` +
          `${String(outcome.envelope.wireRequests)} == invoice ` +
          `${String(invoice.cardinality.wireRequests)}, unsettled lane absent=` +
          `${String(invoice.unsettled === undefined)}`,
      },
      artifacts: [
        jsonArtifact('outcome.json', {
          status: outcome.status,
          value: outcome.value ?? null,
          envelope: outcome.envelope,
        }),
        jsonArtifact('events.json', { waits }),
        jsonArtifact('journal.json', entries),
      ],
    };
  },
};

/**
 * The parity roster paid seat by seat under an unreachable floor, as a
 * permanent gate (RV2009): every SINGLE spawn admission projects the
 * whole remaining roster (RV2005) and the FIRST seat refuses typed
 * 'roster_floor' with the arithmetic journaled, zero paid children;
 * the parity arm paid three of four.
 */
const paritySequentialRosterFloor: FaultScenario = {
  name: 'parity-sequential-roster-floor',
  doctrine:
    'a seat-by-seat roster under an unreachable acceptance floor refuses its FIRST seat ' +
    "typed 'roster_floor' with the whole-roster arithmetic journaled and zero paid children " +
    '(RV2005): the parity arm paid three seats the settle verdict was bound to reject',
  async run() {
    const agentTypeOfReq = (req: ChatRequest): string =>
      (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ??
      '';
    let orchTurn = 0;
    const calls: ChatRequest[] = [];
    const toolEvents = (name: string, args: unknown, id: string): ChatEvent[] => [
      { type: 'tool-call-start', id, name },
      { type: 'tool-call-delta', id, argsTextDelta: JSON.stringify(args) },
      { type: 'tool-call-end', id, args },
    ];
    const adapter: ProviderAdapter & { calls: ChatRequest[] } = {
      id: 'fake',
      calls,
      caps: () => ({
        contextWindow: 200_000,
        maxOutputTokens: 16_000,
        structuredOutput: 'native',
        supportsTemperature: true,
        supportsParallelTools: true,
        reasoningEfforts: [],
        pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
      }),
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        const call = calls.length;
        calls.push(req);
        // Hop the microtask queue like a real transport before the
        // first event.
        await Promise.resolve();
        if (agentTypeOfReq(req) !== '') {
          yield { type: 'text-delta', text: 'seated worker' };
          yield {
            type: 'finish',
            finish: { reason: 'stop' },
            usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
          return;
        }
        orchTurn += 1;
        const turn =
          orchTurn === 1
            ? toolEvents(
                'spawn_agent',
                { agentType: 'worker', prompt: 'seat 1' },
                `id-${String(call)}-0`,
              )
            : toolEvents('finish', { result: 'stopped early' }, `id-${String(call)}-0`);
        for (const event of turn) {
          yield event;
        }
        yield {
          type: 'finish',
          finish: { reason: 'tool-calls' },
          usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      },
    };
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'the estimated worker', estCost: 0.7 } },
      },
    });
    const wf = makeOrchestratorWorkflow('the seat-by-seat parity roster', {
      acceptance: { childPolicy: 'all-ok', minSpawnedChildren: 4 },
    });
    const rejects: Array<{ code?: string }> = [];
    const handle = engine.run(wf, undefined, {
      runId: 'fault-parity-roster',
      budgetUsd: 2.5,
    });
    handle.on('spawn:rejected', (event) => rejects.push(event));
    const outcome = await handle.result;
    const entries = await store.load('fault-parity-roster');
    const decision = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'spawn-admission' &&
        (entry.value as { decision?: { verdict?: { reason?: { code?: string } } } }).decision
          ?.verdict?.reason?.code === 'roster_floor',
    );
    const reason = (
      decision?.value as
        | {
            decision: {
              verdict: {
                reason: {
                  floor?: number;
                  seatsRemaining?: number;
                  perSeatProjectionUsd?: number;
                };
              };
            };
          }
        | undefined
    )?.decision.verdict.reason;
    const workerCalls = calls.filter((req) => agentTypeOfReq(req) !== '');
    const matched =
      workerCalls.length === 0 &&
      rejects.some((event) => event.code === 'roster_floor') &&
      decision !== undefined &&
      reason?.floor === 4 &&
      reason.seatsRemaining === 4 &&
      Math.abs((reason.perSeatProjectionUsd ?? 0) - 0.7) < 1e-9 &&
      outcome.status === 'error';
    return {
      observation: {
        matched,
        detail:
          `run '${outcome.status}' with ${String(workerCalls.length)} worker call(s); ` +
          `roster_floor rejected=${String(rejects.some((e) => e.code === 'roster_floor'))}, ` +
          `journaled arithmetic floor=${String(reason?.floor)} seatsRemaining=` +
          `${String(reason?.seatsRemaining)} perSeat=${String(reason?.perSeatProjectionUsd)}`,
      },
      artifacts: [
        jsonArtifact('outcome.json', { status: outcome.status, error: outcome.error ?? null }),
        jsonArtifact('events.json', { rejects }),
        jsonArtifact('journal.json', entries),
      ],
    };
  },
};

/** Shared tool-call event triple for scripted orchestrator streams. */
const scriptedToolEvents = (name: string, args: unknown, id: string): ChatEvent[] => [
  { type: 'tool-call-start', id, name },
  { type: 'tool-call-delta', id, argsTextDelta: JSON.stringify(args) },
  { type: 'tool-call-end', id, args },
];

const scriptedAgentType = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

const scriptedCaps = (): ModelCaps => ({
  contextWindow: 200_000,
  maxOutputTokens: 16_000,
  structuredOutput: 'native',
  supportsTemperature: true,
  supportsParallelTools: true,
  reasoningEfforts: [],
  pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
});

/**
 * The reserve line and its redemption, in BOTH drive modes (RV2101,
 * DEF-7). The first paid parity runs died bare exactly here: the
 * coordination turn whose spent + held synthesis reserve + proposed
 * crossed the orchestrator cap tore the run down with the reserve
 * intact and unreachable. The fold is now typed 'budget-floor' and the
 * held reserve FUNDS the synthesis the run kept it for; the PlanRunner
 * extension arm must produce the same fold and the same redeemed
 * result, which is the DEF-7 parity this scenario documents.
 */
const parityReserveLineRedemption: FaultScenario = {
  name: 'parity-reserve-line-redemption',
  doctrine:
    "a coordination turn refused at the reserve line folds typed 'budget-floor' and the held " +
    'synthesis reserve funds the redemption whose result rides the partial envelope (RV2101); ' +
    'the PlanRunner extension arm produces the same fold and the same redeemed result (DEF-7)',
  async run() {
    interface ArmResult {
      status: string;
      error?: string;
      forcedFinishFallback: unknown;
      completion: unknown;
      result: unknown;
      fallbackReason: unknown;
      rootClassCalls: number;
      workerOkTerminals: number;
      settleRecorded: boolean;
      entries: JournalEntry[];
    }
    const runArm = async (mode: 'workflow' | 'extension'): Promise<ArmResult> => {
      const calls: ChatRequest[] = [];
      const adapter: ProviderAdapter & { calls: ChatRequest[] } = {
        id: 'fake',
        calls,
        caps: scriptedCaps,
        async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
          const call = calls.length;
          calls.push(req);
          await Promise.resolve();
          if (scriptedAgentType(req) !== '') {
            yield { type: 'text-delta', text: 'settled evidence' };
            yield {
              type: 'finish',
              finish: { reason: 'stop' },
              usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
            };
            return;
          }
          const isRoot = (req.tools ?? []).some((tool) => tool.name === 'spawn_agent');
          if (!isRoot) {
            // The synthesis dispatch: the redemption's spawn carries no
            // orchestration tools, only its own finish contract, and
            // the loop demands tool progress. Cheap by construction,
            // funded by the freed reserve.
            for (const event of scriptedToolEvents(
              'finish',
              { result: 'the redeemed synthesis' },
              `id-${String(call)}-0`,
            )) {
              yield event;
            }
            yield {
              type: 'finish',
              finish: { reason: 'tool-calls' },
              usage: { inputTokens: 12, outputTokens: 8, cacheReadTokens: 0, cacheWriteTokens: 0 },
            };
            return;
          }
          const rootCalls = calls.filter(
            (prior) =>
              scriptedAgentType(prior) === '' &&
              (prior.tools ?? []).some((tool) => tool.name === 'spawn_agent'),
          ).length;
          const turn =
            rootCalls === 1
              ? scriptedToolEvents(
                  'spawn_agent',
                  { agentType: 'worker', prompt: 'gather A' },
                  `id-${String(call)}-0`,
                ).concat(
                  scriptedToolEvents(
                    'spawn_agent',
                    { agentType: 'worker', prompt: 'gather B' },
                    `id-${String(call)}-1`,
                  ),
                )
              : scriptedToolEvents('finish', { result: 'unreachable' }, `id-${String(call)}-0`);
          for (const event of turn) {
            yield event;
          }
          yield {
            type: 'finish',
            finish: { reason: 'tool-calls' },
            // 1000 output tokens = 0.01 USD of orchestrator spend: the
            // decisive arithmetic below is spent 0.01 + held reserve
            // 0.02 + proposed ~0.01 against the 0.03 cap. Without the
            // reserve the next turn would FIT; the reserve is what
            // crosses the line, the RV2101 signature.
            usage: {
              inputTokens: 10,
              outputTokens: 1000,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
            },
          };
        },
      };
      const store = new InMemoryStore();
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: store },
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
          profiles: { worker: { description: 'the cheap gatherer' } },
        },
      });
      const opts = {
        limits: { maxOutputTokensPerTurn: 1000 },
        // The synthesis estimate must fit the post-release room (cap
        // 0.03 minus spent 0.01): the default 0.5 USD spawn estimate
        // would decline the very redemption the scenario drives.
        synthesis: { estCost: 0.006, limits: { maxOutputTokensPerTurn: 500 } },
        // finalizeReserveUsd 0 pins both arms to the same arithmetic:
        // the extension defaults a 1.0 USD finalize reserve, far above
        // this scenario's whole cap.
        budget: { capUsd: 0.03, synthesisReserveUsd: 0.02, finalizeReserveUsd: 0 },
      };
      const runId = `fault-reserve-line-${mode}`;
      const outcome =
        mode === 'workflow'
          ? await engine.run(makeOrchestratorWorkflow('the reserve line shape', opts), undefined, {
              runId,
              budgetUsd: 10,
            }).result
          : await orchestratePlanned(engine, 'the reserve line shape', opts, { runId }).result;
      const entries = await store.load(runId);
      const fallback = entries.find(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_finalize_fallback',
      );
      const settle = entries.some(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
      );
      const value = outcome.value as
        { forcedFinishFallback?: unknown; completion?: unknown; result?: unknown } | undefined;
      return {
        status: outcome.status,
        error: outcome.error?.message,
        forcedFinishFallback: value?.forcedFinishFallback,
        completion: value?.completion,
        result: value?.result,
        fallbackReason: (fallback?.value as { reason?: unknown } | undefined)?.reason,
        rootClassCalls: calls.filter((req) => scriptedAgentType(req) === '').length,
        workerOkTerminals: entries.filter(
          (entry) => entry.kind === 'agent' && entry.status === 'ok',
        ).length,
        settleRecorded: settle,
        entries,
      };
    };
    const arms = {
      workflow: await runArm('workflow'),
      extension: await runArm('extension'),
    };
    const armMatched = (arm: ArmResult): boolean =>
      arm.status === 'exhausted' &&
      arm.forcedFinishFallback === true &&
      arm.completion === 'partial' &&
      arm.result === 'the redeemed synthesis' &&
      arm.fallbackReason === 'budget-floor' &&
      // Root turn 1 plus the synthesis dispatch; the refused
      // coordination turn never reached the wire.
      arm.rootClassCalls === 2 &&
      arm.settleRecorded;
    const matched = armMatched(arms.workflow) && armMatched(arms.extension);
    return {
      observation: {
        matched,
        detail:
          `workflow arm '${arms.workflow.status}' reason=${String(arms.workflow.fallbackReason)} ` +
          `result=${JSON.stringify(arms.workflow.result)} rootCalls=` +
          `${String(arms.workflow.rootClassCalls)}; extension arm '${arms.extension.status}' ` +
          `reason=${String(arms.extension.fallbackReason)} result=` +
          `${JSON.stringify(arms.extension.result)} rootCalls=` +
          `${String(arms.extension.rootClassCalls)} (DEF-7 parity: both arms fold ` +
          "'budget-floor' and both redeem the synthesis from the held reserve)",
      },
      artifacts: [
        jsonArtifact('arms.json', {
          workflow: { ...arms.workflow, entries: undefined },
          extension: { ...arms.extension, entries: undefined },
        }),
        jsonArtifact('journal-workflow.json', arms.workflow.entries),
        jsonArtifact('journal-extension.json', arms.extension.entries),
      ],
    };
  },
};

/**
 * The c7 resume famine, closed (RV2201). The kill-mid-fan-out journal
 * of the seventh subscription run resumed to an ACCEPTED acceptance and
 * then starved: recovered agents were re-counted against
 * lifetimeSpawnCap, the judge fell to a typed decline naming the cap,
 * and the synthesis spawn died exhausted with the money reserve intact.
 * The counter now counts a scope a single time across the run's whole
 * life, so the exact-cap resume finishes its dossier.
 */
const resumeSpawnFamine: FaultScenario = {
  name: 'resume-spawn-famine',
  doctrine:
    'a resume re-admits recovered agents without re-counting them against lifetimeSpawnCap ' +
    '(RV2201): the kill-mid-fan-out journal resumes to the finished dossier at the EXACT cap, ' +
    "with no 'lifetime spawn cap' decline journaled and only the unsettled workers re-paid; " +
    'the c7 resume starved its judge and synthesis on re-counted admissions',
  async run() {
    const makeAdapter = (): ProviderAdapter & { calls: ChatRequest[] } => {
      const calls: ChatRequest[] = [];
      return {
        id: 'fake',
        calls,
        caps: scriptedCaps,
        async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
          const call = calls.length;
          calls.push(req);
          await Promise.resolve();
          if (scriptedAgentType(req) !== '') {
            yield { type: 'text-delta', text: 'gathered evidence' };
            yield {
              type: 'finish',
              finish: { reason: 'stop' },
              usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
            };
            return;
          }
          const isRoot = (req.tools ?? []).some((tool) => tool.name === 'spawn_agent');
          if (!isRoot) {
            for (const event of scriptedToolEvents(
              'finish',
              { result: 'the resumed dossier' },
              `id-${String(call)}-0`,
            )) {
              yield event;
            }
            yield {
              type: 'finish',
              finish: { reason: 'tool-calls' },
              usage: { inputTokens: 12, outputTokens: 8, cacheReadTokens: 0, cacheWriteTokens: 0 },
            };
            return;
          }
          const rootCalls = calls.filter(
            (prior) =>
              scriptedAgentType(prior) === '' &&
              (prior.tools ?? []).some((tool) => tool.name === 'spawn_agent'),
          ).length;
          const turn =
            rootCalls === 1
              ? scriptedToolEvents(
                  'spawn_agent',
                  { agentType: 'worker', prompt: 'gather A' },
                  `id-${String(call)}-0`,
                ).concat(
                  scriptedToolEvents(
                    'spawn_agent',
                    { agentType: 'worker', prompt: 'gather B' },
                    `id-${String(call)}-1`,
                  ),
                  scriptedToolEvents(
                    'spawn_agent',
                    { agentType: 'worker', prompt: 'gather C' },
                    `id-${String(call)}-2`,
                  ),
                )
              : scriptedToolEvents(
                  'finish',
                  { result: 'the coordination draft' },
                  `id-${String(call)}-0`,
                );
          for (const event of turn) {
            yield event;
          }
          yield {
            type: 'finish',
            finish: { reason: 'tool-calls' },
            usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
        },
      };
    };
    // The exact-cap arithmetic: one straight run of this shape spawns
    // the coordination root, three workers, and one synthesis, and the
    // cap is set to exactly that lifetime count. A resume that
    // re-counted its recovered agents (the pre-RV2201 doctrine) blows
    // this cap and dies the c7 death; the once-per-life counter
    // finishes the dossier inside it.
    const LIFETIME_SPAWNS = 5;
    const opts = {
      synthesis: { estCost: 0.006, limits: { maxOutputTokensPerTurn: 500 } },
      budget: { finalizeReserveUsd: 0 },
    };
    const wf = makeOrchestratorWorkflow('the resumable fan-out', opts);
    const makeEngine = (adapter: ProviderAdapter, store: InMemoryStore) =>
      createEngine({
        adapters: [adapter],
        stores: { journal: store },
        budgetDefaults: { lifetimeSpawnCap: LIFETIME_SPAWNS },
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
          profiles: { worker: { description: 'the resumable gatherer' } },
        },
      });
    const storeA = new InMemoryStore();
    const seedAdapter = makeAdapter();
    const seeded = await makeEngine(seedAdapter, storeA).run(wf, undefined, {
      runId: 'fault-resume-famine',
      budgetUsd: 10,
    }).result;
    if (seeded.status !== 'ok') {
      throw new Error(`fault kit: the seeding run settled '${seeded.status}' instead of ok`);
    }
    const entriesA = await storeA.load('fault-resume-famine');
    // The kill window: cut right after the FIRST worker terminal, so
    // one worker replays settled, two resume as recovered mid-flight
    // work, and the coordination, the fan-in, and the synthesis all
    // still lie ahead of the resumed segment.
    const firstWorkerOk = entriesA.findIndex(
      (entry) => entry.kind === 'agent' && entry.status === 'ok',
    );
    if (firstWorkerOk < 0) {
      throw new Error('fault kit: the seeding journal carries no worker terminal to cut at');
    }
    const cut = entriesA.slice(0, firstWorkerOk + 1);
    const storeB = new InMemoryStore();
    for (const entry of cut) {
      await storeB.append('fault-resume-famine', entry);
    }
    const resumeAdapter = makeAdapter();
    const resumed = await makeEngine(resumeAdapter, storeB).resume('fault-resume-famine', wf)
      .result;
    const entriesB = await storeB.load('fault-resume-famine');
    const capDeclines = entriesB.filter(
      (entry) =>
        entry.kind === 'decision' &&
        JSON.stringify(entry.value ?? {}).includes('lifetime spawn cap'),
    );
    const redemptionDeclines = entriesB.filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_redemption_declined',
    );
    const liveWorkerCalls = resumeAdapter.calls.filter(
      (req) => scriptedAgentType(req) !== '',
    ).length;
    const distinctAgentScopes = new Set(
      entriesB
        .filter((entry) => entry.kind === 'agent' && entry.status === 'running')
        .map((entry) => `${entry.scope}#${String(entry.key)}`),
    ).size;
    const matched =
      resumed.status === 'ok' &&
      // The ok path returns the synthesis output itself: the dossier
      // composed by the RESUMED segment's synthesis spawn, the very
      // agent the re-counted cap used to starve.
      resumed.value === 'the resumed dossier' &&
      capDeclines.length === 0 &&
      redemptionDeclines.length === 0 &&
      // Only the two unsettled workers re-paid; the settled one
      // replayed free.
      liveWorkerCalls === 2 &&
      distinctAgentScopes === LIFETIME_SPAWNS;
    return {
      observation: {
        matched,
        detail:
          `resumed '${resumed.status}' result=${JSON.stringify(resumed.value)} at ` +
          `lifetimeSpawnCap ${String(LIFETIME_SPAWNS)} ` +
          `(${String(distinctAgentScopes)} distinct lifetime agent scopes); cap declines ` +
          `journaled=${String(capDeclines.length)}, redemption declines=` +
          `${String(redemptionDeclines.length)}, live worker calls in the resumed segment=` +
          `${String(liveWorkerCalls)} (the settled worker replayed free)`,
      },
      artifacts: [
        jsonArtifact('journal-cut.json', cut),
        jsonArtifact('resume-outcome.json', {
          status: resumed.status,
          value: resumed.value ?? null,
          liveWorkerCalls,
        }),
        jsonArtifact('journal-resumed.json', entriesB),
      ],
    };
  },
};

/**
 * The c3 validator trap, converging (RV2202). The third subscription
 * run was pinned between two verdicts: evidence-grade demanded a run id
 * beside the live-observed claim, the model wove the id into a cited
 * sentence, cited-value lawfully rejected the id as a value absent from
 * the cited window, and both repairs burned without an exit. The
 * evidence-grade reason now NAMES the safe composition, so the same
 * trap converges in one repair round with cited-value silent. It also
 * names the id ITSELF (RV2501): the 1.226.0 comparison run obeyed the
 * same reason with an id no artifact pattern could match, so the
 * instruction was unexecutable and both repairs burned again. And the
 * composition it names is now the DIRECT one (RV2502): with the id in
 * hand cited-value reads it as identity rather than as a value asserted
 * about the cited line, so the corrected finish here writes this run's
 * own id in the graded sentence BESIDE the citation, the exact shape
 * the old bundle could not accept from either side.
 */
const validatorGuidanceConflict: FaultScenario = {
  name: 'validator-guidance-conflict',
  doctrine:
    'the evidence-grade reason names the SAFE composition against its cited-value sibling ' +
    'and names the run id it wants written (RV2202, RV2501, RV2502): the c3 trap finish ' +
    "repairs in ONE round by carrying THIS run's own id in the graded sentence, beside a " +
    'source citation, with cited-value reading that id as identity and never rejecting; the ' +
    'third subscription run burned both repairs between the two verdicts, and the 1.226.0 ' +
    'comparison run burned both again on an id no artifact pattern could match',
  async run() {
    const TRAP_FINISH =
      'The reserve fold is live-observed under sustained load. ' +
      'The engine seals the journal at settle (`README.md:3`).';
    // The safe composition the reason names: the graded claim carries
    // THIS RUN'S OWN id in the SAME sentence (RV2501, the arm that
    // needs no ULID shaped id at all) BESIDE the source citation. That
    // sentence is exactly what the old bundle could not accept: the
    // grade wanted the id there and cited-value judged it against the
    // cited window. Under RV2502 the id is identity, not an asserted
    // value, so one repair round satisfies both.
    const FIXED_FINISH =
      'The reserve fold is live-observed under sustained load in run ' +
      '`fault-guidance-conflict`, where the engine seals the journal at settle ' +
      '(`README.md:3`).';
    const calls: ChatRequest[] = [];
    let finishAttempts = 0;
    const adapter: ProviderAdapter & { calls: ChatRequest[] } = {
      id: 'fake',
      calls,
      caps: scriptedCaps,
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        const call = calls.length;
        calls.push(req);
        await Promise.resolve();
        finishAttempts += 1;
        const result = finishAttempts === 1 ? TRAP_FINISH : FIXED_FINISH;
        for (const event of scriptedToolEvents('finish', { result }, `id-${String(call)}-0`)) {
          yield event;
        }
        yield {
          type: 'finish',
          finish: { reason: 'tool-calls' },
          usage: { inputTokens: 10, outputTokens: 40, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      },
    };
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' } },
    });
    const resolveSource = (target: { path: string; line: number }): string | undefined =>
      target.path === 'README.md'
        ? 'the rulvar engine\nholds one denominator\nthe engine seals the journal at settle\n'
        : undefined;
    const wf = makeOrchestratorWorkflow('the guidance trap', {
      finishValidation: {
        validators: [
          evidenceGradeValidator(),
          citedValueValidator({ resolve: resolveSource, window: 2 }),
        ],
        maxRepairs: 2,
        repairTurnReserve: 2,
      },
    });
    const outcome = await engine.run(wf, undefined, {
      runId: 'fault-guidance-conflict',
      budgetUsd: 10,
    }).result;
    const entries = await store.load('fault-guidance-conflict');
    // The repair exchange bytes: the second root request carries the
    // rejected finish tool-result, whose reason must steer to the safe
    // composition instead of into the sibling validator.
    const repairRequest = calls[1];
    const repairBytes = JSON.stringify(repairRequest?.messages ?? []);
    const guidanceQuoted =
      repairBytes.includes("write this run's id fault-guidance-conflict") &&
      repairBytes.includes('may share a sentence with a source citation');
    const citedValueNamed = repairBytes.includes('cited-value reads a run id as identity');
    const decisionsText = JSON.stringify(
      entries.filter((entry) => entry.kind === 'decision').map((entry) => entry.value ?? null),
    );
    const citedValueRejected = decisionsText.includes('"cited-value"')
      ? decisionsText.includes('not present inside the cited window')
      : false;
    const matched =
      outcome.status === 'ok' &&
      outcome.value === FIXED_FINISH &&
      // Exactly one repair round: the trap finish and the corrected
      // finish, nothing burned between the two verdicts.
      finishAttempts === 2 &&
      guidanceQuoted &&
      citedValueNamed &&
      !citedValueRejected;
    return {
      observation: {
        matched,
        detail:
          `run '${outcome.status}' after ${String(finishAttempts)} finish attempt(s); the ` +
          `repair exchange named the run id and the shared-sentence composition ` +
          `(${String(guidanceQuoted)}) and named the identity reading ` +
          `(${String(citedValueNamed)}); cited-value rejected=${String(citedValueRejected)}; ` +
          `final result carries this run's own id beside the citation in the graded ` +
          `sentence: ${String(outcome.value === FIXED_FINISH)}`,
      },
      artifacts: [
        jsonArtifact('outcome.json', { status: outcome.status, value: outcome.value ?? null }),
        { name: 'repair-request.json', content: repairBytes },
        jsonArtifact('journal.json', entries),
      ],
    };
  },
};

// ---- The post fan in tail arc (RV3403, plan 34): the 2026-08-12
// comparison run settled ok/complete over a finding its own final
// judge had named, and the fixes that followed (RV3301, RV3304,
// RV3307) shipped with unit suites but no kit scenario ever drove the
// arc end to end on the real engine. These three do: the round that
// consumes the finding, the round that fails because the finding
// survived, and the judge that dies under an armed posture.
const TAIL_POOL_READING = 'A failed audit write does not mask success (`src/exec.ts:256-296`).';
const TAIL_DRAFT_INVERTED =
  'draft: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
const TAIL_FINAL_INVERTED =
  'final: an audit-write failure does not turn success into failure [src/exec.ts:256-296].';
const TAIL_FINAL_STILL_INVERTED =
  'final: the repaired text still flips the recorded outcome [src/exec.ts:256-296].';
const TAIL_FINAL_CLEAN = 'final: a failed audit write does not mask success [src/exec.ts:256-296].';
const TAIL_FINDS = {
  contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
};
const TAIL_AGREES = { contradictions: [] };

function tailHandles(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type !== 'tool-result') {
        continue;
      }
      const result = part.result as { handle?: number; handles?: number[] } | undefined;
      if (typeof result?.handle === 'number') {
        handles.push(result.handle);
      }
      if (Array.isArray(result?.handles)) {
        handles.push(...result.handles.filter((h): h is number => typeof h === 'number'));
      }
    }
  }
  return handles;
}

/**
 * One worker reads the span, the loop finishes with the inverted
 * draft, the composition finishes with `finals` in call order, and the
 * final stage judge answers through `judge` (a structured verdict or a
 * scripted wire death). Label keys ride first so the judge and the
 * composition route exactly, never through the prompt regex.
 */
function tailAdapter(options: {
  judge: (call: number) => unknown;
  finals: readonly string[];
}): FakeAdapter {
  let judgeCalls = 0;
  let synthCalls = 0;
  let loopTurns = 0;
  return new FakeAdapter({
    agents: {
      'claim-consistency-judge-final': () => options.judge((judgeCalls += 1)),
      'final-composition': () =>
        fakeToolCalls({
          name: 'finish',
          args: { result: options.finals[Math.min(synthCalls++, options.finals.length - 1)] },
        }),
      worker: TAIL_POOL_READING,
      '*': (call) => {
        loopTurns += 1;
        if (loopTurns === 1) {
          return fakeToolCalls({
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'read the recorded span' },
          });
        }
        if (loopTurns === 2) {
          return fakeToolCalls({ name: 'await_all', args: { handles: tailHandles(call.req) } });
        }
        return fakeToolCalls({ name: 'finish', args: { result: TAIL_DRAFT_INVERTED } });
      },
    },
  });
}

function tailEngine(adapter: FakeAdapter): {
  engine: ReturnType<typeof createEngine>;
  store: InMemoryStore;
} {
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: {
        loop: FAKE_MODEL_REF,
        orchestrate: FAKE_MODEL_REF,
        synthesize: FAKE_MODEL_REF,
        extract: FAKE_MODEL_REF,
      },
      profiles: { worker: { description: 'reads one span' } },
    },
  });
  return { engine, store };
}

const TAIL_OPTS = {
  acceptance: { childPolicy: 'all-ok' as const },
  synthesis: { limits: { maxTurns: 3 } },
};

function tailSpans(entries: readonly JournalEntry[]): {
  compositions: JournalEntry[];
  judges: JournalEntry[];
} {
  const settled = entries.filter((entry) => entry.kind === 'agent' && entry.status !== 'running');
  return {
    compositions: settled.filter((entry) => entry.costAttribution?.label === 'final-composition'),
    judges: settled.filter(
      (entry) => entry.costAttribution?.label === 'claim-consistency-judge-final',
    ),
  };
}

/**
 * RV3307 as the arc the losing config wanted: the final judge names
 * the contradiction, the findings ride one more composition, the
 * re-judge clears the repaired document, and the settled envelope
 * reports THAT document as the judged one.
 */
const repairRoundHonesty: FaultScenario = {
  name: 'repair-round-honesty',
  doctrine:
    'the bounded post judge repair consumes the named finding (RV3307): one more ' +
    'composition carries the findings, the re-judge clears it, the run settles ok with ' +
    "the meta describing the repaired document (judgedStage 'final', findings 0, " +
    'judgedHash equal to the shipped finalHash), two compositions and two final judge ' +
    'passes in the journal, and the invoice in the same denominator as the envelope',
  async run() {
    const adapter = tailAdapter({
      judge: (call) => (call === 1 ? TAIL_FINDS : TAIL_AGREES),
      finals: [TAIL_FINAL_INVERTED, TAIL_FINAL_CLEAN],
    });
    const { engine, store } = tailEngine(adapter);
    const outcome = await engine.run(
      makeOrchestratorWorkflow('audit the executor', {
        ...TAIL_OPTS,
        claimConsistency: { stage: 'final', onFound: 'repair' },
      }),
      undefined,
      { runId: 'fault-repair-honesty', budgetUsd: 10 },
    ).result;
    const value = outcome.value as
      | {
          result?: unknown;
          claimContradictions?: unknown[];
          claimConsistencyMeta?: {
            judgedStage?: unknown;
            findings?: unknown;
            judgedHash?: unknown;
          };
          draftToFinal?: { finalHash?: unknown };
        }
      | undefined;
    const entries = await store.load('fault-repair-honesty');
    const { compositions, judges } = tailSpans(entries);
    const invoice = invoiceFromJournal(entries, () => 0);
    const matched =
      outcome.status === 'ok' &&
      value?.result === TAIL_FINAL_CLEAN &&
      Array.isArray(value.claimContradictions) &&
      value.claimContradictions.length === 0 &&
      value.claimConsistencyMeta?.judgedStage === 'final' &&
      value.claimConsistencyMeta.findings === 0 &&
      typeof value.claimConsistencyMeta.judgedHash === 'string' &&
      value.claimConsistencyMeta.judgedHash === value.draftToFinal?.finalHash &&
      compositions.length === 2 &&
      judges.length === 2 &&
      [...compositions, ...judges].every((entry) => entry.status === 'ok') &&
      typeof outcome.envelope.wireRequests === 'number' &&
      outcome.envelope.wireRequests === invoice.cardinality.wireRequests;
    return {
      observation: {
        matched,
        detail:
          `run '${outcome.status}' shipped ${value?.result === TAIL_FINAL_CLEAN ? 'the repaired document' : 'an unexpected document'}; ` +
          `meta judgedStage='${String(value?.claimConsistencyMeta?.judgedStage)}' findings=` +
          `${String(value?.claimConsistencyMeta?.findings)} judgedHash==finalHash=` +
          `${String(value?.claimConsistencyMeta?.judgedHash === value?.draftToFinal?.finalHash)}; ` +
          `${String(compositions.length)} composition(s), ${String(judges.length)} final judge ` +
          `pass(es); wires ${String(outcome.envelope.wireRequests)} == invoice ` +
          String(invoice.cardinality.wireRequests),
      },
      artifacts: [
        jsonArtifact('outcome.json', {
          status: outcome.status,
          value: outcome.value ?? null,
          envelope: outcome.envelope,
        }),
        jsonArtifact('journal.json', entries),
      ],
    };
  },
};

/**
 * RV3307's refusal half: the repair round runs, the re-judge still
 * finds, and the run fails typed instead of settling over the
 * surviving contradiction, with the payload distinguishing the two
 * documents by hash.
 */
const repairSurvivorRefusal: FaultScenario = {
  name: 'repair-survivor-refusal',
  doctrine:
    'findings that survive the bounded repair round fail the run typed (RV3307): ' +
    "source 'orchestrator_claim_consistency', repairsUsed 1, preRepairHash distinct " +
    'from repairedHash (the round demonstrably produced a different document and the ' +
    'judge still refused it), two compositions and two final judge passes paid, never ' +
    'a silent ok over the surviving contradiction',
  async run() {
    const adapter = tailAdapter({
      judge: () => TAIL_FINDS,
      finals: [TAIL_FINAL_INVERTED, TAIL_FINAL_STILL_INVERTED],
    });
    const { engine, store } = tailEngine(adapter);
    const outcome = await engine.run(
      makeOrchestratorWorkflow('audit the executor', {
        ...TAIL_OPTS,
        claimConsistency: { stage: 'final', onFound: 'repair' },
      }),
      undefined,
      { runId: 'fault-repair-survivor', budgetUsd: 10 },
    ).result;
    const data = (outcome.error?.data ?? {}) as {
      source?: unknown;
      repairsUsed?: unknown;
      preRepairHash?: unknown;
      repairedHash?: unknown;
    };
    const entries = await store.load('fault-repair-survivor');
    const { compositions, judges } = tailSpans(entries);
    const matched =
      outcome.status === 'error' &&
      (outcome.error?.message ?? '').includes('after the bounded repair round') &&
      data.source === 'orchestrator_claim_consistency' &&
      data.repairsUsed === 1 &&
      typeof data.preRepairHash === 'string' &&
      typeof data.repairedHash === 'string' &&
      data.preRepairHash !== data.repairedHash &&
      compositions.length === 2 &&
      judges.length === 2;
    return {
      observation: {
        matched,
        detail:
          `run '${outcome.status}': ${outcome.error?.message ?? ''}; repairsUsed=` +
          `${String(data.repairsUsed)}, hashes distinct=` +
          `${String(data.preRepairHash !== data.repairedHash)}, ` +
          `${String(compositions.length)} composition(s), ${String(judges.length)} final ` +
          'judge pass(es)',
      },
      artifacts: [
        jsonArtifact('outcome.json', { status: outcome.status, error: outcome.error ?? null }),
        jsonArtifact('journal.json', entries),
      ],
    };
  },
};

/**
 * The armed posture doctrine on a dead judge (RV3307): a gate armed to
 * stop or to repair must not pass silently when its judge cannot rule.
 * Both armed postures refuse typed; the round never runs.
 */
const claimJudgeDeadArmedRefusal: FaultScenario = {
  name: 'claim-judge-dead-armed-refusal',
  doctrine:
    'a final stage judge that dies on the wire under an armed posture fails the run ' +
    "typed for both 'fail' and 'repair' (RV3307), each message naming its armed " +
    'posture, with exactly one composition paid and no repair round dispatched, never ' +
    'a silent settle over findings nobody ruled on',
  async run() {
    const judgeDeath = (): unknown =>
      fakeWireError({
        code: 'agent',
        message: 'the judge died mid stream',
        retryable: false,
        data: {},
      });
    const runs: Array<{
      posture: 'fail' | 'repair';
      status: string;
      message: string;
      compositions: number;
      judges: number;
    }> = [];
    const journals: Record<string, unknown> = {};
    for (const posture of ['fail', 'repair'] as const) {
      const adapter = tailAdapter({ judge: judgeDeath, finals: [TAIL_FINAL_INVERTED] });
      const { engine, store } = tailEngine(adapter);
      const runId = `fault-dead-judge-${posture}`;
      const outcome = await engine.run(
        makeOrchestratorWorkflow('audit the executor', {
          ...TAIL_OPTS,
          claimConsistency: { stage: 'final', onFound: posture },
        }),
        undefined,
        { runId, budgetUsd: 10 },
      ).result;
      const entries = await store.load(runId);
      const { compositions, judges } = tailSpans(entries);
      journals[posture] = entries;
      runs.push({
        posture,
        status: outcome.status,
        message: outcome.error?.message ?? '',
        compositions: compositions.length,
        judges: judges.length,
      });
    }
    const matched = runs.every(
      (run) =>
        run.status === 'error' &&
        run.message.includes(`armed ${run.posture} posture`) &&
        run.compositions === 1 &&
        run.judges === 1,
    );
    return {
      observation: {
        matched,
        detail: runs
          .map(
            (run) =>
              `${run.posture}: '${run.status}' (${run.compositions} composition(s), ` +
              `${run.judges} judge span(s)) ${run.message.slice(0, 120)}`,
          )
          .join(' | '),
      },
      artifacts: [jsonArtifact('runs.json', runs), jsonArtifact('journals.json', journals)],
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
  tierCrossingLiveParity,
  benchmarkPrimaryPreflightParity,
  benchmarkRecoveryRootExposure,
  parityQuiescenceDeadlock,
  paritySequentialRosterFloor,
  parityReserveLineRedemption,
  resumeSpawnFamine,
  validatorGuidanceConflict,
  repairRoundHonesty,
  repairSurvivorRefusal,
  claimJudgeDeadArmedRefusal,
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
