/**
 * Provider fakes for the conformance kit (plan 45): each fake enforces
 * exactly the fencing its capability row claims, and NOTHING else, so
 * a recovery path that leans on a guarantee the row does not offer
 * fails here before it fails in production. Three fences, faithfully:
 *
 * - 'idempotency-key': commits are keyed by the key; a duplicate send
 *   dedupes to the SAME effect and receipt.
 * - 'lookup' + 'conditional-create': commits are keyed by the natural
 *   key; a duplicate send FAILS at the provider.
 * - 'lookup' + 'acceptance-closing': closure is per ATTEMPT identity
 *   (RFC section 6: "for a specific attempt identity, not accepted
 *   and can no longer BE accepted"), and commits are keyed by attempt
 *   identity too, so a recovery that re-dispatches WITHOUT closing the
 *   ambiguous attempt first produces a VISIBLE duplicate here.
 * - 'neither': every send is its own blind effect.
 *
 * The stall hook is kill point 17's deliberately stalled predecessor:
 * a send captured in flight and released long after the successor
 * recovered, so the test proves at most one effect commits and that
 * elapsed time licensed nothing.
 */
import type {
  EffectAdapter,
  EffectDispatchRequest,
  EffectDispatchResult,
  EffectLookupAnswer,
  EffectLookupRequest,
  EffectProviderDescriptor,
  EffectReceiptObservation,
} from './adapter.js';

export type FakeDispatchBehavior =
  /** Commit the effect and return accepted with a receipt. */
  | 'commit'
  /** Commit the effect but time out: the caller sees unknown. */
  | 'accept-timeout'
  /** Drop the send entirely: nothing commits, the caller sees unknown. */
  | 'drop-unknown'
  /** Refuse classified: provably not executed. */
  | 'fail'
  /** Commit and accept, but hand back no receipt (it arrives async). */
  | 'accept-no-receipt';

interface CommittedEffect {
  receipt: EffectReceiptObservation;
  logicalKey: string;
}

/** A stalled send, capturable and releasable long after the fact. */
interface StalledSend {
  fenceKey: string;
  attemptIdentity: string;
  logicalKey: string;
  receiptSeed: EffectReceiptObservation;
}

export class FakeEffectProvider implements EffectAdapter {
  readonly descriptor: EffectProviderDescriptor;
  /** Committed effects by their fence key. */
  private readonly committed = new Map<string, CommittedEffect>();
  /** Attempt identities whose acceptance a closeAcceptance call closed. */
  private readonly closedAttempts = new Set<string>();
  private readonly stalled: StalledSend[] = [];
  /** Provider contacts, the kill point 7 counter. */
  dispatches = 0;
  lookups = 0;
  /** Late sends that landed as provider effects (the 'neither' hazard). */
  lateLandings = 0;
  /** Late sends the provider's own fencing refused or deduped. */
  lateFenced = 0;
  nextBehavior: FakeDispatchBehavior = 'commit';
  /** Capture the next send in flight instead of executing it. */
  stallNextSend = false;
  private transferCounter = 0;

  constructor(descriptor: EffectProviderDescriptor) {
    this.descriptor = descriptor;
  }

  /** How many committed effects exist for one logical key. */
  effectCount(logicalKey: string): number {
    let count = 0;
    for (const effect of this.committed.values()) {
      if (effect.logicalKey === logicalKey) {
        count += 1;
      }
    }
    return count;
  }

  private naturalKeyOf(request: { intent: { argumentsHash: string } }): string {
    return request.intent.argumentsHash;
  }

  private attemptIdentityOf(
    request: { intent: { argumentsHash: string } },
    attemptSeq: number,
  ): string {
    return `${this.naturalKeyOf(request)}#attempt${String(attemptSeq)}`;
  }

  private fenceKeyOf(request: EffectDispatchRequest): string {
    switch (this.descriptor.capabilityRow) {
      case 'idempotency-key':
        return request.idempotencyKey ?? `missing-idempotency-key:${String(this.dispatches)}`;
      case 'lookup':
        return this.descriptor.lookupQualification === 'conditional-create'
          ? this.naturalKeyOf(request)
          : this.attemptIdentityOf(request, request.attemptSeq);
      case 'neither':
        return `blind:${String(this.dispatches)}`;
    }
  }

  private mintReceipt(request: { intent: { logicalKey: string } }): EffectReceiptObservation {
    this.transferCounter += 1;
    return {
      transferId: `t-${request.intent.logicalKey}-${String(this.transferCounter)}`,
      amount: 100,
      currency: 'EUR',
      providerRef: `ref-${String(this.transferCounter)}`,
      timestamp: '2026-08-24T10:00:30.000Z',
      issuer: 'fake-provider',
      keyId: 'k1',
      signature: 'sig',
    };
  }

  async dispatch(request: EffectDispatchRequest): Promise<EffectDispatchResult> {
    await Promise.resolve();
    this.dispatches += 1;
    const fenceKey = this.fenceKeyOf(request);
    if (this.stallNextSend) {
      this.stallNextSend = false;
      this.stalled.push({
        fenceKey,
        attemptIdentity: this.attemptIdentityOf(request, request.attemptSeq),
        logicalKey: request.intent.logicalKey,
        receiptSeed: this.mintReceipt(request),
      });
      return { outcome: 'unknown', detail: 'the send stalled in flight' };
    }
    if (
      this.descriptor.capabilityRow === 'lookup' &&
      this.descriptor.lookupQualification === 'acceptance-closing' &&
      this.closedAttempts.has(this.attemptIdentityOf(request, request.attemptSeq))
    ) {
      return { outcome: 'failed', detail: 'acceptance closed for this attempt' };
    }
    const existing = this.committed.get(fenceKey);
    if (existing !== undefined) {
      if (this.descriptor.capabilityRow === 'idempotency-key') {
        // The provider dedupes: same key, same effect, same receipt.
        return { outcome: 'accepted', receipt: existing.receipt };
      }
      if (this.descriptor.lookupQualification === 'conditional-create') {
        // Conditional create: the duplicate send fails at the provider.
        return { outcome: 'failed', detail: 'duplicate natural key' };
      }
    }
    switch (this.nextBehavior) {
      case 'fail': {
        this.nextBehavior = 'commit';
        return { outcome: 'failed', detail: 'provider refused the request' };
      }
      case 'drop-unknown': {
        this.nextBehavior = 'commit';
        return { outcome: 'unknown', detail: 'transport failed before the provider' };
      }
      case 'accept-timeout': {
        this.nextBehavior = 'commit';
        const receipt = this.mintReceipt(request);
        this.committed.set(fenceKey, { receipt, logicalKey: request.intent.logicalKey });
        return { outcome: 'unknown', detail: 'timeout after the provider accepted' };
      }
      case 'accept-no-receipt': {
        this.nextBehavior = 'commit';
        const receipt = this.mintReceipt(request);
        this.committed.set(fenceKey, { receipt, logicalKey: request.intent.logicalKey });
        return { outcome: 'accepted', providerRef: receipt.providerRef };
      }
      case 'commit': {
        const receipt = this.mintReceipt(request);
        this.committed.set(fenceKey, { receipt, logicalKey: request.intent.logicalKey });
        return { outcome: 'accepted', providerRef: receipt.providerRef, receipt };
      }
    }
  }

  /**
   * Releases every stalled send NOW, long after capture: the stale
   * sender transmitting after any amount of waiting. The provider's
   * own fencing decides what the late bytes do, exactly as in
   * production: a dedup key dedupes, a closed acceptance refuses the
   * specific attempt, a unique natural key refuses the duplicate, and
   * a 'neither' provider lets the late effect LAND.
   */
  releaseStalled(): void {
    for (const send of this.stalled.splice(0)) {
      if (
        this.descriptor.capabilityRow === 'lookup' &&
        this.descriptor.lookupQualification === 'acceptance-closing' &&
        this.closedAttempts.has(send.attemptIdentity)
      ) {
        this.lateFenced += 1;
        continue;
      }
      if (this.committed.has(send.fenceKey)) {
        this.lateFenced += 1;
        continue;
      }
      this.committed.set(send.fenceKey, {
        receipt: send.receiptSeed,
        logicalKey: send.logicalKey,
      });
      this.lateLandings += 1;
    }
  }

  async lookup(request: EffectLookupRequest): Promise<EffectLookupAnswer> {
    await Promise.resolve();
    this.lookups += 1;
    const found = this.findCommitted(request);
    if (found !== undefined) {
      return { found: true, receipt: found.receipt };
    }
    // A plain lookup's negative is never final by itself.
    return { found: false, acceptanceClosed: false };
  }

  async closeAcceptance(request: EffectLookupRequest): Promise<EffectLookupAnswer> {
    await Promise.resolve();
    this.lookups += 1;
    const found = this.findCommitted(request);
    if (found !== undefined) {
      return { found: true, receipt: found.receipt };
    }
    if (request.attemptSeq !== undefined) {
      this.closedAttempts.add(this.attemptIdentityOf(request, request.attemptSeq));
    }
    return { found: false, acceptanceClosed: request.attemptSeq !== undefined };
  }

  private findCommitted(request: EffectLookupRequest): CommittedEffect | undefined {
    if (this.descriptor.capabilityRow === 'idempotency-key') {
      return this.committed.get(request.idempotencyKey ?? '');
    }
    if (this.descriptor.lookupQualification === 'conditional-create') {
      return this.committed.get(this.naturalKeyOf(request));
    }
    // Acceptance-closing commits are keyed per attempt identity; the
    // provider's search spans every attempt of the effect.
    const prefix = `${this.naturalKeyOf(request)}#attempt`;
    for (const [key, effect] of this.committed) {
      if (key.startsWith(prefix)) {
        return effect;
      }
    }
    return undefined;
  }
}
