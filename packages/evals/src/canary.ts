/**
 * The canary fingerprint (M11-T04; OQ-06). The optional compensation for silent alias
 * re-pointing that modelEpoch honestly cannot catch: a FIXED probe set,
 * run through the ordinary engine (journaled, budgeted,
 * VCR-recordable), hashed over normalized outputs. Sampling parameters
 * are not pinned; drift detection rests on the fixed prompts, the
 * normalization, and exact fingerprint comparison. A fingerprint change
 * flips the model's eval claims to stale in one command.
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
  type RunOutcome,
} from '@rulvar/core';
import { defineWorkflow } from '@rulvar/core';

import { requireCasAttempts } from './committer.js';

import { SweepBudgetError, type SpendEnvelope } from './envelope.js';

export interface CanaryProbeSet {
  /** Registered agent profile the probes run under. */
  agentType: string;
  /** The fixed prompts; order matters and enters the fingerprint. */
  prompts: string[];
}

export interface CanaryRunOptions {
  /**
   * Immutable ceiling per probe run (v1.16.2 review P1-2): every probe
   * is an ordinary paid engine run and gets its own recorded
   * RunMeta.budgetUsd.
   */
  budgetUsd?: number;
  /**
   * Aggregate debit-only envelope shared with the surrounding sweep;
   * each probe authorizes budgetUsd BEFORE running, and an envelope
   * requires budgetUsd to be set.
   */
  envelope?: SpendEnvelope;
}

export interface CanaryReport {
  fingerprint: string;
  /**
   * True only when every probe settled ok. A fingerprint containing a
   * non-ok probe status is a measurement artifact (budget exhaustion,
   * an envelope refusal, transient provider failure), NOT evidence of
   * model drift: never feed it to flipStaleOnCanaryDrift.
   */
  allOk: boolean;
  /**
   * One row per probe; 'refused' means the aggregate envelope refused
   * the probe before it started (v1.17.0 review P1-5): the loop keeps
   * walking so completed probe evidence survives, and allOk is false.
   */
  probes: Array<{ prompt: string; status: RunOutcome<unknown>['status'] | 'refused' }>;
}

/** The committed v1 normalization (OQ-06): NFC, trim, collapse whitespace. */
export function normalizeCanaryOutput(output: unknown): string {
  const text = typeof output === 'string' ? output : JSON.stringify(output ?? null);
  return text.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

/**
 * Runs the fixed probe set through the ordinary engine. Probes run
 * sequentially in declaration order, one run per probe, so recordings
 * replay deterministically. Each probe run carries the optional
 * immutable ceiling (options.budgetUsd) and authorizes it against the
 * optional envelope before starting; an envelope refusal records the
 * probe as 'refused' and keeps walking instead of throwing away the
 * completed probes. A non-ok or refused probe enters the fingerprint
 * as `!status` and clears allOk: callers gate drift flipping on allOk,
 * because a budget-starved or transiently failing probe fingerprints
 * differently without the model having drifted.
 */
export async function runCanary(
  engine: Engine,
  probes: CanaryProbeSet,
  options: CanaryRunOptions = {},
): Promise<CanaryReport> {
  const outputs: string[] = [];
  const probeReports: CanaryReport['probes'] = [];
  for (const [index, prompt] of probes.prompts.entries()) {
    try {
      options.envelope?.authorize(options.budgetUsd, `canary probe ${String(index)}`);
    } catch (error) {
      if (!(error instanceof SweepBudgetError)) {
        throw error;
      }
      // A refused probe never runs and costs nothing; the report keeps
      // walking so completed probe evidence survives, and the refusal
      // clears allOk exactly like any other non-ok probe.
      probeReports.push({ prompt, status: 'refused' });
      outputs.push('!refused');
      continue;
    }
    const workflow = defineWorkflow(
      { name: `kb-canary:${String(index)}` },
      async (ctx) => await ctx.agent(prompt, { agentType: probes.agentType }),
    );
    const outcome = await engine.run(
      workflow,
      null,
      options.budgetUsd === undefined ? {} : { budgetUsd: options.budgetUsd },
    ).result;
    probeReports.push({ prompt, status: outcome.status });
    outputs.push(
      outcome.status === 'ok' ? normalizeCanaryOutput(outcome.value) : `!${outcome.status}`,
    );
  }
  const body = JSON.stringify([probes.prompts.length, outputs]);
  return {
    fingerprint: createHash('sha256').update(body, 'utf8').digest('hex'),
    allOk: probeReports.every((probe) => probe.status === 'ok'),
    probes: probeReports,
  };
}

/**
 * The fingerprint alone (the pre-v1.16.2-review surface, kept
 * compatible). Prefer runCanary: its allOk is the drift-flip gate.
 */
export async function canaryFingerprint(
  engine: Engine,
  probes: CanaryProbeSet,
  options: CanaryRunOptions = {},
): Promise<string> {
  return (await runCanary(engine, probes, options)).fingerprint;
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
 * recorded canary fingerprint differs from the fresh one. Claims
 * without a recorded fingerprint have no baseline and
 * stay untouched (the documented no-probe posture); a second run is
 * an idempotent noop. CAS-rebased like every maintenance commit; the
 * retries run no engine work and pay nothing.
 *
 * Only pass fingerprints from an allOk probe set (runCanary): a
 * fingerprint containing a `!status` probe differs from any healthy
 * baseline by construction, and flipping on it would blame the model
 * for a budget ceiling or a transient provider failure.
 */
export async function flipStaleOnCanaryDrift(
  store: ModelKnowledgeStore,
  model: ModelRef,
  freshFingerprint: string,
  options?: { attempts?: number },
): Promise<CanaryDriftReport> {
  const attempts = options?.attempts ?? 3;
  // A positive integer, refused before the first store read (v1.35.0
  // review P2-5): the unvalidated loop skipped entirely on NaN or zero
  // and surfaced the generic 'unreachable' Error.
  requireCasAttempts(attempts, 'flipStaleOnCanaryDrift attempts');
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
