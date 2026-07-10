/**
 * Grounding and decay (M11-T03; docs/05, section "Grounding and
 * decay"). The decay owner: the asymmetric TTL table, the expiry
 * filter the read path applies at every pin AND repin (M10-T03), the
 * re-measurement queue (a STATUS FILTER, not infrastructure), and the
 * archive-never-delete maintenance helpers (historical runs keep their
 * audit trail).
 */
import { ConfigError } from '../l0/errors.js';
import type { ClaimOp, ModelClaim } from '../l0/spi/knowledge.js';
import type { ModelRef } from '../l0/messages.js';

/**
 * The asymmetric TTL table (docs/05, section "Grounding and decay"):
 * a false negative is costlier through lock-in, so weaknesses expire
 * sooner than strengths.
 */
export const CLAIM_TTL_DAYS = {
  'eval-measured': { strength: 90, weakness: 30 },
  'human-editorial': { strength: 120, weakness: 45 },
} as const;

/** Inbox proposals expire after 14 days (reserved for M12 phase 3). */
export const INBOX_PROPOSAL_TTL_DAYS = 14;

/** The docs/05 TTL applied to an observedAt ISO date. */
export function claimExpiry(
  claimClass: ModelClaim['class'],
  polarity: ModelClaim['polarity'],
  observedAt: string,
): string {
  const base = Date.parse(observedAt);
  if (Number.isNaN(base)) {
    throw new ConfigError(`claimExpiry: observedAt is not a date: '${observedAt}'`);
  }
  const days = CLAIM_TTL_DAYS[claimClass][polarity];
  return new Date(base + days * 86_400_000).toISOString();
}

/** True when the claim steers nothing at `at` (docs/05, read-path filters). */
export function claimExpired(claim: Pick<ModelClaim, 'expiresAt'>, at: string): boolean {
  const expiry = Date.parse(claim.expiresAt);
  const now = Date.parse(at);
  return Number.isNaN(expiry) || Number.isNaN(now) ? true : now >= expiry;
}

/** The TTL state a maintenance view renders per claim. */
export type TtlState = 'holds' | 'expired';

export function ttlState(claim: Pick<ModelClaim, 'expiresAt'>, at: string): TtlState {
  return claimExpired(claim, at) ? 'expired' : 'holds';
}

/**
 * The re-measurement queue (docs/05, section "Grounding and decay"):
 * expired eval-measured claims that are still ACTIVE. Just a status
 * filter: the next sweep re-measures these subjects; nothing archives
 * them (archiving would empty the queue and hide the decay).
 */
export function remeasureQueue(claims: readonly ModelClaim[], at: string): ModelClaim[] {
  return claims.filter(
    (claim) =>
      claim.status === 'active' && claim.class === 'eval-measured' && claimExpired(claim, at),
  );
}

/**
 * Deprecation maintenance (docs/05: "deprecations, which archive
 * claims, never delete them, so historical runs keep their audit
 * trail"): archive ops for every non-terminal claim of the deprecated
 * models. The caller commits them under its own gate-free archive ops.
 */
export function archiveDeprecatedModelOps(
  claims: readonly ModelClaim[],
  deprecated: readonly ModelRef[],
): ClaimOp[] {
  const targets = new Set(deprecated);
  return claims
    .filter(
      (claim) =>
        targets.has(claim.subject.model) && (claim.status === 'active' || claim.status === 'stale'),
    )
    .map((claim) => ({ op: 'archive', claimId: claim.id, reason: 'deprecated' }));
}
