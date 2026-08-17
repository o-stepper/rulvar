/**
 * The unified terminal envelope (RV1105, the P1-5 arc): ONE shape
 * carrying every fact of a run's terminal, assembled once at the
 * engine's settlement chokepoint and mirrored verbatim onto the
 * resolved outcome (`outcome.envelope`), the `run:end` event
 * (`event.envelope`), and through them the HTTP outcome response and
 * the OTel run attributes. An SDK consumer, an event-only consumer,
 * and an HTTP consumer read the SAME set of facts without assembling
 * pieces from surface-specific fields; nothing pre-existing was
 * renamed or removed, the envelope is an assembly over it.
 *
 * Doctrine notes:
 * - `status` is the computation's verdict; `settled` says whether
 *   anything durable records it (RV907). A resolved outcome always
 *   carries `settled: true`, because an unsettled terminal REJECTS
 *   `handle.result` typed instead of resolving; the `settled: false`
 *   envelopes exist only on the event stream, where `settledReason:
 *   'superseded'` distinguishes the fenced-out segment (RV1009) from
 *   a settlement write fault.
 * - `usageApprox` is normalized to a boolean here (the run:end field
 *   keeps its absent-means-exact byte contract): `true` means some
 *   priced usage was approximate, so `totalUsd` is a lower bound.
 * - `costByModel` is a detached copy of the settled fold's per-model
 *   split; mutating it never touches the cost report. Since RV1213
 *   `error` is detached the same way, `data` nesting included, so the
 *   whole envelope is a reading a consumer may annotate freely.
 *
 * Docs: https://docs.rulvar.com/guide/observability
 */
import { ConfigError } from './errors.js';
import type { WireError } from './errors.js';
import type { Usage } from './messages.js';

/** One run terminal, the same on every surface (RV1105). */
export interface TerminalEnvelope {
  /** The run this terminal speaks for. */
  runId: string;
  /** The workflow name the run was started (or resumed) under. */
  workflow: string;
  /** The computed transport status of the run. */
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  /** The typed error, exactly the outcome's, when status is 'error'. */
  error?: WireError;
  /** The semantic completion claim, when the workflow made one. */
  completion?: 'complete' | 'partial' | 'rejected';
  /**
   * Whether anything durable records this terminal (RV907). False only
   * on the event stream: `handle.result` rejects typed instead of
   * resolving an unsettled outcome.
   */
  settled: boolean;
  /** Present only beside `settled: false` when a successor owns settlement (RV1009). */
  settledReason?: 'superseded';
  /** The NET settled fold: what the run recorded as spent. */
  totalUsd: number;
  /** The gross figure with abandoned subtrees included (P1.3). */
  grossUsd: number;
  /**
   * Where the dollars above come from (RV1413): journaled usage priced
   * at the CALLER'S pricing table (declared rates or adapter caps),
   * never a provider statement. Always `'locally-estimated'` today,
   * declared as a literal so finance tooling never has to guess,
   * mirroring `InvoiceExport.pricingBasis`; reconcile real bills
   * through the invoice export and `reconcileStatement`, which carry
   * their own provenance.
   */
  costBasis: 'locally-estimated';
  /** The per-model split of totalUsd, keyed by canonical ModelRef. */
  costByModel: Record<string, number>;
  /**
   * Provider wire requests recorded by the per-dispatch ledger
   * (RV1904), the same journal-derived figure `CostReport.wireRequests`
   * carries: on ledger-covered runs it equals the invoice cardinality,
   * so the terminal a consumer gates on and the invoice a finance
   * pipeline folds finally share one denominator. Absent when the
   * producing fold did not count wires (a pre-RV1904 live accumulation
   * a host fed into `buildCostReport`).
   */
  wireRequests?: number;
  /** The run's usage aggregate, TTL attribution included. */
  usage: Usage;
  /** True when any priced usage is approximate: totalUsd is a lower bound. */
  usageApprox: boolean;
  /** Agents admitted over the run's lifetime, resume seed included. */
  agentsSpawned: number;
  /**
   * Whether the artifact this terminal carries passed the declared
   * finish contract (RV2506), mirrored onto the envelope since RV3304:
   * the 2026-08-12 comparison run settled ok/complete over a retained
   * contradiction, and neither the HTTP response nor the persisted
   * rebuild could say whether anything ever judged the deliverable.
   * Absent when no contract judged anything; absence means NOT
   * RECORDED, never "accepted".
   */
  deliverableAccepted?: boolean;
  /**
   * Whether this terminal carries a deliverable to read at all
   * (RV2506); same mirror and posture. Distinct from
   * `deliverableAccepted`: an unjudged artifact still EXISTS, and a
   * run with no artifact still has a completion claim.
   */
  resultAvailable?: boolean;
  /**
   * The journal seq of the decision entry recording the acceptance of
   * the artifact this terminal carries (RV2506); same mirror, absent
   * unless the acceptance actually rendered. Read it with
   * `rulvar inspect` to see WHICH validators accepted WHICH hash.
   */
  acceptedArtifactRef?: number;
  /**
   * The claim consistency pass meta, detached (RV3304): `judgedStage`,
   * `judgedHash`, the coverage grade and the `findings` count, so the
   * surface a consumer gates on says WHAT was semantically verified,
   * over WHICH document, and what the judge found, without reaching
   * into the workflow value. Mutating this copy never touches the
   * outcome the engine owns.
   */
  claimConsistencyMeta?: Record<string, unknown>;
  /**
   * The host declared config identity the run was started under
   * (RV3210), echoed here since RV3304 so a decision consumer binds
   * the verdict above to the configuration that produced it without a
   * second read of the run record. Absent when the run declared none.
   */
  configFingerprint?: string;
  /**
   * Where THIS copy of the envelope was assembled (RV1209). Absent, the
   * historical byte contract, means the settlement chokepoint built it
   * from the live outcome, so every field above is the run's own
   * report. `'journal'` means a process that never held the run rebuilt
   * it from the journal that recorded the settle (a restart, a second
   * replica, an offline reader): the money, the usage, the agent count
   * and the settlement verdict are the SAME facts. `completion` is
   * present exactly when the settle recorded the semantic lift beside
   * its output digest (the persisted-terminal tail); a settle written
   * before the lift rode it stays absent. `error` is ABSENT because
   * the journal does not record the run's own wire error, and absence
   * under this provenance means "not recorded", never "the workflow
   * claimed nothing" or "the run did not fail". A consumer that needs
   * the error reads it from the live outcome or the run:end event.
   */
  provenance?: 'journal';
}

const ENVELOPE_STATUSES: ReadonlySet<string> = new Set([
  'ok',
  'error',
  'cancelled',
  'exhausted',
  'suspended',
]);

const ENVELOPE_COMPLETIONS: ReadonlySet<string> = new Set(['complete', 'partial', 'rejected']);

function refuseEnvelope(field: string, requirement: string, got: unknown): never {
  const printed = typeof got === 'number' ? String(got) : (JSON.stringify(got) ?? String(got));
  throw new ConfigError(`terminal envelope ${field} must be ${requirement}; got ${printed}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireMoney(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    refuseEnvelope(field, 'a finite nonnegative number', value);
  }
  return value;
}

function requireCount(value: unknown, field: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    refuseEnvelope(field, 'a nonnegative integer', value);
  }
}

function requireBoolean(value: unknown, field: string): void {
  if (typeof value !== 'boolean') {
    refuseEnvelope(field, 'a boolean', value);
  }
}

function requireNonEmptyString(value: unknown, field: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    refuseEnvelope(field, 'a non-empty string', value);
  }
}

/** Every numeric leaf of the usage subtree: finite and nonnegative. */
function requireUsageNumbers(node: unknown, path: string): void {
  if (typeof node === 'number') {
    if (!Number.isFinite(node) || node < 0) {
      refuseEnvelope(path, 'a finite nonnegative number', node);
    }
    return;
  }
  if (isPlainObject(node)) {
    for (const [key, item] of Object.entries(node)) {
      requireUsageNumbers(item, `${path}.${key}`);
    }
    return;
  }
  refuseEnvelope(path, 'a number or a nested usage object', node);
}

/**
 * The runtime gate over the terminal envelope contract (RV3903, the
 * fourth comparison experiment). `terminalEnvelopeOf` is the ONE
 * producer, but a producer is a compile-time promise, and the envelope
 * crosses trust boundaries the type system never sees: a journal read
 * back after a restart, a plain JS caller, an HTTP body a pipeline
 * gates on. The experiment probed the built dist and the typed copy
 * accepted `status: 'green'`, NaN dollars, and negative counts without
 * a sound; a finance or compliance consumer downstream would have
 * gated a run on fiction.
 *
 * The gate validates the CONTRACT fields and refuses with a typed
 * {@link ConfigError} naming the field and the defect: enum `status`
 * and `completion`, finite nonnegative money (with `totalUsd <=
 * grossUsd`, gross being net plus abandoned by construction), usage
 * and counters, `settledReason` only beside `settled: false`, the
 * `costBasis` and `provenance` literals, boolean `usageApprox`, and
 * the `WireError` shape when an error rides along. Unknown top-level
 * fields pass through untouched: the contract evolves additively, and
 * a parser that refused tomorrow's field would turn every additive
 * release into a wire break. On success the SAME reference comes back,
 * typed: the gate is a boundary check, never a normalizer.
 *
 * Wired where external bytes actually enter: `persistedTerminalEnvelope`
 * runs every journal-rebuilt envelope through it (and refuses typed as
 * `malformed-envelope`), which also covers the server's persisted
 * serving by construction. The live settlement chokepoint stays
 * unparsed on purpose: it is the one producer inside one process, and
 * gating it would add a throw site to settlement itself.
 */
export function parseTerminalEnvelope(value: unknown): TerminalEnvelope {
  if (!isPlainObject(value)) {
    refuseEnvelope('value', 'an object', value);
  }
  requireNonEmptyString(value.runId, 'runId');
  requireNonEmptyString(value.workflow, 'workflow');
  if (typeof value.status !== 'string' || !ENVELOPE_STATUSES.has(value.status)) {
    refuseEnvelope(
      'status',
      "one of 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended'",
      value.status,
    );
  }
  requireBoolean(value.settled, 'settled');
  if (value.settledReason !== undefined) {
    if (value.settledReason !== 'superseded') {
      refuseEnvelope('settledReason', "the literal 'superseded' when present", value.settledReason);
    }
    if (value.settled !== false) {
      refuseEnvelope(
        'settledReason',
        'present only beside settled: false (a settled terminal has no supersession to explain)',
        value.settledReason,
      );
    }
  }
  const totalUsd = requireMoney(value.totalUsd, 'totalUsd');
  const grossUsd = requireMoney(value.grossUsd, 'grossUsd');
  if (totalUsd > grossUsd) {
    refuseEnvelope(
      'totalUsd',
      `at most grossUsd (${String(grossUsd)}): gross is the net fold plus abandoned spend`,
      totalUsd,
    );
  }
  if (value.costBasis !== 'locally-estimated') {
    refuseEnvelope('costBasis', "the literal 'locally-estimated'", value.costBasis);
  }
  if (!isPlainObject(value.costByModel)) {
    refuseEnvelope('costByModel', 'an object of per-model dollars', value.costByModel);
  }
  for (const [model, usd] of Object.entries(value.costByModel)) {
    requireMoney(usd, `costByModel['${model}']`);
  }
  if (value.wireRequests !== undefined) {
    requireCount(value.wireRequests, 'wireRequests');
  }
  if (!isPlainObject(value.usage)) {
    refuseEnvelope('usage', 'a usage object', value.usage);
  }
  requireUsageNumbers(value.usage, 'usage');
  requireBoolean(value.usageApprox, 'usageApprox');
  requireCount(value.agentsSpawned, 'agentsSpawned');
  if (
    value.completion !== undefined &&
    (typeof value.completion !== 'string' || !ENVELOPE_COMPLETIONS.has(value.completion))
  ) {
    refuseEnvelope(
      'completion',
      "one of 'complete' | 'partial' | 'rejected' when present",
      value.completion,
    );
  }
  if (value.error !== undefined) {
    if (!isPlainObject(value.error)) {
      refuseEnvelope('error', 'a typed wire error object when present', value.error);
    }
    requireNonEmptyString(value.error.code, 'error.code');
    if (typeof value.error.message !== 'string') {
      refuseEnvelope('error.message', 'a string', value.error.message);
    }
    requireBoolean(value.error.retryable, 'error.retryable');
  }
  if (value.deliverableAccepted !== undefined) {
    requireBoolean(value.deliverableAccepted, 'deliverableAccepted');
  }
  if (value.resultAvailable !== undefined) {
    requireBoolean(value.resultAvailable, 'resultAvailable');
  }
  if (value.acceptedArtifactRef !== undefined) {
    requireCount(value.acceptedArtifactRef, 'acceptedArtifactRef');
  }
  if (value.claimConsistencyMeta !== undefined && !isPlainObject(value.claimConsistencyMeta)) {
    refuseEnvelope('claimConsistencyMeta', 'an object when present', value.claimConsistencyMeta);
  }
  if (value.configFingerprint !== undefined) {
    requireNonEmptyString(value.configFingerprint, 'configFingerprint');
  }
  if (value.provenance !== undefined && value.provenance !== 'journal') {
    refuseEnvelope('provenance', "the literal 'journal' when present", value.provenance);
  }
  return value as unknown as TerminalEnvelope;
}
