/**
 * Claim validators, the editorial path (M10-T02; docs/05, sections
 * "Data model", "The human gate", "Grounding and decay"). The types
 * live with the SPI (l0/spi/knowledge.ts); this module owns the
 * RUNTIME enforcement that the types promise:
 *
 * - a gated op without the attribution attestation does not construct
 *   (the type error becomes a runtime error for untyped callers);
 * - eval-measured claims and the metrics block are schema-present but
 *   COMMITTABLE ONLY through the eval-committer identity, which ships
 *   in M11: until then every commit is editorial and both reject;
 * - the active-claims cap per (model, taskClass) holds at commit, with
 *   supersede chains keeping only the head active;
 * - statements stay bounded, evidence stays mandatory, TTL fields stay
 *   coherent.
 */
import { ConfigError } from '../l0/errors.js';
import type { ClaimOp, GateRecord, ModelClaim } from '../l0/spi/knowledge.js';
// The decay module owns TTLs since M11-T03; the names stay re-exported
// here so claim validation and its callers keep one import surface.
import { claimExpired, claimExpiry, CLAIM_TTL_DAYS } from './decay.js';

export { claimExpired, claimExpiry, CLAIM_TTL_DAYS };

/** docs/06, Appendix A: KB active-claims cap, default 8 per (model, taskClass). */
export const KB_ACTIVE_CLAIMS_CAP = 8;

/** docs/05, section "Data model": statement <= 200 chars. */
export const CLAIM_STATEMENT_MAX_CHARS = 200;

const RULED_OUT_VOCABULARY = new Set(['prompt', 'tools', 'difficulty', 'transient-provider']);

function gateIssues(gate: GateRecord, path: string): string[] {
  const issues: string[] = [];
  if (gate.kind === 'eval-confirmed') {
    // Reserved for v2, outside the committed roadmap (docs/05, section
    // "Data model"): the proposal auto-gate is NOT the committer
    // identity and commits nothing in phases 1..3.
    issues.push(`${path}: the eval-confirmed gate is reserved for v2 and commits nothing`);
    return issues;
  }
  if (gate.kind === 'eval-committer') {
    // The dedicated committer identity (docs/05, 5.4; M11-T01).
    if (typeof gate.committerId !== 'string' || gate.committerId.length === 0) {
      issues.push(`${path}: the eval-committer gate requires a committerId`);
    }
    if (typeof gate.reportId !== 'string' || gate.reportId.length === 0) {
      issues.push(`${path}: the eval-committer gate requires the emitting reportId`);
    }
    return issues;
  }
  const attribution = (gate as { attribution?: { ruledOut?: unknown } }).attribution;
  const ruledOut = attribution?.ruledOut;
  if (!Array.isArray(ruledOut) || ruledOut.length === 0) {
    issues.push(
      `${path}: the human gate requires the attribution attestation ` +
        '(a non-empty ruledOut checklist; docs/05, section "The human gate")',
    );
  } else {
    for (const entry of ruledOut) {
      if (typeof entry !== 'string' || !RULED_OUT_VOCABULARY.has(entry)) {
        issues.push(`${path}: ruledOut entry '${String(entry)}' is outside the checklist`);
      }
    }
  }
  if (typeof gate.approver !== 'string' || gate.approver.length === 0) {
    issues.push(`${path}: the human gate requires an approver`);
  }
  return issues;
}

export interface ClaimValidationOptions {
  /**
   * True on the eval-committer path (the eval-committer gate; docs/05,
   * 5.4). Editorial validation leaves it false and both eval-measured
   * claims and metrics reject. At the op level the GATE decides this
   * flag; the option exists for direct claim-level validation.
   */
  evalCommitter?: boolean;
}

/** Issues of one claim record (empty = valid). */
export function claimIssues(
  claim: ModelClaim,
  path: string,
  options?: ClaimValidationOptions,
): string[] {
  const issues: string[] = [];
  if (typeof claim.id !== 'string' || claim.id.length === 0) {
    issues.push(`${path}: a claim requires an id`);
  }
  if (typeof claim.statement !== 'string' || claim.statement.length === 0) {
    issues.push(`${path}: a claim requires a statement`);
  } else if (claim.statement.length > CLAIM_STATEMENT_MAX_CHARS) {
    issues.push(
      `${path}: the statement exceeds ${String(CLAIM_STATEMENT_MAX_CHARS)} chars ` +
        `(${String(claim.statement.length)})`,
    );
  }
  if (typeof claim.taskClass !== 'string' || claim.taskClass.length === 0) {
    issues.push(`${path}: a claim binds a taskClass (scopeless claims are inexpressible)`);
  }
  if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
    issues.push(`${path}: evidence is mandatory (>= 1 ref)`);
  }
  if (claim.status !== 'active') {
    issues.push(`${path}: an incoming claim lands 'active'; got '${claim.status}'`);
  }
  if (Number.isNaN(Date.parse(claim.observedAt))) {
    issues.push(`${path}: observedAt is not a date`);
  }
  if (Number.isNaN(Date.parse(claim.expiresAt))) {
    issues.push(`${path}: expiresAt is not a date`);
  } else if (
    !Number.isNaN(Date.parse(claim.observedAt)) &&
    Date.parse(claim.expiresAt) <= Date.parse(claim.observedAt)
  ) {
    issues.push(`${path}: expiresAt must follow observedAt`);
  }
  if (options?.evalCommitter !== true) {
    if (claim.class === 'eval-measured') {
      issues.push(
        `${path}: eval-measured claims are committable only under the eval-committer gate ` +
          '(the eval-committer identity; docs/05, 5.4); the editorial path carries ' +
          'human-editorial only',
      );
    }
    if (claim.metrics !== undefined) {
      issues.push(
        `${path}: the metrics block is writable only by the eval-committer identity ` +
          '(docs/05, security channel 4)',
      );
    }
  }
  if (options?.evalCommitter === true && claim.class === 'eval-measured') {
    if (claim.metrics === undefined) {
      issues.push(`${path}: an eval-measured claim carries its metrics block`);
    }
  }
  return issues;
}

/**
 * The coherence square of the committer identity (docs/05, 5.4;
 * M11-T01): an eval-committer-gated claim MUST be eval-measured,
 * authored by the eval pipeline, and carry metrics; anything else is
 * an identity mismatch, schema-enforced.
 */
function committerCoherenceIssues(claim: ModelClaim, path: string): string[] {
  const issues: string[] = [];
  if (claim.class !== 'eval-measured') {
    issues.push(
      `${path}: the eval-committer gate carries eval-measured claims only; got '${claim.class}'`,
    );
  }
  if (claim.author.kind !== 'eval-pipeline') {
    issues.push(
      `${path}: the eval-committer gate requires author.kind 'eval-pipeline'; ` +
        `got '${claim.author.kind}'`,
    );
  }
  if (claim.metrics === undefined) {
    issues.push(`${path}: an eval-committer-gated claim carries its metrics block`);
  }
  return issues;
}

/**
 * Issues of one op (empty = valid). GATE-DRIVEN (M11-T01): the gate on
 * the op decides which claim rules apply, so the identity is enforced
 * by shape alone. Referential integrity stays with apply.
 */
export function claimOpIssues(op: ClaimOp, index: number): string[] {
  const path = `ops[${String(index)}]`;
  if (op.op === 'archive' || op.op === 'mark_stale') {
    // Maintenance ops carry no gate and no claim body (docs/05).
    return [];
  }
  const claim = op.op === 'add' ? op.claim : op.by;
  const claimPath = op.op === 'add' ? `${path}.claim` : `${path}.by`;
  const evalGated = op.gate.kind === 'eval-committer';
  const issues = [
    ...gateIssues(op.gate, path),
    ...claimIssues(claim, claimPath, { evalCommitter: evalGated }),
  ];
  if (evalGated) {
    issues.push(...committerCoherenceIssues(claim, claimPath));
  }
  return issues;
}

/**
 * The commit-time cap (docs/06, Appendix A): active claims per
 * (model, taskClass) after the batch applies. Supersede chains keep
 * only the head active by construction (applyClaimOps flips the prior
 * to 'superseded'), so a supersede never grows the count.
 */
export function capIssues(
  claims: readonly ModelClaim[],
  cap: number = KB_ACTIVE_CLAIMS_CAP,
): string[] {
  const counts = new Map<string, number>();
  for (const claim of claims) {
    if (claim.status !== 'active') {
      continue;
    }
    const key = `${claim.subject.model} :: ${claim.taskClass}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const issues: string[] = [];
  for (const [key, count] of counts) {
    if (count > cap) {
      issues.push(
        `active claims for (${key}) would reach ${String(count)}, over the cap ` +
          `${String(cap)} (docs/06, Appendix A); supersede or archive first`,
      );
    }
  }
  return issues.sort();
}

/**
 * The commit-batch validation: op shapes and gates first (GATE-DRIVEN
 * since M11-T01: the human gate carries editorial claims, the
 * eval-committer gate carries eval-measured claims with metrics), the
 * post-apply cap second. Throws one ConfigError carrying every issue,
 * so a maintenance caller fixes the batch in one round trip.
 */
export function validateEditorialCommit(
  ops: readonly ClaimOp[],
  claimsAfter: readonly ModelClaim[],
  options?: ClaimValidationOptions & { cap?: number },
): void {
  const issues = [
    ...ops.flatMap((op, index) => claimOpIssues(op, index)),
    ...capIssues(claimsAfter, options?.cap),
  ];
  if (issues.length > 0) {
    throw new ConfigError(`knowledge commit rejected:\n- ${issues.join('\n- ')}`);
  }
}
