/**
 * The pure admission algorithms (plan 45, rfcs/admission.md section
 * 4.2): deterministic functions over plain state rows, no clocks read
 * and no storage touched, so two scheduler replicas over the same
 * durable state grant identically and the durable implementations
 * (sqlite, postgres) reuse EXACTLY this arithmetic.
 *
 * The one scheduling algorithm, stated fully: START TIME FAIR QUEUING
 * (SFQ), hierarchical. The service cost of a ticket is its reserved
 * WIRES, the one scheduler unit; tokens, dollars, and exposure are
 * reservation dimensions that gate feasibility, never scheduling cost,
 * so the cost function is total. Persistent per-queue state is exactly
 * (virtual time V, per-member finish tag). A ticket's start tag is
 * max(its member's finish tag, V at arrival); its finish tag is start
 * plus cost over weight; the grant takes the smallest START tag with
 * the store-assigned arrival seq breaking ties deterministically; and
 * V advances to the start tag of each ticket as it is granted
 * (initially 0, never decreasing). The max in the start-tag rule caps
 * an idle member's stale finish tag: no credit hoarding beyond the
 * configured burst.
 */
import { jcsSerialize } from '../l0/jcs.js';
import type { AdmissionReservation, AdmissionScopeDimensions } from '../l0/spi/admission.js';

/** Persistent per-queue SFQ state. */
export interface FairQueueState {
  virtualTime: number;
  /** memberKey -> the member's last finish tag. */
  finishTags: Record<string, number>;
}

export function emptyFairQueue(): FairQueueState {
  return { virtualTime: 0, finishTags: {} };
}

/** The tags a ticket receives at arrival (pure; mutates nothing). */
export function sfqTagsOnArrival(
  state: FairQueueState,
  memberKey: string,
  costWires: number,
  weight: number,
): { startTag: number; finishTag: number } {
  const startTag = Math.max(state.finishTags[memberKey] ?? 0, state.virtualTime);
  const finishTag = startTag + costWires / weight;
  return { startTag, finishTag };
}

/** Records the arrival: the member's finish tag advances. */
export function sfqRecordArrival(
  state: FairQueueState,
  memberKey: string,
  finishTag: number,
): FairQueueState {
  return {
    virtualTime: state.virtualTime,
    finishTags: { ...state.finishTags, [memberKey]: finishTag },
  };
}

/** Records a grant: V advances to the granted start tag, monotonically. */
export function sfqRecordGrant(state: FairQueueState, startTag: number): FairQueueState {
  return {
    virtualTime: Math.max(state.virtualTime, startTag),
    finishTags: state.finishTags,
  };
}

/**
 * The deterministic grant order over queued rows: smallest start tag,
 * ties by arrival seq. Two replicas over the same rows sort identically.
 */
export function sfqGrantOrder<T extends { startTag: number; arrivalSeq: number }>(
  queued: readonly T[],
): T[] {
  return [...queued].sort((a, b) =>
    a.startTag === b.startTag ? a.arrivalSeq - b.arrivalSeq : a.startTag - b.startTag,
  );
}

/** A sliding window as a ring of sub-window counters (section 4.2, 1). */
export interface SlidingWindowState {
  /** Consumption per slot, oldest first after normalization. */
  slots: number[];
  /** The epoch-slot index the LAST slot corresponds to. */
  headSlot: number;
}

export function emptySlidingWindow(slotCount: number): SlidingWindowState {
  return { slots: Array.from({ length: slotCount }, () => 0), headSlot: 0 };
}

/** Rotates the ring so `nowSlot` is the head; expired slots zero out. */
export function windowAdvance(state: SlidingWindowState, nowSlot: number): SlidingWindowState {
  const advanceBy = Math.max(0, nowSlot - state.headSlot);
  if (advanceBy === 0) {
    return state;
  }
  const length = state.slots.length;
  const slots =
    advanceBy >= length
      ? Array.from({ length }, () => 0)
      : [...state.slots.slice(advanceBy), ...Array.from({ length: advanceBy }, () => 0)];
  return { slots, headSlot: nowSlot };
}

/** The trailing sum the cap bounds. */
export function windowSum(state: SlidingWindowState): number {
  return state.slots.reduce((sum, slot) => sum + slot, 0);
}

/**
 * Admits when the trailing sum stays under cap. This bounds the fixed
 * epoch double burst to one sub-window's allowance, a documented burst,
 * not a silent fix of the pinned RV708 semantics.
 */
export function windowAdmits(state: SlidingWindowState, cap: number, amount: number): boolean {
  return windowSum(state) + amount <= cap;
}

export function windowConsume(state: SlidingWindowState, amount: number): SlidingWindowState {
  const slots = [...state.slots];
  slots[slots.length - 1] = (slots[slots.length - 1] ?? 0) + amount;
  return { slots, headSlot: state.headSlot };
}

/** Refunds into the head slot; never below zero across the ring. */
export function windowRefund(state: SlidingWindowState, amount: number): SlidingWindowState {
  let remaining = amount;
  const slots = [...state.slots];
  for (let index = slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const take = Math.min(slots[index] ?? 0, remaining);
    slots[index] = (slots[index] ?? 0) - take;
    remaining -= take;
  }
  return { slots, headSlot: state.headSlot };
}

/** Token bucket state (section 4.2, item 2). */
export interface TokenBucketState {
  tokens: number;
  lastMs: number;
}

export function bucketAdvance(
  state: TokenBucketState,
  nowMs: number,
  ratePerSecond: number,
  burst: number,
): TokenBucketState {
  const elapsed = Math.max(0, nowMs - state.lastMs);
  return {
    tokens: Math.min(burst, state.tokens + (elapsed / 1000) * ratePerSecond),
    lastMs: Math.max(state.lastMs, nowMs),
  };
}

export function bucketAdmits(state: TokenBucketState, amount: number): boolean {
  return state.tokens >= amount;
}

export function bucketConsume(state: TokenBucketState, amount: number): TokenBucketState {
  return { tokens: state.tokens - amount, lastMs: state.lastMs };
}

export function bucketRefund(
  state: TokenBucketState,
  amount: number,
  burst: number,
): TokenBucketState {
  return { tokens: Math.min(burst, state.tokens + amount), lastMs: state.lastMs };
}

/**
 * The three bucket levels (RFC section 4.1): the resolved effective
 * tenant; tenant plus providerAccount; the full scope digest. Keys are
 * the JCS serialization of the level's projected sub-scope, canonical
 * bytes everywhere, so the shipped limiters' addressing split never
 * leaks into this seam. A level with nothing to key (no resolved
 * tenant, no provider account) is absent rather than a phantom global
 * bucket: fail-closed matching happens in the scheduler, not here.
 */
export interface AdmissionLevelKeys {
  tenant?: string;
  providerAccount?: string;
  scope?: string;
}

export function admissionLevelKeys(
  resolvedTenant: string | undefined,
  scope: AdmissionScopeDimensions | undefined,
): AdmissionLevelKeys {
  const keys: AdmissionLevelKeys = {};
  if (resolvedTenant !== undefined) {
    keys.tenant = jcsSerialize({ tenant: resolvedTenant });
  }
  if (resolvedTenant !== undefined && scope?.providerAccount !== undefined) {
    keys.providerAccount = jcsSerialize({
      providerAccount: scope.providerAccount,
      tenant: resolvedTenant,
    });
  }
  if (scope !== undefined && Object.keys(scope).length > 0) {
    keys.scope = jcsSerialize(scope);
  }
  return keys;
}

/** Reservation arithmetic helpers (component-wise, absent = 0). */
export function reservationMinus(
  a: AdmissionReservation,
  b: AdmissionReservation | undefined,
): AdmissionReservation {
  return {
    wires: Math.max(0, a.wires - (b?.wires ?? 0)),
    ...(a.inputTokens === undefined
      ? {}
      : { inputTokens: Math.max(0, a.inputTokens - (b?.inputTokens ?? 0)) }),
    ...(a.usd === undefined ? {} : { usd: Math.max(0, a.usd - (b?.usd ?? 0)) }),
    ...(a.exposureUsd === undefined
      ? {}
      : { exposureUsd: Math.max(0, a.exposureUsd - (b?.exposureUsd ?? 0)) }),
  };
}

/** Monotone high-water merge of covers (checkpoint THEN consume). */
export function coverMerge(
  current: AdmissionReservation | undefined,
  next: AdmissionReservation,
): AdmissionReservation {
  return {
    wires: Math.max(current?.wires ?? 0, next.wires),
    ...(next.inputTokens !== undefined || current?.inputTokens !== undefined
      ? { inputTokens: Math.max(current?.inputTokens ?? 0, next.inputTokens ?? 0) }
      : {}),
    ...(next.usd !== undefined || current?.usd !== undefined
      ? { usd: Math.max(current?.usd ?? 0, next.usd ?? 0) }
      : {}),
    ...(next.exposureUsd !== undefined || current?.exposureUsd !== undefined
      ? { exposureUsd: Math.max(current?.exposureUsd ?? 0, next.exposureUsd ?? 0) }
      : {}),
  };
}
