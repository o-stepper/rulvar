/**
 * Three-layer budget v1 (M1-T09; invariant I4). Layer 1: admission before
 * spawn (spent + committedReserve >= ceiling blocks). Layer 2: the
 * per-turn guard. Layer 3: the AbortSignal ceiling severing live streams,
 * with partial usage written usageApprox. B0 is immutable after start: no
 * API tops it up. M1 runs one root account; hierarchical sub-accounts and
 * the finalize reserve arrive with ctx.workflow and the orchestrator
 * (M6/M7, DEF-7).
 *
 * Owning spec: docs/06-execution-spec.md, section "Three-layer budget".
 */
import { BudgetExhaustedError } from '../l0/errors.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { ModelCaps } from '../l0/spi/provider.js';
import { BUDGET_ABORT_REASON, type RuntimeEventSink } from '../runtime/agent-loop.js';

export type Spend = { usd: number; usage: Usage; agentsSpawned: number };

/** Last resort of the admission reserve formula (docs/06, Appendix A). */
export const DEFAULT_FLAT_RESERVE_USD = 0.5;

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

/**
 * The run-root budget account. All spend accounting is per instance; the
 * journal remains the durable source (the ledger fold restores spend on
 * resume, M2).
 */
export class RunBudget {
  /** B0; immutable after start. Undefined means no USD ceiling. */
  readonly ceilingUsd?: number;
  private readonly lifetimeSpawnCap: number;
  private readonly events?: RuntimeEventSink;
  private readonly priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  private readonly controller = new AbortController();
  private spentUsdInternal = 0;
  private usageInternal: Usage = { ...ZERO_USAGE };
  private committedReserveUsdInternal = 0;
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
    if (options.seed !== undefined) {
      this.spentUsdInternal = options.seed.usd;
      this.usageInternal = { ...options.seed.usage };
      this.agentsSpawnedInternal = options.seed.agentsSpawned;
    }
  }

  /** Layer 3 ceiling signal; live streams are severed through it. */
  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get exhausted(): boolean {
    return this.exhaustedInternal;
  }

  get committedReserveUsd(): number {
    return this.committedReserveUsdInternal;
  }

  /**
   * Layer 1: admission before spawn. Blocks when spent + committedReserve
   * has reached the ceiling, otherwise commits the reserve. Also enforces
   * the engine lifetime spawn cap (docs/06, section "Scheduler").
   */
  admitSpawn(reserveUsd: number): void {
    if (this.agentsSpawnedInternal >= this.lifetimeSpawnCap) {
      this.exhaustedInternal = true;
      throw new BudgetExhaustedError(
        `engine lifetime spawn cap reached (${this.lifetimeSpawnCap} spawns per run; ` +
          'budgetDefaults.lifetimeSpawnCap)',
        { data: { cap: this.lifetimeSpawnCap } },
      );
    }
    if (
      this.ceilingUsd !== undefined &&
      this.spentUsdInternal + this.committedReserveUsdInternal >= this.ceilingUsd
    ) {
      this.exhaustedInternal = true;
      throw new BudgetExhaustedError(
        `budget ceiling reached: spent ${this.spentUsdInternal.toFixed(4)} USD plus ` +
          `committed reserve ${this.committedReserveUsdInternal.toFixed(4)} USD is at ` +
          `the ceiling ${this.ceilingUsd.toFixed(4)} USD`,
        {
          data: {
            spentUsd: this.spentUsdInternal,
            committedReserveUsd: this.committedReserveUsdInternal,
            ceilingUsd: this.ceilingUsd,
          },
        },
      );
    }
    this.agentsSpawnedInternal += 1;
    this.committedReserveUsdInternal += reserveUsd;
    this.emitUpdate();
  }

  /** The reserve is replaced by real spend when the spawn settles. */
  releaseReserve(reserveUsd: number): void {
    this.committedReserveUsdInternal = Math.max(0, this.committedReserveUsdInternal - reserveUsd);
    this.emitUpdate();
  }

  /** Layer 2: the per-turn guard. A turn that would cross the ceiling is not dispatched. */
  beforeTurn(): void {
    if (this.ceilingUsd !== undefined && this.spentUsdInternal >= this.ceilingUsd) {
      this.exhaustedInternal = true;
      throw new BudgetExhaustedError(
        `budget ceiling reached before turn dispatch: spent ` +
          `${this.spentUsdInternal.toFixed(4)} of ${this.ceilingUsd.toFixed(4)} USD`,
        { data: { spentUsd: this.spentUsdInternal, ceilingUsd: this.ceilingUsd } },
      );
    }
  }

  /**
   * Live accounting; crossing the ceiling severs in-flight streams via the
   * layer-3 AbortSignal (overshoot bounded by one turn per in-flight
   * agent; providers bill severed streams).
   */
  onUsage(usage: Usage, servedBy: ModelRef): void {
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
    this.spentUsdInternal += this.priceUsd?.(servedBy, usage) ?? 0;
    this.emitUpdate();
    if (
      this.ceilingUsd !== undefined &&
      this.spentUsdInternal >= this.ceilingUsd &&
      !this.controller.signal.aborted
    ) {
      this.exhaustedInternal = true;
      this.controller.abort(BUDGET_ABORT_REASON);
    }
  }

  spent(): Spend {
    return {
      usd: this.spentUsdInternal,
      usage: { ...this.usageInternal },
      agentsSpawned: this.agentsSpawnedInternal,
    };
  }

  /** Null when the run has no USD ceiling (docs/06, section "Canonical Ctx interface"). */
  remaining(): Spend | null {
    if (this.ceilingUsd === undefined) {
      return null;
    }
    return {
      usd: Math.max(0, this.ceilingUsd - this.spentUsdInternal),
      usage: { ...ZERO_USAGE },
      agentsSpawned: Math.max(0, this.lifetimeSpawnCap - this.agentsSpawnedInternal),
    };
  }

  private emitUpdate(): void {
    this.events?.emit({
      type: 'budget:update',
      spentUsd: this.spentUsdInternal,
      remainingUsd:
        this.ceilingUsd === undefined ? null : Math.max(0, this.ceilingUsd - this.spentUsdInternal),
      committedReserveUsd: this.committedReserveUsdInternal,
    });
  }
}
