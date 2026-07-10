/**
 * Three-layer budget (M1-T09, hierarchical sub-accounts M6-T06;
 * invariant I4). Layer 1: admission before spawn (spent + committedReserve
 * >= ceiling blocks on ANY account in the ancestor chain). Layer 2: the
 * per-turn guard against the spawn's own chain. Layer 3: the AbortSignal
 * ceiling severing live streams, with partial usage written usageApprox.
 * B0 is immutable after start: no API tops it up.
 *
 * The account tree (docs/06, section 5.4): the run root plus one
 * sub-account per admitted child workflow (and, from M7, the orchestrator
 * account and plan/NodeId accounts). A child's spend propagates to ALL
 * ancestors up to the run root; the root ceiling remains the true
 * invariant. Sub-account spend is per-process state: on resume the root
 * is seeded from the ledger fold while sub-accounts restart empty (their
 * reserves are recovered from spawn-admission decision entries); the
 * per-account historical fold completes with DEF-7 in M7.
 *
 * Owning spec: docs/06-execution-spec.md, section "Three-layer budget".
 */
import { BudgetExhaustedError, ConfigError } from '../l0/errors.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { ModelCaps } from '../l0/spi/provider.js';
import { BUDGET_ABORT_REASON, type RuntimeEventSink } from '../runtime/agent-loop.js';

export type Spend = { usd: number; usage: Usage; agentsSpawned: number };

/** Last resort of the admission reserve formula (docs/06, Appendix A). */
export const DEFAULT_FLAT_RESERVE_USD = 0.5;

/** The run-root account scope (docs/06, section 5.4 scope vocabulary). */
export const ROOT_ACCOUNT = 'run';

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/**
 * The admission reserve for a spawn (docs/06, section "Layer 1: admission
 * before spawn"): opts.estCost, else profile.estCost, else
 * price(countTokens(input) + caps.maxOutputTokens), else the engine flat
 * default.
 */
export function admissionReserveUsd(options: {
  estCost?: number;
  profileEstCost?: number;
  inputTokens?: number;
  caps?: ModelCaps;
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
    return (
      (options.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
      (options.caps.maxOutputTokens / 1_000_000) * pricing.outputUsdPerMTok
    );
  }
  return options.flatReserveUsd ?? DEFAULT_FLAT_RESERVE_USD;
}

/** Read-only projection of one account (docs/06, section 5.4). */
export interface BudgetAccountView {
  scope: string;
  ceilingUsd?: number;
  spentUsd: number;
  committedReserveUsd: number;
  finalizeReserveUsd: number;
  parentScope?: string;
}

interface AccountState {
  scope: string;
  ceilingUsd?: number;
  spentUsd: number;
  committedReserveUsd: number;
  finalizeReserveUsd: number;
  parentScope?: string;
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
  private readonly accounts = new Map<string, AccountState>();
  private usageInternal: Usage = { ...ZERO_USAGE };
  private agentsSpawnedInternal = 0;
  private exhaustedInternal = false;

  constructor(options: {
    ceilingUsd?: number;
    lifetimeSpawnCap?: number;
    events?: RuntimeEventSink;
    priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
    /**
     * The resume ledger fold (docs/03, section 13.3): spend is never
     * reset and never double-counted; replayed entries are already inside
     * this seed and add no increments.
     */
    seed?: { usd: number; usage: Usage; agentsSpawned: number };
  }) {
    if (options.ceilingUsd !== undefined) {
      this.ceilingUsd = options.ceilingUsd;
    }
    this.lifetimeSpawnCap = options.lifetimeSpawnCap ?? 500;
    if (options.events !== undefined) {
      this.events = options.events;
    }
    if (options.priceUsd !== undefined) {
      this.priceUsd = options.priceUsd;
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
      root.spentUsd = options.seed.usd;
      this.usageInternal = { ...options.seed.usage };
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
          `unknown budget account '${cursor}': openAccount precedes any charge (docs/06, 5.4)`,
        );
      }
      chain.push(account);
      cursor = account.parentScope;
    }
    return chain;
  }

  /**
   * Opens a child sub-account under `parentScope` (docs/06, section 5.4).
   * Re-opening an existing scope is the resume roll-forward path: the
   * recorded ceiling wins once and the accumulated state is kept.
   */
  openAccount(
    scope: string,
    options: { parentScope?: string; ceilingUsd?: number; finalizeReserveUsd?: number },
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
      account.ceilingUsd = options.ceilingUsd;
    }
    this.accounts.set(scope, account);
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
   * partial value (DEF-7, docs/07 12.4; exhaustion is never null).
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
   * Layer 1: admission before spawn. Blocks when spent + committedReserve
   * has reached the ceiling on ANY account in the ancestor chain of
   * `accountScope`, otherwise commits the reserve along the whole chain.
   * Also enforces the engine lifetime spawn cap (docs/06, "Scheduler").
   */
  admitSpawn(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {
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
      if (
        account.ceilingUsd !== undefined &&
        // The finalize reserve is untouchable by admission (DEF-7).
        account.spentUsd + account.committedReserveUsd + account.finalizeReserveUsd >=
          account.ceilingUsd
      ) {
        if (account.scope === ROOT_ACCOUNT) {
          this.exhaustedInternal = true;
        }
        throw new BudgetExhaustedError(
          `budget ceiling reached on account '${account.scope}': spent ` +
            `${account.spentUsd.toFixed(4)} USD plus committed reserve ` +
            `${account.committedReserveUsd.toFixed(4)} USD is at the ceiling ` +
            `${account.ceilingUsd.toFixed(4)} USD`,
          {
            data: {
              account: account.scope,
              spentUsd: account.spentUsd,
              committedReserveUsd: account.committedReserveUsd,
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
   * (docs/06, 5.1: reserves are recovered, never re-estimated).
   */
  admitRecovered(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {
    this.agentsSpawnedInternal += 1;
    for (const account of this.chainOf(accountScope)) {
      account.committedReserveUsd += reserveUsd;
    }
    this.emitUpdate();
  }

  /**
   * Registers the orchestrator finalize reserve (DEF-7, docs/07 12.2):
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
   * Live accounting; spend propagates from `accountScope` to every
   * ancestor. Crossing a ceiling severs the crossing account's subtree
   * via its layer-3 AbortSignal (overshoot bounded by one turn per
   * in-flight agent; providers bill severed streams).
   */
  onUsage(usage: Usage, servedBy: ModelRef, accountScope: string = ROOT_ACCOUNT): void {
    this.usageInternal = {
      inputTokens: this.usageInternal.inputTokens + usage.inputTokens,
      outputTokens: this.usageInternal.outputTokens + usage.outputTokens,
      cacheReadTokens: this.usageInternal.cacheReadTokens + usage.cacheReadTokens,
      cacheWriteTokens: this.usageInternal.cacheWriteTokens + usage.cacheWriteTokens,
    };
    const reasoning = (this.usageInternal.reasoningTokens ?? 0) + (usage.reasoningTokens ?? 0);
    if (reasoning > 0) {
      this.usageInternal.reasoningTokens = reasoning;
    }
    const usd = this.priceUsd?.(servedBy, usage) ?? 0;
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

  /** Null when the run has no USD ceiling (docs/06, section "Canonical Ctx interface"). */
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
