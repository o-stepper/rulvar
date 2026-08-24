/**
 * MemoryAdmissionScheduler (plan 45, rfcs/admission.md): the single
 * process reference implementation of the durable admission SPI, over
 * exactly the pure algorithms the durable stores reuse. Explicitly
 * single-process semantics (nothing survives an exit); its value is
 * the executable definition of the lifecycle: conditional create by
 * unit identity, hierarchical SFQ grant order, all-levels-or-nothing
 * consumption, the emergency reserve, lease expiry with the
 * conservative two-tier settlement (covers here are always fenced,
 * because the fence is in-process), release refunds with bucket debt
 * that never denies retroactively, and one winner among racing
 * release, expiry, and cancel.
 */
import { ConfigError } from '../l0/errors.js';
import type {
  AdmissionTicketDecision,
  AdmissionRecovery,
  AdmissionRequest,
  AdmissionReservation,
  AdmissionScheduler,
  AdmissionTicket,
} from '../l0/spi/admission.js';
import {
  admissionLevelKeys,
  bucketAdmits,
  bucketAdvance,
  bucketConsume,
  bucketRefund,
  coverMerge,
  emptyFairQueue,
  emptySlidingWindow,
  reservationMinus,
  sfqGrantOrder,
  sfqRecordArrival,
  sfqRecordGrant,
  sfqTagsOnArrival,
  windowAdmits,
  windowAdvance,
  windowConsume,
  windowRefund,
  type FairQueueState,
  type SlidingWindowState,
  type TokenBucketState,
} from './algorithms.js';

export interface AdmissionLevelConfig {
  algorithm: 'sliding-window' | 'token-bucket';
  /** Total wires capacity: the feasibility bound and the cap. */
  capWires: number;
  /** Sliding window geometry (default 60000 ms over 6 slots). */
  windowMs?: number;
  slots?: number;
  /** Token bucket refill (wires per second); burst = capWires. */
  refillWiresPerSecond?: number;
  /** Level-2 only: the per provider account concurrency semaphore. */
  concurrency?: number;
  /** Fraction of capWires only emergency work may take (section 4.2). */
  emergencyReserveFraction?: number;
}

export interface MemoryAdmissionOptions {
  levels: {
    tenant?: AdmissionLevelConfig;
    providerAccount?: AdmissionLevelConfig;
    scope?: AdmissionLevelConfig;
  };
  /** Fairness weights by resolved tenant; default 1. */
  weights?: Record<string, number>;
  leaseTtlMs: number;
  /** The injectable clock, REQUIRED: the reference owns no wall clock. */
  now: () => number;
  /** Debt age-out horizon; default the tenant level's window. */
  debtAgeMs?: number;
}

type LevelName = 'tenant' | 'providerAccount' | 'scope';
const LEVELS: readonly LevelName[] = ['tenant', 'providerAccount', 'scope'];

interface BucketState {
  window?: SlidingWindowState;
  bucket?: TokenBucketState;
  /** Debt entries: consumption beyond reservation, aged out over time. */
  debts: Array<{ wires: number; atMs: number }>;
  /** Level-2 semaphore holders. */
  held: number;
}

interface InternalTicket {
  ticket: AdmissionTicket;
  request: AdmissionRequest;
  keys: Partial<Record<LevelName, string>>;
  /** Account-queue tags (the second stage of the hierarchy). */
  accountStartTag: number;
  accountFinishTag: number;
  appliedOps: Set<string>;
}

const key = (unitId: string, generation: string): string => `${unitId}#${generation}`;

export class MemoryAdmissionScheduler implements AdmissionScheduler {
  private readonly options: MemoryAdmissionOptions;
  private readonly tickets = new Map<string, InternalTicket>();
  private readonly buckets = new Map<string, BucketState>();
  private tenantQueue: FairQueueState = emptyFairQueue();
  private readonly accountQueues = new Map<string, FairQueueState>();
  private arrivalCounter = 0;

  constructor(options: MemoryAdmissionOptions) {
    for (const level of LEVELS) {
      const config = options.levels[level];
      if (config !== undefined && (!Number.isFinite(config.capWires) || config.capWires <= 0)) {
        throw new ConfigError(`admission level '${level}' requires a positive capWires`);
      }
    }
    this.options = options;
  }

  private levelConfig(level: LevelName): AdmissionLevelConfig | undefined {
    return this.options.levels[level];
  }

  private bucketFor(level: LevelName, bucketKey: string): BucketState {
    const config = this.levelConfig(level);
    const id = `${level}:${bucketKey}`;
    let state = this.buckets.get(id);
    if (state === undefined) {
      state = { debts: [], held: 0 };
      if (config?.algorithm === 'sliding-window') {
        state.window = emptySlidingWindow(config.slots ?? 6);
      } else if (config?.algorithm === 'token-bucket') {
        state.bucket = { tokens: config.capWires, lastMs: this.options.now() };
      }
      this.buckets.set(id, state);
    }
    return state;
  }

  private slotOf(config: AdmissionLevelConfig, nowMs: number): number {
    const windowMs = config.windowMs ?? 60_000;
    const slots = config.slots ?? 6;
    return Math.floor(nowMs / (windowMs / slots));
  }

  private effectiveDebt(state: BucketState, nowMs: number): number {
    const horizon = this.options.debtAgeMs ?? this.levelConfig('tenant')?.windowMs ?? 60_000;
    state.debts = state.debts.filter((debt) => nowMs - debt.atMs < horizon);
    return state.debts.reduce((sum, debt) => sum + debt.wires, 0);
  }

  /** The cap a NON-emergency request admits under (reserve carved out). */
  private admissibleCap(config: AdmissionLevelConfig, emergency: boolean): number {
    const reserve = emergency ? 0 : (config.emergencyReserveFraction ?? 0);
    return config.capWires * (1 - reserve);
  }

  private levelAdmits(
    level: LevelName,
    bucketKey: string,
    wires: number,
    emergency: boolean,
    nowMs: number,
  ): boolean {
    const config = this.levelConfig(level);
    if (config === undefined) {
      return true;
    }
    const state = this.bucketFor(level, bucketKey);
    const cap = this.admissibleCap(config, emergency) - this.effectiveDebt(state, nowMs);
    if (config.algorithm === 'sliding-window' && state.window !== undefined) {
      state.window = windowAdvance(state.window, this.slotOf(config, nowMs));
      if (!windowAdmits(state.window, cap, wires)) {
        return false;
      }
    }
    if (config.algorithm === 'token-bucket' && state.bucket !== undefined) {
      state.bucket = bucketAdvance(
        state.bucket,
        nowMs,
        config.refillWiresPerSecond ?? config.capWires,
        cap,
      );
      if (!bucketAdmits(state.bucket, wires)) {
        return false;
      }
    }
    if (level === 'providerAccount' && config.concurrency !== undefined) {
      if (state.held >= config.concurrency) {
        return false;
      }
    }
    return true;
  }

  private consumeLevels(internal: InternalTicket, nowMs: number): void {
    for (const level of LEVELS) {
      const bucketKey = internal.keys[level];
      const config = this.levelConfig(level);
      if (bucketKey === undefined || config === undefined) {
        continue;
      }
      const state = this.bucketFor(level, bucketKey);
      const wires = internal.ticket.reservation.wires;
      if (config.algorithm === 'sliding-window' && state.window !== undefined) {
        state.window = windowConsume(
          windowAdvance(state.window, this.slotOf(config, nowMs)),
          wires,
        );
      }
      if (config.algorithm === 'token-bucket' && state.bucket !== undefined) {
        state.bucket = bucketConsume(state.bucket, wires);
      }
      if (level === 'providerAccount' && config.concurrency !== undefined) {
        state.held += 1;
      }
    }
  }

  private refundLevels(internal: InternalTicket, wires: number, restoreSlot: boolean): void {
    for (const level of LEVELS) {
      const bucketKey = internal.keys[level];
      const config = this.levelConfig(level);
      if (bucketKey === undefined || config === undefined) {
        continue;
      }
      const state = this.bucketFor(level, bucketKey);
      if (wires > 0) {
        if (config.algorithm === 'sliding-window' && state.window !== undefined) {
          state.window = windowRefund(state.window, wires);
        }
        if (config.algorithm === 'token-bucket' && state.bucket !== undefined) {
          state.bucket = bucketRefund(state.bucket, wires, config.capWires);
        }
      }
      if (level === 'providerAccount' && config.concurrency !== undefined && restoreSlot) {
        state.held = Math.max(0, state.held - 1);
      }
    }
  }

  private recordDebt(internal: InternalTicket, wires: number, nowMs: number): void {
    if (wires <= 0) {
      return;
    }
    for (const level of LEVELS) {
      const bucketKey = internal.keys[level];
      if (bucketKey === undefined || this.levelConfig(level) === undefined) {
        continue;
      }
      this.bucketFor(level, bucketKey).debts.push({ wires, atMs: nowMs });
    }
  }

  private applied(internal: InternalTicket, opId: string): boolean {
    if (internal.appliedOps.has(opId)) {
      return true;
    }
    internal.appliedOps.add(opId);
    return false;
  }

  async enqueue(request: AdmissionRequest, opId: string): Promise<AdmissionTicketDecision> {
    await Promise.resolve();
    const nowMs = this.options.now();
    const existing = this.tickets.get(key(request.unitId, request.generation));
    if (existing !== undefined) {
      return this.decisionOf(existing);
    }
    if (!Number.isInteger(request.reservation.wires) || request.reservation.wires < 1) {
      throw new ConfigError('an admission reservation requires at least one wire');
    }
    if (
      request.resolvedTenant !== undefined &&
      request.scope?.tenant !== undefined &&
      request.resolvedTenant !== request.scope.tenant &&
      request.tenantFromScope !== true
    ) {
      throw new ConfigError(
        `the resolved tenant '${request.resolvedTenant}' and the scope tenant ` +
          `'${request.scope.tenant}' disagree, and the deployment did not declare ` +
          "tenantFrom: 'scope', the one configuration in which that has a documented " +
          'meaning (rfcs/admission.md section 4.1)',
      );
    }
    const keys = admissionLevelKeys(request.resolvedTenant, request.scope);
    // Feasibility at enqueue: a reservation no matched bucket can EVER
    // fit refuses terminally instead of camping at the head.
    for (const level of LEVELS) {
      const config = this.levelConfig(level);
      const bucketKey = keys[level];
      if (config === undefined || bucketKey === undefined) {
        continue;
      }
      if (request.reservation.wires > this.admissibleCap(config, request.emergency === true)) {
        const ticket = this.mintTicket(request, keys, nowMs, 'denied');
        ticket.ticket.deniedReason =
          `the reservation (${String(request.reservation.wires)} wires) exceeds the ` +
          `'${level}' level's total admissible capacity ` +
          `(${String(this.admissibleCap(config, request.emergency === true))}); it can ` +
          'never fit and never camps at the head of the queue';
        return { state: 'denied', reason: ticket.ticket.deniedReason };
      }
    }
    const internal = this.mintTicket(request, keys, nowMs, 'queued');
    await this.pump(`${opId}:pump`);
    return this.decisionOf(internal);
  }

  private mintTicket(
    request: AdmissionRequest,
    keys: Partial<Record<LevelName, string>>,
    nowMs: number,
    state: 'queued' | 'denied',
  ): InternalTicket {
    const weight = request.weight ?? this.options.weights?.[request.resolvedTenant ?? ''] ?? 1;
    if (!(weight > 0)) {
      throw new ConfigError('admission weights must be positive');
    }
    this.arrivalCounter += 1;
    const tenantMember = request.resolvedTenant ?? '-';
    const tenantTags = sfqTagsOnArrival(
      this.tenantQueue,
      tenantMember,
      request.reservation.wires,
      weight,
    );
    this.tenantQueue = sfqRecordArrival(this.tenantQueue, tenantMember, tenantTags.finishTag);
    const accountQueueId = `accounts:${tenantMember}`;
    const accountQueue = this.accountQueues.get(accountQueueId) ?? emptyFairQueue();
    const accountMember = request.scope?.providerAccount ?? '-';
    const accountTags = sfqTagsOnArrival(
      accountQueue,
      accountMember,
      request.reservation.wires,
      weight,
    );
    this.accountQueues.set(
      accountQueueId,
      sfqRecordArrival(accountQueue, accountMember, accountTags.finishTag),
    );
    const ticket: AdmissionTicket = {
      unitId: request.unitId,
      generation: request.generation,
      state,
      ...(request.resolvedTenant === undefined ? {} : { resolvedTenant: request.resolvedTenant }),
      ...(request.scope === undefined ? {} : { scope: request.scope }),
      reservation: request.reservation,
      weight,
      arrivalSeq: this.arrivalCounter,
      startTag: tenantTags.startTag,
      finishTag: tenantTags.finishTag,
      enqueuedAtMs: nowMs,
    };
    const internal: InternalTicket = {
      ticket,
      request,
      keys,
      accountStartTag: accountTags.startTag,
      accountFinishTag: accountTags.finishTag,
      appliedOps: new Set(),
    };
    this.tickets.set(key(request.unitId, request.generation), internal);
    return internal;
  }

  private queuedInGrantOrder(): InternalTicket[] {
    const queued = [...this.tickets.values()].filter((t) => t.ticket.state === 'queued');
    return sfqGrantOrder(
      queued.map((internal) => ({
        startTag: internal.ticket.startTag,
        arrivalSeq: internal.ticket.arrivalSeq,
        internal,
      })),
    ).map((row) => row.internal);
  }

  private decisionOf(internal: InternalTicket): AdmissionTicketDecision {
    const ticket = internal.ticket;
    if (ticket.state === 'granted') {
      return { state: 'granted', ticket };
    }
    if (ticket.state === 'queued') {
      const position = this.queuedInGrantOrder().findIndex((candidate) => candidate === internal);
      return { state: 'queued', ticket, position: Math.max(0, position) };
    }
    if (ticket.state === 'denied') {
      return { state: 'denied', reason: ticket.deniedReason ?? 'denied' };
    }
    // Settled tickets report granted-shape truth through recover();
    // enqueue on a settled unit is a replay and answers the terminal.
    return { state: 'denied', reason: `the unit already settled '${ticket.state}'` };
  }

  async recover(unitId: string, generation: string, opId: string): Promise<AdmissionRecovery> {
    await Promise.resolve();
    const internal = this.tickets.get(key(unitId, generation));
    if (internal === undefined) {
      return { state: 'unknown' };
    }
    if (internal.ticket.state === 'granted') {
      await this.renew(unitId, generation, `${opId}:renew`);
      return { state: 'granted', ticket: internal.ticket };
    }
    if (internal.ticket.state === 'queued') {
      const position = this.queuedInGrantOrder().findIndex((c) => c === internal);
      return { state: 'queued', ticket: internal.ticket, position: Math.max(0, position) };
    }
    return { state: 'unknown' };
  }

  async renew(unitId: string, generation: string, _opId: string): Promise<void> {
    await Promise.resolve();
    const internal = this.tickets.get(key(unitId, generation));
    if (internal?.ticket.state === 'granted') {
      internal.ticket.leaseExpiresAtMs = this.options.now() + this.options.leaseTtlMs;
    }
  }

  async checkpointCover(
    unitId: string,
    generation: string,
    cover: AdmissionReservation,
    opId: string,
  ): Promise<void> {
    await Promise.resolve();
    const internal = this.tickets.get(key(unitId, generation));
    if (internal === undefined || internal.ticket.state !== 'granted') {
      throw new ConfigError('checkpointCover requires a granted ticket');
    }
    if ((internal.ticket.leaseExpiresAtMs ?? 0) <= this.options.now()) {
      // The fence: an expired lease's cover write is rejected, which is
      // exactly what makes the conservative expiry refund provable.
      throw new ConfigError('the ticket lease expired; the cover write is fenced off');
    }
    if (this.applied(internal, opId)) {
      return;
    }
    internal.ticket.cover = coverMerge(internal.ticket.cover, cover);
  }

  async release(
    unitId: string,
    generation: string,
    actuals: AdmissionReservation,
    opId: string,
  ): Promise<void> {
    await Promise.resolve();
    const internal = this.tickets.get(key(unitId, generation));
    if (internal === undefined || this.applied(internal, opId)) {
      return;
    }
    const nowMs = this.options.now();
    const state = internal.ticket.state;
    if (state === 'granted') {
      const unused = reservationMinus(internal.ticket.reservation, actuals);
      this.refundLevels(internal, unused.wires, true);
      this.recordDebt(
        internal,
        Math.max(0, actuals.wires - internal.ticket.reservation.wires),
        nowMs,
      );
      internal.ticket.state = 'released';
      await this.pump(`${opId}:pump`);
      return;
    }
    if (state === 'expired') {
      // The late settlement: accepted idempotently, landing as debt
      // beyond what the conservative expiry already refunded.
      const covered = internal.ticket.cover?.wires ?? 0;
      this.recordDebt(internal, Math.max(0, actuals.wires - covered), nowMs);
      return;
    }
    // released, refunded, denied, queued: the arbitration already
    // decided; a second settlement is a durable no-op.
  }

  async cancel(unitId: string, generation: string, opId: string): Promise<void> {
    await Promise.resolve();
    const internal = this.tickets.get(key(unitId, generation));
    if (internal === undefined || this.applied(internal, opId)) {
      return;
    }
    if (internal.ticket.state === 'queued') {
      internal.ticket.state = 'refunded';
      return;
    }
    if (internal.ticket.state === 'granted') {
      await this.release(
        unitId,
        generation,
        internal.ticket.cover ?? { wires: 0 },
        `${opId}:release`,
      );
    }
  }

  async pump(_opId: string): Promise<AdmissionTicket[]> {
    await Promise.resolve();
    const nowMs = this.options.now();
    // Expire stale leases first: the conservative settlement. Covers
    // here are always fenced (the fence is in-process), so expiry
    // refunds reservation minus the covered high water, provably
    // unused by construction, and the semaphore restores because the
    // holder's further consumption is fenced off.
    for (const internal of this.tickets.values()) {
      const ticket = internal.ticket;
      if (ticket.state === 'granted' && (ticket.leaseExpiresAtMs ?? Infinity) <= nowMs) {
        const covered = ticket.cover ?? { wires: 0 };
        const refund = reservationMinus(ticket.reservation, covered);
        this.refundLevels(internal, refund.wires, true);
        ticket.state = 'expired';
      }
    }
    const granted: AdmissionTicket[] = [];
    // The grant loop: SFQ-first, and the head WAITS when capacity does
    // not admit (skipping past it would starve exactly the oversized
    // ticket the no-starvation claim protects).
    for (;;) {
      const order = this.queuedInGrantOrder();
      const head = order[0];
      if (head === undefined) {
        break;
      }
      const admits = LEVELS.every((level) => {
        const bucketKey = head.keys[level];
        return (
          bucketKey === undefined ||
          this.levelAdmits(
            level,
            bucketKey,
            head.ticket.reservation.wires,
            head.request.emergency === true,
            nowMs,
          )
        );
      });
      if (!admits) {
        break;
      }
      this.consumeLevels(head, nowMs);
      head.ticket.state = 'granted';
      head.ticket.grantedAtMs = nowMs;
      head.ticket.leaseExpiresAtMs = nowMs + this.options.leaseTtlMs;
      this.tenantQueue = sfqRecordGrant(this.tenantQueue, head.ticket.startTag);
      const accountQueueId = `accounts:${head.ticket.resolvedTenant ?? '-'}`;
      const accountQueue = this.accountQueues.get(accountQueueId);
      if (accountQueue !== undefined) {
        this.accountQueues.set(accountQueueId, sfqRecordGrant(accountQueue, head.accountStartTag));
      }
      granted.push(head.ticket);
    }
    return granted;
  }
}
