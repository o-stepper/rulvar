/**
 * The canary fingerprint (M11-T04; docs/05, section "Grounding and
 * decay"; OQ-06). The optional compensation for silent alias
 * re-pointing that modelEpoch honestly cannot catch: a FIXED probe set
 * at temperature 0, run through the ordinary engine (journaled,
 * budgeted, VCR-recordable), hashed over normalized outputs. A
 * fingerprint change flips the model's eval claims to stale in one
 * command.
 *
 * The committed v1 design (closing OQ-06): the probe set is CALLER
 * data (fixed, versioned alongside the store); normalization is NFC,
 * trim, and whitespace collapse per output; the fingerprint is the
 * sha256 of the JCS-serialized normalized output array, prefixed with
 * the probe count so a probe-set edit never collides with drift.
 */
import { createHash } from 'node:crypto';

import {
  KnowledgeCasError,
  type ClaimOp,
  type Engine,
  type ModelKnowledgeStore,
  type ModelRef,
} from '@rulvar/core';
import { defineWorkflow } from '@rulvar/core';

export interface CanaryProbeSet {
  /** Registered agent profile the probes run under. */
  agentType: string;
  /** The fixed prompts; order matters and enters the fingerprint. */
  prompts: string[];
}

/** The committed v1 normalization (OQ-06): NFC, trim, collapse whitespace. */
export function normalizeCanaryOutput(output: unknown): string {
  const text = typeof output === 'string' ? output : JSON.stringify(output ?? null);
  return text.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

/**
 * Runs the fixed probe set through the ordinary engine and returns the
 * fingerprint. Probes run sequentially in declaration order, one run
 * per probe, so recordings replay deterministically.
 */
export async function canaryFingerprint(engine: Engine, probes: CanaryProbeSet): Promise<string> {
  const outputs: string[] = [];
  for (const [index, prompt] of probes.prompts.entries()) {
    const workflow = defineWorkflow(
      { name: `kb-canary:${String(index)}` },
      async (ctx) => await ctx.agent(prompt, { agentType: probes.agentType }),
    );
    const outcome = await engine.run(workflow, null).result;
    outputs.push(
      outcome.status === 'ok' ? normalizeCanaryOutput(outcome.value) : `!${outcome.status}`,
    );
  }
  const body = JSON.stringify([probes.prompts.length, outputs]);
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

export interface CanaryDriftReport {
  model: ModelRef;
  freshFingerprint: string;
  /** Claim ids flipped to stale by this call. */
  flipped: string[];
  /** The committed store version when anything flipped. */
  version?: number;
}

/**
 * Flips the model's ACTIVE eval-measured claims to stale when their
 * recorded canary fingerprint differs from the fresh one (docs/05:
 * "a fingerprint change immediately flips the model's eval claims to
 * stale"). Claims without a recorded fingerprint have no baseline and
 * stay untouched (the documented no-probe posture); a second run is
 * an idempotent noop. CAS-rebased like every maintenance commit.
 */
export async function flipStaleOnCanaryDrift(
  store: ModelKnowledgeStore,
  model: ModelRef,
  freshFingerprint: string,
  options?: { attempts?: number },
): Promise<CanaryDriftReport> {
  const attempts = options?.attempts ?? 3;
  let lastCas: KnowledgeCasError | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const snapshot = await store.current();
    const drifted = snapshot.claims.filter(
      (claim) =>
        claim.status === 'active' &&
        claim.class === 'eval-measured' &&
        claim.subject.model === model &&
        claim.modelEpoch?.canaryFingerprint !== undefined &&
        claim.modelEpoch.canaryFingerprint !== freshFingerprint,
    );
    if (drifted.length === 0) {
      return { model, freshFingerprint, flipped: [] };
    }
    const ops: ClaimOp[] = drifted.map((claim) => ({
      op: 'mark_stale',
      claimId: claim.id,
      reason: 'canary-drift',
    }));
    try {
      const version = await store.commit(ops, snapshot.version);
      return { model, freshFingerprint, flipped: drifted.map((claim) => claim.id), version };
    } catch (thrown) {
      if (thrown instanceof KnowledgeCasError) {
        lastCas = thrown;
        continue;
      }
      throw thrown;
    }
  }
  throw lastCas ?? new Error('flipStaleOnCanaryDrift: unreachable');
}
