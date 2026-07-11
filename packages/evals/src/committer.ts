/**
 * The eval-committer identity (M11-T01; docs/05, sections "Data model"
 * and "Commit discipline"). The pipeline-side commit path: builds
 * eval-committer-gated ops (the coherence square: class eval-measured,
 * author eval-pipeline, metrics present) and commits them with the
 * documented CAS-rebase recipe. Humans never call this; their path is
 * the human gate and it structurally cannot carry metrics.
 */
import {
  claimExpiry,
  KnowledgeCasError,
  type ClaimOp,
  type EvidenceRef,
  type ModelClaim,
  type ModelKnowledgeStore,
  type TaskClass,
} from '@rulvar/core';
import type { Effort, ModelRef } from '@rulvar/core';

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
  /** CAS-rebase attempts (docs/05, 5.4); default 3. */
  attempts?: number;
}

/** One measured claim, TTL applied per the docs/05 decay table. */
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
  throw lastCas ?? new Error('commitEvalMeasured: unreachable');
}
