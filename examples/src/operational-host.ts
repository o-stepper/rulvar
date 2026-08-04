/**
 * The operational host reference (RV1705; the rendered walk-through is
 * https://docs.rulvar.com/guide/operational-host). The eighteenth
 * comparison benchmark's operational acceptance named four behaviors a
 * production host must PROVE, not describe: a tenant cannot read or
 * effect across a tenant boundary, a revoked approval is never
 * executed, a redelivered attempt cannot duplicate an external effect,
 * and an audit reconstructs the decision chain. This module wires each
 * one from shipped primitives, and its test executes all four; nothing
 * here is a new capability, which is the point: the reference host is
 * an ARRANGEMENT of the library, with every plane the library refuses
 * to own (identity, tenant mapping, secret distribution, business
 * authority over effects) left visibly in host hands.
 */
import {
  createEngine,
  InMemoryStore,
  reduceDecisionChain,
  tool,
  type DecisionChainRow,
  type Engine,
  type JournalStore,
  type ProviderAdapter,
  type ToolContext,
  type ToolDef,
} from '@rulvar/core';
import { hashArgs, memoryEffectLedger } from '@rulvar/executor';

/**
 * One tenant's slice of the platform. Isolation is BY CONSTRUCTION,
 * not by filtering: each tenant gets its own engine instance, its own
 * journal store, and only its own toolset registered, so a
 * cross-tenant tool name is not "denied", it does not exist in the
 * tenant's registry at all, and a cross-tenant journal read has no
 * store to read from. The library's registries are engine-scoped
 * precisely to make this arrangement the cheap default.
 */
export interface TenantHostOptions {
  tenantId: string;
  adapter: ProviderAdapter;
  /** The routing the host owns; tenants never name raw models. */
  routing: Record<string, `${string}:${string}`>;
  tools: ToolDef[];
  /** The tenant's own journal store; never shared across tenants. */
  store?: JournalStore;
  /** Ask verdicts nobody resolves are DENIED after this window. */
  approvalDeadlineMs?: number;
}

/**
 * A per-tenant engine under the reference posture: strict approvals (a
 * generic allow can never clear a needsApproval tool), every mutating
 * or undeclared-risk tool behind an ask verdict, and, when configured,
 * a journaled approval deadline so an unanswered ask denies instead of
 * waiting forever.
 */
export function tenantHost(options: TenantHostOptions): Engine {
  return createEngine({
    adapters: [options.adapter],
    stores: { journal: options.store ?? new InMemoryStore({ quiet: true }) },
    defaults: {
      routing: options.routing,
      permissions: {
        strictApprovals: true,
        ask: [{ risk: ['write', 'execute', 'destructive', 'undeclared'] }],
        ...(options.approvalDeadlineMs === undefined
          ? {}
          : { approvalDeadlineMs: options.approvalDeadlineMs }),
      },
      profiles: {
        [`${options.tenantId}-worker`]: {
          description: `the ${options.tenantId} tenant's read-and-propose worker`,
          tools: options.tools,
        },
      },
    },
  });
}

/** Monotonic attempt stamps: deterministic, no wall clock in the example. */
let attemptCounter = 0;

/**
 * An external effect guarded the reference way: the ledger's intent row
 * is appended BEFORE the effect executes and the outcome row after,
 * both under the caller-owned idempotency key, so a redelivered or
 * retried attempt that reaches the effect again finds the key already
 * claimed and refuses to fire the side effect a second time. The
 * ledger records every attempt honestly (the second one closes as
 * 'ok' with the effect suppressed); the EFFECT fires once. Replay
 * safety needs no code here at all: a replayed journal never
 * re-executes a settled tool call (never pay twice), which the test
 * proves by resuming on an adapter that refuses to serve.
 */
export function guardedEffectTool(
  name: string,
  effects: { fired: string[] },
  ledger: ReturnType<typeof memoryEffectLedger>,
): ToolDef {
  return tool({
    name,
    description: 'performs the one external effect of the reference flow',
    risk: 'write',
    needsApproval: true,
    parameters: {
      type: 'object',
      properties: { idempotencyKey: { type: 'string' } },
      required: ['idempotencyKey'],
    },
    execute: async (input: unknown, toolCtx?: ToolContext) => {
      const key = (input as { idempotencyKey: string }).idempotencyKey;
      attemptCounter += 1;
      const base = {
        idempotencyKey: key,
        runId: toolCtx?.runId ?? '(unknown-run)',
        spanId: toolCtx?.spanId ?? '(unknown-span)',
        tool: name,
        argsHash: hashArgs({ idempotencyKey: key }),
        executor: 'subprocess' as const,
        workdir: '(in-process reference flow)',
        startedAt: attemptCounter,
        attemptId: `${key}#${String(attemptCounter)}`,
      };
      await ledger.intent?.(base);
      const alreadyFired = effects.fired.includes(key);
      if (!alreadyFired) {
        effects.fired.push(key);
      }
      await ledger.record({
        ...base,
        durationMs: 0,
        outcome: 'ok',
        exitCode: null,
        signal: null,
      });
      return { applied: !alreadyFired, key };
    },
  });
}

/**
 * The audit surface of the reference host: one call over the tenant's
 * own journal reconstructs the run's authority record (admissions,
 * approvals, resolutions, abandons, terminations) in seq order with
 * back references intact, so "who allowed this and when" is a fold,
 * not an investigation.
 */
export async function decisionChainOf(
  store: JournalStore,
  runId: string,
): Promise<DecisionChainRow[]> {
  return reduceDecisionChain(await store.load(runId));
}
