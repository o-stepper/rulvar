import { EffectCapabilityRow, EffectClass, EffectLaneFold, EffectLaneWriter, EffectLookupQualification, EffectMachine, JournalStore } from "@rulvar/core";
import { ConformanceSuite, StoreFactory } from "@rulvar/store-conformance";

//#region src/adapter.d.ts
/** One provider row of the capability matrix (RFC section 6). */
interface EffectProviderDescriptor {
  provider: string;
  capabilityRow: EffectCapabilityRow;
  /**
  * Required for the 'lookup' row and recorded on every intent: WHICH
  * qualification the provider earned the row with. A provider that
  * offers only eventually consistent search, or a strongly consistent
  * read WITHOUT acceptance closure, is 'neither', whatever its
  * marketing says about lookup.
  */
  lookupQualification?: EffectLookupQualification;
}
/** What a provider hands back as evidence of an effect. */
interface EffectReceiptObservation {
  transferId?: string;
  amount?: number;
  currency?: string;
  documentHash?: string;
  providerRef?: string;
  timestamp?: string;
  issuer?: string;
  keyId?: string;
  signature?: string;
}
interface EffectDispatchRequest {
  runId: string;
  intent: EffectMachine;
  /** Seq of the attempt record appended BEFORE this send. */
  attemptSeq: number;
  /** The attempt's 1-based ordinal under the intent. */
  ordinal: number;
  /**
  * The provider idempotency key when the row carries one: stable
  * across attempts of one intent (it embeds the logical key and the
  * epoch), which is exactly what makes a re-dispatch safe on the
  * 'idempotency-key' row.
  */
  idempotencyKey?: string;
  /** The attempt's send deadline (defense in depth, never proof). */
  notAfter: string;
}
type EffectDispatchResult = {
  outcome: "accepted";
  providerRef?: string;
  receipt?: EffectReceiptObservation;
} | {
  outcome: "failed";
  detail: string;
} | {
  outcome: "unknown";
  detail?: string;
};
interface EffectLookupRequest {
  runId: string;
  intent: EffectMachine;
  idempotencyKey?: string;
  /**
  * The ambiguous attempt an acceptance closure targets: closure is
  * per attempt identity (RFC section 6), so the provider can refuse
  * exactly the in-flight request while a FRESH attempt stays legal.
  */
  attemptSeq?: number;
}
type EffectLookupAnswer = {
  found: true;
  receipt: EffectReceiptObservation;
} | {
  found: false;
  /**
  * True only when the negative is provider-enforced FINAL: the
  * specific effect is not accepted and can no longer BE accepted
  * (RFC section 6). An eventually consistent miss is `false`.
  */
  acceptanceClosed: boolean;
};
interface EffectAdapter {
  readonly descriptor: EffectProviderDescriptor;
  /**
  * Sends one attempt. Called ONLY by the dispatcher, ONLY with the
  * seq of an attempt record it just appended.
  */
  dispatch(request: EffectDispatchRequest): Promise<EffectDispatchResult>;
  /** Queries the provider for the effect's truth, when the row offers it. */
  lookup?(request: EffectLookupRequest): Promise<EffectLookupAnswer>;
  /**
  * The acceptance-closing primitive (query then cancel): after this
  * resolves with `found: false`, late bytes for this effect are
  * unacceptable at the provider, which is the ONLY thing that makes
  * a negative answer final (RFC section 4.4).
  */
  closeAcceptance?(request: EffectLookupRequest): Promise<EffectLookupAnswer>;
}
/** The stable idempotency key: the logical key bound to its epoch. */
declare function effectIdempotencyKey(intent: EffectMachine): string;
//#endregion
//#region src/dispatcher.d.ts
/**
* Trust-envelope verification of one receipt observation (the full
* envelope machinery is the reconciler train's; the seam is here).
* The default fails closed: an unverified receipt routes the machine
* to `unknown`, never to `confirmed`.
*/
type ReceiptVerifier = (observation: EffectReceiptObservation) => "verified" | "unverified";
interface EffectDispatcherOptions {
  writer: EffectLaneWriter;
  adapter: EffectAdapter;
  runId: string;
  verifyReceipt?: ReceiptVerifier;
  now?: () => string;
  /** Milliseconds of send-deadline headroom on minted attempts. */
  attemptTtlMs?: number;
}
type EffectDispatchReport = {
  kind: "cancelled";
  terminalSeq: number;
} | {
  kind: "confirmed";
  receiptSeq: number;
  terminalSeq: number;
} | {
  kind: "accepted-awaiting-receipt";
  attemptSeq: number;
} | {
  kind: "receipt-unverified";
  attemptSeq: number;
  receiptSeq: number;
} | {
  kind: "failed";
  attemptSeq: number;
  detail: string;
} | {
  kind: "unknown";
  attemptSeq: number;
  detail?: string;
};
type EffectRecoveryReport = {
  kind: "noop";
  reason: string;
} | {
  kind: "cancelled";
  terminalSeq: number;
} | {
  kind: "confirmed";
  receiptSeq: number;
  terminalSeq: number;
} | {
  kind: "quarantined";
  terminalSeq: number;
  reason: string;
} | {
  kind: "redispatched";
  report: EffectDispatchReport;
} | {
  kind: "waiting";
  reason: string;
} | {
  kind: "receipt-unverified";
  receiptSeq: number;
};
declare class EffectDispatcher {
  private readonly writer;
  private readonly adapter;
  private readonly runId;
  private readonly verifyReceipt;
  private readonly now;
  private readonly attemptTtlMs;
  constructor(options: EffectDispatcherOptions);
  private notAfter;
  private machine;
  /**
  * The normal path: open the attempt (the writer's pre-attempt
  * re-fold cancels or refuses per RFC section 4.7), send through the
  * seam, classify the outcome, and confirm on a verified receipt.
  */
  dispatch(intentSeq: number): Promise<EffectDispatchReport>;
  private recordReceipt;
  /**
  * RFC section 4.7, rows 2 and 3: a REVOCATION whose position lost to
  * the execution opens the compensation decision path as a linked
  * incident; an EXPIRY opens none, because the send predated the
  * crossing and expiry bounds the grant, not the past.
  */
  private settleCloserAfterConfirm;
  /**
  * The provider's truth, JOURNALED: every probe is a durable row, so
  * the intent's lookup budget is countable from the journal alone
  * (kill point 19). A budget-exhausted probe throws typed; recover()
  * converts it into the quarantine the RFC demands.
  */
  private probedTruth;
  /** The provider's truth, by the strongest primitive the row offers. */
  private providerTruth;
  private quarantine;
  /**
  * The crash-window recovery (RFC section 8): derived from what the
  * journal proves and what the capability row licenses. Never a blind
  * retry; never a provider contact on an already-closed machine.
  */
  recover(intentSeq: number): Promise<EffectRecoveryReport>;
  private recoverInner;
  /**
  * RFC section 4.7 rows 2 and 3: reconcile-only recovery once a
  * revocation or expiry landed after the intent. No re-dispatch on
  * ANY row, the idempotency key included: the dedup makes a late send
  * safe against duplication, not against revocation.
  */
  private reconcileUnderCloser;
}
//#endregion
//#region src/fakes.d.ts
type FakeDispatchBehavior = "commit" | "accept-timeout" | "drop-unknown" | "fail" | "accept-no-receipt";
declare class FakeEffectProvider implements EffectAdapter {
  readonly descriptor: EffectProviderDescriptor;
  /** Committed effects by their fence key. */
  private readonly committed;
  /** Attempt identities whose acceptance a closeAcceptance call closed. */
  private readonly closedAttempts;
  private readonly stalled;
  /** Provider contacts, the kill point 7 counter. */
  dispatches: number;
  lookups: number;
  /** Late sends that landed as provider effects (the 'neither' hazard). */
  lateLandings: number;
  /** Late sends the provider's own fencing refused or deduped. */
  lateFenced: number;
  nextBehavior: FakeDispatchBehavior;
  /** Capture the next send in flight instead of executing it. */
  stallNextSend: boolean;
  private transferCounter;
  constructor(descriptor: EffectProviderDescriptor);
  /** How many committed effects exist for one logical key. */
  effectCount(logicalKey: string): number;
  private naturalKeyOf;
  private attemptIdentityOf;
  private fenceKeyOf;
  private mintReceipt;
  dispatch(request: EffectDispatchRequest): Promise<EffectDispatchResult>;
  /**
  * Releases every stalled send NOW, long after capture: the stale
  * sender transmitting after any amount of waiting. The provider's
  * own fencing decides what the late bytes do, exactly as in
  * production: a dedup key dedupes, a closed acceptance refuses the
  * specific attempt, a unique natural key refuses the duplicate, and
  * a 'neither' provider lets the late effect LAND.
  */
  releaseStalled(): void;
  lookup(request: EffectLookupRequest): Promise<EffectLookupAnswer>;
  closeAcceptance(request: EffectLookupRequest): Promise<EffectLookupAnswer>;
  private findCommitted;
}
//#endregion
//#region src/receipts.d.ts
interface EffectTrustKey {
  keyId: string;
  /** ISO instant; absent means valid from the beginning of time. */
  validFrom?: string;
  /** ISO instant; absent means no scheduled end. */
  validTo?: string;
  /** ISO instant; the key fails verification from here FORWARD. */
  revokedAt?: string;
}
interface EffectTrustEnvelope {
  /** Principals or provider identities that may sign receipts. */
  issuers: readonly string[];
  keys: readonly EffectTrustKey[];
  /**
  * Host-supplied signature check over the observation and the resolved
  * key. Absent means structural verification only (presence of a
  * signature field), which is the conformance posture; production
  * hosts supply real cryptography here.
  */
  verifySignature?: (observation: EffectReceiptObservation, key: EffectTrustKey) => boolean;
}
type ReceiptVerification = {
  verification: "verified";
} | {
  verification: "unverified";
  reason: string;
};
/**
* Verifies one receipt observation against the envelope. The order of
* checks is the RFC's: issuer identity, content bindings, key
* resolution with validity windows, revocation, then the signature
* itself. A receipt that binds fewer fields than its class requires
* verifies `unverified` no matter how good its signature is.
*/
declare function verifyReceiptObservation(observation: EffectReceiptObservation, effectClass: EffectClass, envelope: EffectTrustEnvelope): ReceiptVerification;
/** Adapts an envelope to the dispatcher's ReceiptVerifier seam. */
declare function envelopeVerifier(effectClass: EffectClass, envelope: EffectTrustEnvelope): (observation: EffectReceiptObservation) => "verified" | "unverified";
//#endregion
//#region src/reconciler.d.ts
interface EffectSweepReport {
  /** Machines the sweep examined. */
  swept: number;
  quarantined: Array<{
    intentSeq: number;
    reason: string;
  }>;
  recovered: Array<{
    intentSeq: number;
    report: EffectRecoveryReport;
  }>;
  /** Open machines legitimately waiting inside their budgets. */
  waiting: number;
  /** Standalone authorization-timeout refusals appended. */
  authorizationTimeouts: number;
}
interface RestorationReport {
  /** Provider effects with no journaled intent: quarantined by name. */
  unreconstructable: string[];
  /** True when no enumeration exists and the range quarantined whole. */
  rangeQuarantined: boolean;
  sweep: EffectSweepReport;
  /** Seq of the appended effect_reconciliation_complete decision. */
  completionSeq: number;
}
interface EffectReconcilerOptions {
  writer: EffectLaneWriter;
  /** Optional: without it the sweep only quarantines and reports. */
  dispatcher?: EffectDispatcher;
  now?: () => string;
}
declare class EffectReconciler {
  private readonly writer;
  private readonly dispatcher?;
  private readonly now;
  constructor(options: EffectReconcilerOptions);
  private quarantine;
  /** Why this machine's budgets demand a quarantine, if they do. */
  private exhaustion;
  /**
  * Effect authorizations whose deadline crossed while still open
  * (kill 22, the compensation wait included): the sweep appends a
  * durable standalone refusal for the licensed key, so nothing waits
  * forever on an authorization that can no longer arrive in time.
  */
  private refuseTimedOutAuthorizations;
  sweep(options?: {
    recover?: boolean;
  }): Promise<EffectSweepReport>;
  /**
  * The post-restore reconciliation (RFC section 4.5, item 3; kill
  * 25). Requires the current epoch to be a restoration epoch awaiting
  * release. With `enumerate`, every provider effect whose logical key
  * has no consumed intent anywhere in the journal quarantines
  * standalone by name (what could NOT be reconstructed), and open
  * machines re-enter recovery through the ordinary sweep. Without
  * authoritative enumeration the whole affected range quarantines as
  * one named record and automatic recovery is forbidden. Either way
  * the sweep runs, the completion decision appends, and attempt
  * dispatch re-enables for the epoch.
  */
  reconcileRestoration(options?: {
    enumerate?: () => Promise<Array<{
      logicalKey: string;
      receipt?: EffectReceiptObservation;
    }>>;
  }): Promise<RestorationReport>;
}
//#endregion
//#region src/telemetry.d.ts
interface EffectsTelemetry {
  /** Consumed intents that have not reached a terminal. */
  openEffectIntents: number;
  /** Present only when `nowMs` was supplied. */
  oldestOpenIntentAgeMs?: number;
  confirmed: number;
  compensated: number;
  refused: number;
  cancelledBeforeDispatch: number;
  quarantined: number;
  /** Machines that entered `unknown` at least once. */
  unknownEntered: number;
  duplicateReceiptsBenign: number;
  duplicateReceiptsConflicting: number;
  /** Incidents with no disposition citing them. */
  incidentsOpen: number;
}
declare function effectsTelemetryOf(fold: EffectLaneFold, options?: {
  nowMs?: number;
}): EffectsTelemetry;
//#endregion
//#region src/kit.d.ts
/** Rows that do not apply per effect class (part of the kit contract). */
declare const EFFECTS_KILL_EXCLUSIONS: Record<"monetary" | "signing" | "case", readonly string[]>;
interface EffectsConformanceOptions {
  /** A fresh, isolated store per call. */
  store: StoreFactory<JournalStore>;
  /** Explicitly single-process semantics for non-leasable stores. */
  singleProcess?: boolean;
}
/** The kill point catalog as named checks (RFC section 8). */
declare function effectsConformance(options: EffectsConformanceOptions): ConformanceSuite;
//#endregion
export { EFFECTS_KILL_EXCLUSIONS, EffectAdapter, EffectDispatchReport, EffectDispatchRequest, EffectDispatchResult, EffectDispatcher, EffectDispatcherOptions, EffectLookupAnswer, EffectLookupRequest, EffectProviderDescriptor, EffectReceiptObservation, EffectReconciler, EffectReconcilerOptions, EffectRecoveryReport, EffectSweepReport, EffectTrustEnvelope, EffectTrustKey, EffectsConformanceOptions, EffectsTelemetry, FakeDispatchBehavior, FakeEffectProvider, ReceiptVerification, ReceiptVerifier, RestorationReport, effectIdempotencyKey, effectsConformance, effectsTelemetryOf, envelopeVerifier, verifyReceiptObservation };