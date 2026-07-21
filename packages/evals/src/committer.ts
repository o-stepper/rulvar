/**
 * The eval-committer identity (M11-T01; https://docs.rulvar.com/guide/model-knowledge).
 * The pipeline-side commit path: builds
 * eval-committer-gated ops (the coherence square: class eval-measured,
 * author eval-pipeline, metrics present) and commits them with the
 * documented CAS-rebase recipe. Humans never call this; their path is
 * the human gate and it structurally cannot carry metrics.
 */
import {
  claimExpiry,
  ConfigError,
  KnowledgeCasError,
  type ClaimOp,
  type EvidenceRef,
  type ModelClaim,
  type ModelKnowledgeStore,
  type TaskClass,
} from '@rulvar/core';
import type { Effort, ModelRef } from '@rulvar/core';

/**
 * Local mirror of the core numeric intake idiom (v1.35.0 review P2-5):
 * the CAS loop bound is compared with `<`, and every comparison with NaN
 * is false, so an unvalidated NaN or nonpositive count skipped the loop
 * entirely and surfaced the generic 'unreachable' Error instead of a
 * typed refusal, while a fraction over ran by an attempt.
 */
export function requireCasAttempts(value: number, site: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new ConfigError(`${site} must be a positive integer; got ${String(value)}`);
  }
}

export interface MeasuredClaimInput {
  /** ULID (or any unique id); the caller mints it deterministically. */
  id: string;
  subject: { model: ModelRef; effort?: Effort };
  taskClass: TaskClass;
  polarity: 'strength' | 'weakness';
  /** A typed template render, never a quote from tool output. */
  statement: string;
  metrics: {
    passRate: number;
    n: number;
    graderId: string;
    cost?: number;
    baseline?: { model: ModelRef; passRate: number };
  };
  confidence: 'high' | 'medium' | 'low';
  /** ISO date of the sweep run. */
  observedAt: string;
  evidence: EvidenceRef[];
  modelEpoch?: ModelClaim['modelEpoch'];
}

export interface EvalCommitterOptions {
  /** The dedicated identity recorded on the gate AND the author. */
  committerId: string;
  /** The emitting sweep report; every claim's gate references it. */
  reportId: string;
  /**
   * CAS rebase attempts; default 3. A positive integer, refused as a
   * ConfigError before the first store read.
   */
  attempts?: number;
}

/** One measured claim; claimExpiry applies the TTL from the decay table. */
export function evalMeasuredClaim(input: MeasuredClaimInput, committerId: string): ModelClaim {
  return {
    id: input.id,
    subject: input.subject,
    taskClass: input.taskClass,
    polarity: input.polarity,
    statement: input.statement,
    class: 'eval-measured',
    status: 'active',
    evidence: input.evidence,
    metrics: input.metrics,
    confidence: input.confidence,
    observedAt: input.observedAt,
    expiresAt: claimExpiry('eval-measured', input.polarity, input.observedAt),
    ...(input.modelEpoch === undefined ? {} : { modelEpoch: input.modelEpoch }),
    author: { kind: 'eval-pipeline', id: committerId },
  };
}

/**
 * Commits measured claims through the eval-committer gate with the
 * documented rebase recipe: on a CAS rejection, re-read current() and
 * retry against the fresh version. Returns the committed version.
 */
export async function commitEvalMeasured(
  store: ModelKnowledgeStore,
  claims: readonly MeasuredClaimInput[],
  options: EvalCommitterOptions,
): Promise<number> {
  const gate = {
    kind: 'eval-committer',
    committerId: options.committerId,
    reportId: options.reportId,
  } as const;
  const ops: ClaimOp[] = claims.map((input) => ({
    op: 'add',
    claim: evalMeasuredClaim(input, options.committerId),
    gate,
  }));
  const attempts = options.attempts ?? 3;
  requireCasAttempts(attempts, 'EvalCommitterOptions.attempts');
  let lastCas: KnowledgeCasError | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const snapshot = await store.current();
    try {
      return await store.commit(ops, snapshot.version);
    } catch (thrown) {
      if (thrown instanceof KnowledgeCasError) {
        lastCas = thrown;
        continue;
      }
      throw thrown;
    }
  }
  // Reachable only through CAS exhaustion now that the attempt count is
  // validated at intake.
  throw lastCas ?? new Error('commitEvalMeasured: unreachable');
}
