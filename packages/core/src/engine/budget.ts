/**
 * Three-layer budget (M1-T09, hierarchical sub-accounts M6-T06;
 * invariant I4). Layer 1: PROJECTED admission before spawn: a spawn is
 * admitted only when spent + committedReserve + finalizeReserve + the
 * PROPOSED reserve fits the ceiling of EVERY account in the ancestor
 * chain (exact fill allowed), checked atomically before any commit.
 * Layer 2: the per-turn guard against the spawn's own chain, plus the
 * pre-dispatch output bound (layer 2b): every turn's maxOutputTokens is
 * clamped to what the remaining chain budget affords from the serving
 * model, and a turn that cannot afford one output token is denied before
 * dispatch. Layer 3: the AbortSignal ceiling severing live streams, with
 * partial usage written usageApprox.
 * B0 is immutable after start: no API tops it up.
 *
 * The account tree: the run root plus one
 * sub-account per admitted child workflow (and, from M7, the orchestrator
 * account and plan/NodeId accounts). A child's spend propagates to ALL
 * ancestors up to the run root; the root ceiling remains the true
 * invariant. Sub-account spend is per-process state: on resume the root
 * is seeded from the ledger fold while sub-accounts restart empty (their
 * reserves are recovered from spawn-admission decision entries); the
 * per-account historical fold completes with DEF-7 in M7.
 *
 * Full contract: https://docs.rulvar.com/guide/budgets
 */
import { BudgetExhaustedError, ConfigError } from '../l0/errors.js';
import { requireNonNegativeNumber } from '../l0/validate-numbers.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { sanitizeUsage, sanitizeUsageDelta } from '../l0/usage.js';
import type { ModelCaps, Pricing } from '../l0/spi/provider.js';
import { affordableOutputTokens, priceUsdOf } from '../model/pricing.js';
import { BUDGET_ABORT_REASON, type RuntimeEventSink } from '../runtime/agent-loop.js';

export type Spend = { usd: number; usage: Usage; agentsSpawned: number };

/** Last resort of the admission reserve formula. */
export const DEFAULT_FLAT_RESERVE_USD = 0.5;

/** The run-root account scope. */
export const ROOT_ACCOUNT = 'run';

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/**
 * A ceiling that is NaN or negative silently disarms every layer (each
 * comparison against it is false), which is indistinguishable from
 * uncapped. That must be a loud configuration error, never a silent
 * fail-open (v1.20.0 review P1-1).
 */
function requireValidCeiling(ceilingUsd: number, what: string): void {
  if (!Number.isFinite(ceilingUsd) || ceilingUsd < 0) {
    throw new ConfigError(
      `${what} must be a finite nonnegative USD amount, got ${String(ceilingUsd)}`,
    );
  }
}

/**
 * The admission reserve for a spawn: opts.estCost, else profile.estCost,
 * else price(countTokens(input) + one turn's worth of output), else the
 * engine flat default. The output term is caps.maxOutputTokens clamped to
 * limits.maxOutputTokensPerTurn when the spawn carries one, so a host can
 * bound reserves without hand-written estimates. The priced path uses the
 * SAME price function as settlement (priceUsdOf), so long-context tiers
 * apply to estimates too.
 */
export function admissionReserveUsd(options: {
  estCost?: number;
  profileEstCost?: number;
  inputTokens?: number;
  caps?: ModelCaps;
  maxOutputTokensPerTurn?: number;
  flatReserveUsd?: number;
}): number {
  if (options.estCost !== undefined) {
    return options.estCost;
  }
  if (options.profileEstCost !== undefined) {
    return options.profileEstCost;
  }
  const pricing = options.caps?.pricing;
  if (options.inputTokens !== undefined && pricing !== undefined && options.caps !== undefined) {
    const outputTokens =
      options.maxOutputTokensPerTurn === undefined
        ? options.caps.maxOutputTokens
        : Math.min(options.caps.maxOutputTokens, options.maxOutputTokensPerTurn);
    return priceUsdOf(pricing, {
      inputTokens: options.inputTokens,
      outputTokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  }
  return options.flatReserveUsd ?? DEFAULT_FLAT_RESERVE_USD;
}

/** Read-only projection of one account. */
export interface BudgetAccountView {
  scope: string;
  ceilingUsd?: number;
  spentUsd: number;
  committedReserveUsd: number;
  finalizeReserveUsd: number;
  parentScope?: string;
}

/**
 * Why a ceiling error ended the work: the first closed account walking
 * from the debited scope toward the root, plus the root state, so the
 * outward message can name WHICH ceiling actually crossed instead of
 * blaming the run ceiling for every crossing.
 */
export interface BudgetExhaustionDiagnostics {
  crossed?: {
    scope: string;
    source: 'root' | 'orchestrator-cap' | 'child-account';
    ceilingUsd: number;
    spentUsd: number;
    committedReserveUsd: number;
    finalizeReserveUsd: number;
  };
  root: { ceilingUsd?: number; spentUsd: number };
}

interface AccountState {
  scope: string;
  ceilingUsd?: number;
  spentUsd: number;
  committedReserveUsd: number;
  finalizeReserveUsd: number;
  parentScope?: string;
  /**
   * Diagnostic label: the orchestrator cap account marks itself, and a
   * per-child allowance (a plan node's own sub-account, a ctx.workflow
   * child ceiling) marks itself so projected admission can clamp
   * reserves to the money the child was actually given.
   */
  kind?: 'orchestrator-cap' | 'child-allowance';
  /** Layer-3 severing for the account's own subtree. */
  controller: AbortController;
}

/**
 * The per-run budget account tree. All spend accounting is per instance;
 * the journal remains the durable source (the root is seeded by the
 * ledger fold on resume, M2; sub-account reserves are recovered from
 * spawn-admission decision entries, M6).
 */
export class RunBudget {
  /** B0; immutable after start. Undefined means no USD ceiling. */
  readonly ceilingUsd?: number;
  private readonly lifetimeSpawnCap: number;
  private readonly events?: RuntimeEventSink;
  private readonly priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  private readonly pricingOf?: (servedBy: ModelRef) => Pricing | undefined;
  private readonly accounts = new Map<string, AccountState>();
  private usageInternal: Usage = { ...ZERO_USAGE };
  private agentsSpawnedInternal = 0;
  private exhaustedInternal = false;
  /** Models already warned about; the warning fires once per model per run. */
  private readonly unpricedWarned = new Set<ModelRef>();
  /** Models whose price function already returned an invalid USD once. */
  private readonly invalidPriceWarned = new Set<ModelRef>();

  constructor(options: {
    ceilingUsd?: number;
    lifetimeSpawnCap?: number;
    events?: RuntimeEventSink;
    priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
    /** Raw price-row resolution for the layer-2b output bound. */
    pricingOf?: (servedBy: ModelRef) => Pricing | undefined;
    /**
     * The resume ledger fold: spend is never
     * reset and never double-counted; replayed entries are already inside
     * this seed and add no increments.
     */
    seed?: { usd: number; usage: Usage; agentsSpawned: number };
  }) {
    if (options.ceilingUsd !== undefined) {
      requireValidCeiling(options.ceilingUsd, 'budget ceiling');
      this.ceilingUsd = options.ceilingUsd;
    }
    this.lifetimeSpawnCap = options.lifetimeSpawnCap ?? 500;
    if (options.events !== undefined) {
      this.events = options.events;
    }
    if (options.priceUsd !== undefined) {
      this.priceUsd = options.priceUsd;
    }
    if (options.pricingOf !== undefined) {
      this.pricingOf = options.pricingOf;
    }
    const root: AccountState = {
      scope: ROOT_ACCOUNT,
      spentUsd: 0,
      committedReserveUsd: 0,
      finalizeReserveUsd: 0,
      controller: new AbortController(),
    };
    if (options.ceilingUsd !== undefined) {
      root.ceilingUsd = options.ceilingUsd;
    }
    this.accounts.set(ROOT_ACCOUNT, root);
    if (options.seed !== undefined) {
      // The resume seed comes from a ledger fold over a persisted
      // journal; a journal poisoned before the telemetry invariant
      // shipped must fail loud here rather than seed a NaN that every
      // later ceiling comparison silently ignores (v1.20.0 review P1-1).
      if (!Number.isFinite(options.seed.usd) || options.seed.usd < 0) {
        throw new ConfigError(
          `budget resume seed is not a finite nonnegative USD amount: ${String(options.seed.usd)}`,
        );
      }
      root.spentUsd = options.seed.usd;
      this.usageInternal = sanitizeUsage(options.seed.usage);
      this.agentsSpawnedInternal = options.seed.agentsSpawned;
    }
  }

  private get root(): AccountState {
    const root = this.accounts.get(ROOT_ACCOUNT);
    /* v8 ignore next 3 -- the constructor always creates the root */
    if (root === undefined) {
      throw new ConfigError('budget root account missing');
    }
    return root;
  }

  /** The account chain from `scope` up to and including the root. */
  private chainOf(scope: string): AccountState[] {
    const chain: AccountState[] = [];
    let cursor: string | undefined = scope;
    while (cursor !== undefined) {
      const account = this.accounts.get(cursor);
      if (account === undefined) {
        throw new ConfigError(
          `unknown budget account '${cursor}': openAccount precedes any charge`,
        );
      }
      chain.push(account);
      cursor = account.parentScope;
    }
    return chain;
  }

  /**
   * Opens a child sub-account under `parentScope`.
   * Re-opening an existing scope is the resume roll-forward path: the
   * recorded ceiling wins once and the accumulated state is kept.
   */
  openAccount(
    scope: string,
    options: {
      parentScope?: string;
      ceilingUsd?: number;
      finalizeReserveUsd?: number;
      kind?: 'orchestrator-cap' | 'child-allowance';
    },
  ): void {
    if (scope === ROOT_ACCOUNT) {
      throw new ConfigError("the root account 'run' exists from construction and cannot reopen");
    }
    if (this.accounts.has(scope)) {
      return;
    }
    const parentScope = options.parentScope ?? ROOT_ACCOUNT;
    if (!this.accounts.has(parentScope)) {
      throw new ConfigError(`unknown parent budget account '${parentScope}'`);
    }
    const account: AccountState = {
      scope,
      spentUsd: 0,
      committedReserveUsd: 0,
      finalizeReserveUsd: options.finalizeReserveUsd ?? 0,
      parentScope,
      controller: new AbortController(),
    };
    if (options.ceilingUsd !== undefined) {
      requireValidCeiling(options.ceilingUsd, `ceiling of budget account '${scope}'`);
      account.ceilingUsd = options.ceilingUsd;
    }
    if (options.kind !== undefined) {
      account.kind = options.kind;
    }
    this.accounts.set(scope, account);
  }

  /**
   * The diagnostic projection behind a ceiling error: the first CLOSED
   * account (projected commitments included, exactly the layer-1
   * closure test) walking from `scope` toward the root, plus the root
   * state. 'run budget ceiling reached' under a healthy root misled the
   * v1.6.0 follow-up review's live probe when only a 0.18 USD
   * orchestrator cap had crossed under a 0.90 USD root; the message can
   * now name the account that actually ended the work. An unknown scope
   * degrades to root-only diagnostics instead of throwing: this runs on
   * the error path.
   */
  exhaustionDiagnostics(scope: string): BudgetExhaustionDiagnostics {
    let chain: AccountState[];
    try {
      chain = this.chainOf(scope);
    } catch {
      chain = [this.root];
    }
    const crossed = chain.find(
      (account) =>
        account.ceilingUsd !== undefined &&
        account.spentUsd + account.committedReserveUsd + account.finalizeReserveUsd >=
          account.ceilingUsd,
    );
    const root = this.root;
    const diagnostics: BudgetExhaustionDiagnostics = {
      root: {
        spentUsd: root.spentUsd,
        ...(root.ceilingUsd === undefined ? {} : { ceilingUsd: root.ceilingUsd }),
      },
    };
    if (crossed?.ceilingUsd !== undefined) {
      diagnostics.crossed = {
        scope: crossed.scope,
        source:
          crossed.scope === ROOT_ACCOUNT
            ? 'root'
            : crossed.kind === 'orchestrator-cap'
              ? 'orchestrator-cap'
              : 'child-account',
        ceilingUsd: crossed.ceilingUsd,
        spentUsd: crossed.spentUsd,
        committedReserveUsd: crossed.committedReserveUsd,
        finalizeReserveUsd: crossed.finalizeReserveUsd,
      };
    }
    return diagnostics;
  }

  accountView(scope: string): BudgetAccountView | undefined {
    const account = this.accounts.get(scope);
    if (account === undefined) {
      return undefined;
    }
    const view: BudgetAccountView = {
      scope: account.scope,
      spentUsd: account.spentUsd,
      committedReserveUsd: account.committedReserveUsd,
      finalizeReserveUsd: account.finalizeReserveUsd,
    };
    if (account.ceilingUsd !== undefined) {
      view.ceilingUsd = account.ceilingUsd;
    }
    if (account.parentScope !== undefined) {
      view.parentScope = account.parentScope;
    }
    return view;
  }

  /**
   * The admission remainder of one account: ceiling minus spend minus
   * committed reserves minus the finalize reserve (DEF-7: childBudget
   * fractions never eat finalization money). Undefined when uncapped.
   */
  remainderOf(scope: string): number | undefined {
    const account = this.accounts.get(scope);
    if (account?.ceilingUsd === undefined) {
      return undefined;
    }
    return Math.max(
      0,
      account.ceilingUsd -
        account.spentUsd -
        account.committedReserveUsd -
        account.finalizeReserveUsd,
    );
  }

  /**
   * The tightest allowance headroom on the chain of `scope`: the minimum
   * remainder across 'child-allowance' accounts. An allowance ceiling
   * bounds the child's LIFETIME spend, so projected admission must never
   * hold more than this against the chain (the layer-2 mirror lives in
   * the orchestrator admission's childCeiling clamp): a reserve above
   * the allowance would deny work that the allowance itself already
   * bounds. Undefined when no allowance account is on the chain; the
   * clamp never applies to the run root or an orchestrator cap, whose
   * headroom is shared money that projected admission must protect.
   */
  allowanceHeadroomOf(scope: string): number | undefined {
    let headroom: number | undefined;
    for (const account of this.chainOf(scope)) {
      if (account.kind !== 'child-allowance' || account.ceilingUsd === undefined) {
        continue;
      }
      const remainder = Math.max(
        0,
        account.ceilingUsd -
          account.spentUsd -
          account.committedReserveUsd -
          account.finalizeReserveUsd,
      );
      headroom = headroom === undefined ? remainder : Math.min(headroom, remainder);
    }
    return headroom;
  }

  /** Layer 3 ceiling signal of the run root; live streams sever through it. */
  get signal(): AbortSignal {
    return this.root.controller.signal;
  }

  /** The layer-3 signal of one sub-account's subtree, when it exists. */
  signalOf(scope: string): AbortSignal | undefined {
    return this.accounts.get(scope)?.controller.signal;
  }

  get exhausted(): boolean {
    return this.exhaustedInternal;
  }

  /**
   * Marks the run exhausted without a ceiling event: the orchestrator
   * finalize fallback maps to outcome 'exhausted' with the synthesized
   * partial value (DEF-7; exhaustion is never null).
   */
  markExhausted(): void {
    this.exhaustedInternal = true;
    this.emitUpdate();
  }

  get committedReserveUsd(): number {
    return this.root.committedReserveUsd;
  }

  /** Spawn headroom under the engine lifetime cap (embedded in admission verdicts). */
  get spawnHeadroom(): number {
    return Math.max(0, this.lifetimeSpawnCap - this.agentsSpawnedInternal);
  }

  /**
   * Layer 1: PROJECTED admission before spawn. A spawn is admitted only
   * when every account in the ancestor chain of `accountScope` still has
   * admission headroom AND fits the PROPOSED reserve on top of spent +
   * committedReserve + finalizeReserve (the finalize reserve is
   * untouchable by admission, DEF-7). An exact fill is allowed; one
   * dollar past the ceiling is not: a spawn is never admitted on the
   * argument that the money it needs is merely not committed yet. The
   * whole chain is checked before anything commits, so a rejection
   * mutates no account, increments no counter, and journals nothing.
   * Also enforces the engine lifetime spawn cap.
   */
  admitSpawn(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {
    // Backstop for the reserve formula itself (v1.34.0 review P2-3):
    // estCost and flatReserveUsd are validated at their intake, but a
    // countTokens estimate is adapter-computed and could still produce
    // NaN or a negative. A malformed reserve would SHRINK the committed
    // total and admit siblings past the ceiling, so it refuses here,
    // before any account mutates. admitRecovered stays permissive: it
    // rolls forward reserves journaled by an OLDER engine, and refusing
    // history would break resume.
    requireNonNegativeNumber(reserveUsd, 'the admission reserve (estCost or its fallbacks)');
    if (this.agentsSpawnedInternal >= this.lifetimeSpawnCap) {
      this.exhaustedInternal = true;
      throw new BudgetExhaustedError(
        `engine lifetime spawn cap reached (${this.lifetimeSpawnCap} spawns per run; ` +
          'budgetDefaults.lifetimeSpawnCap)',
        { data: { cap: this.lifetimeSpawnCap } },
      );
    }
    const chain = this.chainOf(accountScope);
    for (const account of chain) {
      if (account.ceilingUsd === undefined) {
        continue;
      }
      const committed = account.spentUsd + account.committedReserveUsd + account.finalizeReserveUsd;
      if (committed >= account.ceilingUsd || committed + reserveUsd > account.ceilingUsd) {
        if (account.scope === ROOT_ACCOUNT) {
          this.exhaustedInternal = true;
        }
        throw new BudgetExhaustedError(
          `budget ceiling reached on account '${account.scope}': spent ` +
            `${account.spentUsd.toFixed(4)} USD plus committed reserves ` +
            `${(account.committedReserveUsd + account.finalizeReserveUsd).toFixed(4)} USD ` +
            `plus the proposed reserve ${reserveUsd.toFixed(4)} USD does not fit the ` +
            `ceiling ${account.ceilingUsd.toFixed(4)} USD`,
          {
            data: {
              account: account.scope,
              spentUsd: account.spentUsd,
              committedReserveUsd: account.committedReserveUsd,
              proposedReserveUsd: reserveUsd,
              ceilingUsd: account.ceilingUsd,
            },
          },
        );
      }
    }
    this.agentsSpawnedInternal += 1;
    for (const account of chain) {
      account.committedReserveUsd += reserveUsd;
    }
    this.emitUpdate();
  }

  /**
   * Resume roll-forward: commits a reserve recovered from a journaled
   * spawn-admission decision entry without re-evaluating admission
   * (reserves are recovered, never re-estimated).
   */
  admitRecovered(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {
    this.agentsSpawnedInternal += 1;
    for (const account of this.chainOf(accountScope)) {
      account.committedReserveUsd += reserveUsd;
    }
    this.emitUpdate();
  }

  /**
   * Registers the orchestrator finalize reserve (DEF-7):
   * absolute dollars set on the named account AND the run root, so
   * admission never lets any spawn eat the finalization money even
   * against whole-run exhaustion. Kept SEPARATE from committedReserveUsd
   * (the block checks add both), so remainders never double-count.
   * Idempotent: re-registering on resume keeps the journaled amount.
   */
  commitFinalizeReserve(scope: string, reserveUsd: number): void {
    const account = this.accounts.get(scope);
    if (account === undefined) {
      throw new ConfigError(`unknown budget account '${scope}' for the finalize reserve`);
    }
    account.finalizeReserveUsd = reserveUsd;
    this.root.finalizeReserveUsd = Math.max(this.root.finalizeReserveUsd, reserveUsd);
    this.emitUpdate();
  }

  /**
   * The forced finish CONSUMES its reserve (DEF-7
   * reserve-survives-run-exhaustion): once the cap decision is durable
   * and the finalize dispatch begins, the reserve stops subtracting from
   * the admission remainder, or the finalize agent could never draw the
   * money reserved for it under a tight run ceiling. Admissions stay
   * frozen past the cap, so nothing else can take it.
   */
  releaseFinalizeReserve(scope: string): void {
    const account = this.accounts.get(scope);
    if (account !== undefined) {
      account.finalizeReserveUsd = 0;
    }
    this.root.finalizeReserveUsd = 0;
    this.emitUpdate();
  }

  /** The reserve is replaced by real spend when the spawn settles. */
  releaseReserve(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {
    for (const account of this.chainOf(accountScope)) {
      account.committedReserveUsd = Math.max(0, account.committedReserveUsd - reserveUsd);
    }
    this.emitUpdate();
  }

  /** Layer 2: the per-turn guard. A turn that would cross any ceiling in the chain is not dispatched. */
  beforeTurn(accountScope: string = ROOT_ACCOUNT): void {
    for (const account of this.chainOf(accountScope)) {
      if (account.ceilingUsd !== undefined && account.spentUsd >= account.ceilingUsd) {
        if (account.scope === ROOT_ACCOUNT) {
          this.exhaustedInternal = true;
        }
        throw new BudgetExhaustedError(
          `budget ceiling reached before turn dispatch on account '${account.scope}': ` +
            `spent ${account.spentUsd.toFixed(4)} of ${account.ceilingUsd.toFixed(4)} USD`,
          {
            data: {
              account: account.scope,
              spentUsd: account.spentUsd,
              ceilingUsd: account.ceilingUsd,
            },
          },
        );
      }
    }
  }

  /**
   * Layer 2b, the pre-dispatch output bound: the output tokens the
   * remaining chain budget (min over capped ancestors of ceiling minus
   * spend) still affords from `servedBy` for an estimated prompt, priced
   * by the same function as settlement, long-context tiers included.
   * Undefined when no account in the chain carries a USD ceiling, when
   * the model has no price row (the once-per-model unpriced warning in
   * onUsage covers that hole), or when output is free. Zero or negative
   * means the turn cannot be dispatched within the budget.
   */
  maxAffordableOutputTokens(
    servedBy: ModelRef,
    estimatedInputTokens: number,
    accountScope: string = ROOT_ACCOUNT,
  ): number | undefined {
    const pricing = this.pricingOf?.(servedBy);
    if (pricing === undefined) {
      return undefined;
    }
    let remainingUsd: number | undefined;
    for (const account of this.chainOf(accountScope)) {
      if (account.ceilingUsd === undefined) {
        continue;
      }
      const headroom = account.ceilingUsd - account.spentUsd;
      remainingUsd = remainingUsd === undefined ? headroom : Math.min(remainingUsd, headroom);
    }
    if (remainingUsd === undefined) {
      return undefined;
    }
    return affordableOutputTokens(pricing, Math.max(0, remainingUsd), estimatedInputTokens);
  }

  /**
   * Live accounting; spend propagates from `accountScope` to every
   * ancestor. Crossing a ceiling severs the crossing account's subtree
   * via its layer-3 AbortSignal (overshoot bounded by one turn per
   * in-flight agent; providers bill severed streams).
   */
  onUsage(usage: Usage, servedBy: ModelRef, accountScope: string = ROOT_ACCOUNT): void {
    // Defense in depth behind the agent-loop boundary validator: this
    // inlet re-sanitizes so spentUsd stays finite and monotone even if a
    // future caller bypasses the loop (v1.20.0 review P1-1). The
    // per-FIELD delta repair applies here, never the whole-usage subset
    // rule: onUsage legitimately receives partial increments (a
    // mid-stream event carrying cache counts without restating the full
    // input), and the subset clamp would silently drop that paid debit.
    // The repair always detaches from the caller's object, so a hostile
    // accessor cannot vary its answers between validation and use.
    const safe = sanitizeUsageDelta(usage);
    this.usageInternal = {
      inputTokens: this.usageInternal.inputTokens + safe.inputTokens,
      outputTokens: this.usageInternal.outputTokens + safe.outputTokens,
      cacheReadTokens: this.usageInternal.cacheReadTokens + safe.cacheReadTokens,
      cacheWriteTokens: this.usageInternal.cacheWriteTokens + safe.cacheWriteTokens,
    };
    const reasoning = (this.usageInternal.reasoningTokens ?? 0) + (safe.reasoningTokens ?? 0);
    if (reasoning > 0) {
      this.usageInternal.reasoningTokens = reasoning;
    }
    // A model with no price row contributes zero here, so a USD ceiling
    // cannot bound it. That is legitimate for a local model (it costs
    // nothing) and a silent hole for a model whose price row is merely
    // missing, so the ceiling says so out loud, once per model. The
    // usage still surfaces through CostReport.unpriced either way.
    const priced = this.priceUsd?.(servedBy, safe);
    if (
      priced === undefined &&
      this.ceilingUsd !== undefined &&
      !this.unpricedWarned.has(servedBy)
    ) {
      this.unpricedWarned.add(servedBy);
      this.events?.emit({
        type: 'log',
        level: 'warn',
        msg:
          `no price row for '${servedBy}': its usage does not debit the budget, so the ` +
          `${this.ceilingUsd} USD run ceiling does NOT bound this model. Add it to ` +
          'createEngine({ pricing }) to cap it; its usage is reported under CostReport.unpriced',
      });
    }
    let usd = priced ?? 0;
    if (!Number.isFinite(usd) || usd < 0) {
      // Backstop that should never fire behind sanitized usage: a price
      // function returning NaN or a negative USD would otherwise poison
      // spentUsd or credit the budget. Charge zero, but say so loudly.
      if (!this.invalidPriceWarned.has(servedBy)) {
        this.invalidPriceWarned.add(servedBy);
        this.events?.emit({
          type: 'log',
          level: 'error',
          msg:
            `price function returned ${String(usd)} USD for '${servedBy}'; charging 0 for this ` +
            'slice so the budget stays finite and monotone. Fix the pricing row: this usage is ' +
            'NOT debited and any ceiling under-counts it',
        });
      }
      usd = 0;
    }
    for (const account of this.chainOf(accountScope)) {
      account.spentUsd += usd;
      if (
        account.ceilingUsd !== undefined &&
        account.spentUsd >= account.ceilingUsd &&
        !account.controller.signal.aborted
      ) {
        if (account.scope === ROOT_ACCOUNT) {
          this.exhaustedInternal = true;
        }
        account.controller.abort(BUDGET_ABORT_REASON);
      }
    }
    this.emitUpdate();
  }

  spent(): Spend {
    return {
      usd: this.root.spentUsd,
      usage: { ...this.usageInternal },
      agentsSpawned: this.agentsSpawnedInternal,
    };
  }

  /** Null when the run has no USD ceiling. */
  remaining(): Spend | null {
    const root = this.root;
    if (root.ceilingUsd === undefined) {
      return null;
    }
    return {
      usd: Math.max(0, root.ceilingUsd - root.spentUsd),
      usage: { ...ZERO_USAGE },
      agentsSpawned: Math.max(0, this.lifetimeSpawnCap - this.agentsSpawnedInternal),
    };
  }

  private emitUpdate(): void {
    const root = this.root;
    this.events?.emit({
      type: 'budget:update',
      spentUsd: root.spentUsd,
      remainingUsd:
        root.ceilingUsd === undefined ? null : Math.max(0, root.ceilingUsd - root.spentUsd),
      committedReserveUsd: root.committedReserveUsd,
    });
  }
}
