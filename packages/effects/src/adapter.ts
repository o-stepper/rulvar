/**
 * The effect adapter seam (plan 45, rfcs/effects.md section 11, item
 * 3): the ONLY dispatch path the conformance kit blesses for effect
 * classes, wired THROUGH the intent machinery by construction. There
 * is no method on this interface that sends without an attempt record:
 * `dispatch` receives the seq of the attempt the dispatcher appended
 * BEFORE calling it, so the journal protocol cannot be bypassed by the
 * seam that exists to honor it. The plain ToolExecutorProvider path
 * stays what it is, the seam for sandboxed computation; RFC section 5
 * prohibits effect classes on it.
 */
import type { EffectCapabilityRow, EffectLookupQualification, EffectMachine } from '@rulvar/core';

/** One provider row of the capability matrix (RFC section 6). */
export interface EffectProviderDescriptor {
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
export interface EffectReceiptObservation {
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

export interface EffectDispatchRequest {
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

export type EffectDispatchResult =
  | { outcome: 'accepted'; providerRef?: string; receipt?: EffectReceiptObservation }
  /** 'failed' MUST mean provably not executed (a classified refusal). */
  | { outcome: 'failed'; detail: string }
  | { outcome: 'unknown'; detail?: string };

export interface EffectLookupRequest {
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

export type EffectLookupAnswer =
  | { found: true; receipt: EffectReceiptObservation }
  | {
      found: false;
      /**
       * True only when the negative is provider-enforced FINAL: the
       * specific effect is not accepted and can no longer BE accepted
       * (RFC section 6). An eventually consistent miss is `false`.
       */
      acceptanceClosed: boolean;
    };

export interface EffectAdapter {
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
export function effectIdempotencyKey(intent: EffectMachine): string {
  return `${intent.logicalKey}#epoch${String(intent.epochRef)}`;
}
