import { EffectCapabilityRow, EffectLaneWriter, EffectLookupQualification, EffectMachine } from "@rulvar/core";

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
  /** The provider's truth, by the strongest primitive the row offers. */
  private providerTruth;
  private quarantine;
  /**
  * The crash-window recovery (RFC section 8): derived from what the
  * journal proves and what the capability row licenses. Never a blind
  * retry; never a provider contact on an already-closed machine.
  */
  recover(intentSeq: number): Promise<EffectRecoveryReport>;
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
export { EffectAdapter, EffectDispatchReport, EffectDispatchRequest, EffectDispatchResult, EffectDispatcher, EffectDispatcherOptions, EffectLookupAnswer, EffectLookupRequest, EffectProviderDescriptor, EffectReceiptObservation, EffectRecoveryReport, FakeDispatchBehavior, FakeEffectProvider, ReceiptVerifier, effectIdempotencyKey };