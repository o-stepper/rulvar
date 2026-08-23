/**
 * The semantic terminal verdict (RV4209, the sixth comparison
 * experiment). The envelope has carried every semantic FACT for
 * releases (the claim meta, the audit meta, the waiver, the findings),
 * and still no surface answered the one production question in one
 * word: is this document semantically CLEAN? The CLI's `--strict`
 * deliberately keeps exit 0 on `partial` and `vacuous` (they break no
 * contract the pass declares), the experiment's run settled ok under a
 * standing waiver with three unsupported citations, and every consumer
 * re-derived the same verdict from four fields by hand, each with its
 * own bugs. This module is the ONE derivation: a pure fold over the
 * envelope's own facts, stamped onto the envelope by orchestrate, so
 * the CLI gate, the HTTP response, and the event stream read the SAME
 * verdict by construction instead of three re-derivations.
 */

/** The one-word semantic verdict plus the facts it was folded from. */
export interface SemanticTerminalVerdict {
  /**
   * The verdict, in refusal precedence order:
   * - 'not-judged': semantic machinery was configured and nothing
   *   usable judged the shipped document (a failed or declined judge,
   *   a draft-stage verdict the synthesis then rewrote, a meta
   *   carrying no evidence anything judged, or a meta whose counters
   *   are malformed, RV4402);
   * - 'findings': a judge ruled and defects stand (contradictions or
   *   unsupported sampled citations);
   * - 'waived': acceptance was licensed by a standing exception, not
   *   by coverage;
   * - 'partial': coverage graded below 'full' ('partial' or
   *   'critical-uncovered') with no waiver standing;
   * - 'vacuous': the document cited nothing, so the configured pass
   *   verified nothing;
   * - 'clean': every configured judge ruled on the shipped document
   *   and found nothing.
   */
  verdict: 'clean' | 'findings' | 'partial' | 'vacuous' | 'waived' | 'not-judged';
  /** The judged document's hash: the claim judgedHash, else the audit auditedHash. */
  finalHash?: string;
  /** The final claim-coverage grade, verbatim from the meta. */
  coverage?: string;
  /** Judged claim contradictions standing at settle. */
  contradictions: number;
  /** Sampled citations judged UNSUPPORTED at settle. */
  unsupportedCitations: number;
  /** Sampled citations judged partial at settle: findings, not stops. */
  partialCitations: number;
  /** Bounded semantic repair rounds the run actually dispatched. */
  semanticRepairRounds: number;
  /** The standing exception that licensed acceptance, when one did. */
  waiver?: { principal: string; reason: string; expiresAt?: string; coverage: string };
  /**
   * Why nothing usable judged the document, when 'not-judged': stable
   * codes ('claim-judge-failed', 'claim-judge-declined',
   * 'citation-judge-failed', 'citation-judge-declined',
   * 'draft-rewritten-unjudged', and the RV4402 trust codes
   * 'claim-meta-unjudged' / 'citation-meta-unjudged' for a meta with
   * no evidence anything judged, 'claim-meta-malformed' /
   * 'citation-meta-malformed' for counters that are not counts).
   * Empty on every other verdict.
   */
  judgeFailures: string[];
}

/** The envelope facts the fold reads; every field optional and untrusted. */
export interface SemanticVerdictInput {
  claimConsistencyMeta?: Record<string, unknown>;
  citationAuditMeta?: Record<string, unknown>;
  claimCoverageWaiver?: Record<string, unknown>;
  draftToFinal?: Record<string, unknown>;
}

/**
 * A counter that is ABSENT legitimately reads 0 (an older meta, a
 * side that recorded nothing); a counter that is PRESENT but not a
 * count is a meta this fold must not trust (RV4402): the seventh
 * comparison experiment's re-audit found the old fold reading every
 * malformed field as 0 and folding garbage to 'clean', the exact
 * opposite of its own docstring.
 */
const counterOf = (value: unknown): { count: number; malformed: boolean } =>
  value === undefined
    ? { count: 0, malformed: false }
    : typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? { count: value, malformed: false }
      : { count: 0, malformed: true };

/**
 * Folds the one semantic verdict out of envelope facts (RV4209).
 * Returns undefined when NO semantic meta is present: nothing was
 * configured, nothing judged anything, and absence must keep meaning
 * NOT RECORDED rather than a fabricated verdict. Never throws on
 * malformed shapes, and malformation degrades toward 'not-judged',
 * the fail-closed direction (RV4402): a meta that carries NO evidence
 * anything judged (no judgedHash/auditedHash, no judgeInvoked, no
 * judge flag, no judgedStage) folds 'not-judged' with a trust code,
 * never 'clean', and a counter that is present but not a count taints
 * its meta the same way. An ABSENT field still reads absent: absence
 * is honest, garbage is not.
 */
export function semanticTerminalVerdictOf(
  input: SemanticVerdictInput,
): SemanticTerminalVerdict | undefined {
  const claim = input.claimConsistencyMeta;
  const audit = input.citationAuditMeta;
  if (claim === undefined && audit === undefined) {
    return undefined;
  }
  const judgeFailures: string[] = [];
  if (claim?.judgeFailed === true) {
    judgeFailures.push('claim-judge-failed');
  }
  if (claim?.judgeDeclined === true) {
    judgeFailures.push('claim-judge-declined');
  }
  if (audit?.judgeFailed === true) {
    judgeFailures.push('citation-judge-failed');
  }
  if (audit?.judgeDeclined === true) {
    judgeFailures.push('citation-judge-declined');
  }
  // The RV3207 gap as a verdict input: a coverage grade rendered over
  // the DRAFT describes the shipped artifact only when the synthesis
  // returned it unchanged; a rewritten draft means nothing judged
  // what ships, however green the grade reads.
  if (
    claim?.judgedStage === 'draft' &&
    (input.draftToFinal as { rewritten?: unknown } | undefined)?.rewritten === true
  ) {
    judgeFailures.push('draft-rewritten-unjudged');
  }
  const coverage = typeof claim?.coverage === 'string' ? claim.coverage : undefined;
  if (coverage === 'judge-failed' && !judgeFailures.includes('claim-judge-failed')) {
    judgeFailures.push('claim-judge-failed');
  }
  if (coverage === 'judge-declined' && !judgeFailures.includes('claim-judge-declined')) {
    judgeFailures.push('claim-judge-declined');
  }
  // The trust gate (RV4402). Evidence that a meta was produced by the
  // judging machinery at all: the document hash it stamps on every
  // path, the judgeInvoked marker, a judge failure flag (its own
  // code), or a judged stage. A meta with NONE of these is a foreign
  // or empty shape, and folding it toward 'clean' would launder
  // garbage into the one word production gates on.
  const claimUnjudged =
    claim !== undefined &&
    !(
      typeof claim.judgedHash === 'string' ||
      claim.judgeInvoked === true ||
      claim.judgeFailed === true ||
      claim.judgeDeclined === true ||
      typeof claim.judgedStage === 'string'
    );
  if (claimUnjudged) {
    judgeFailures.push('claim-meta-unjudged');
  }
  const auditUnjudged =
    audit !== undefined &&
    !(
      typeof audit.auditedHash === 'string' ||
      audit.judgeInvoked === true ||
      audit.judgeFailed === true ||
      audit.judgeDeclined === true
    );
  if (auditUnjudged) {
    judgeFailures.push('citation-meta-unjudged');
  }
  const contradictionsC = counterOf(claim?.findings);
  const unsupportedC = counterOf(audit?.unsupported);
  const partialC = counterOf(audit?.partial);
  const claimRoundsC = counterOf(claim?.semanticRepairRounds);
  const auditRoundsC = counterOf(audit?.citationRepairRounds);
  if (contradictionsC.malformed || claimRoundsC.malformed) {
    judgeFailures.push('claim-meta-malformed');
  }
  if (unsupportedC.malformed || partialC.malformed || auditRoundsC.malformed) {
    judgeFailures.push('citation-meta-malformed');
  }
  const contradictions = contradictionsC.count;
  const unsupportedCitations = unsupportedC.count;
  const partialCitations = partialC.count;
  const semanticRepairRounds = Math.max(claimRoundsC.count, auditRoundsC.count);
  const waiverCandidate = input.claimCoverageWaiver as
    { principal?: unknown; reason?: unknown; expiresAt?: unknown; coverage?: unknown } | undefined;
  const waiver =
    waiverCandidate !== undefined &&
    typeof waiverCandidate.principal === 'string' &&
    typeof waiverCandidate.reason === 'string' &&
    typeof waiverCandidate.coverage === 'string'
      ? {
          principal: waiverCandidate.principal,
          reason: waiverCandidate.reason,
          ...(typeof waiverCandidate.expiresAt === 'string'
            ? { expiresAt: waiverCandidate.expiresAt }
            : {}),
          coverage: waiverCandidate.coverage,
        }
      : undefined;
  const finalHash =
    typeof claim?.judgedHash === 'string'
      ? claim.judgedHash
      : typeof audit?.auditedHash === 'string'
        ? audit.auditedHash
        : undefined;
  const verdict: SemanticTerminalVerdict['verdict'] =
    judgeFailures.length > 0
      ? 'not-judged'
      : contradictions > 0 || unsupportedCitations > 0
        ? 'findings'
        : waiver !== undefined
          ? 'waived'
          : coverage === 'partial' || coverage === 'critical-uncovered'
            ? 'partial'
            : coverage === 'vacuous'
              ? 'vacuous'
              : 'clean';
  return {
    verdict,
    ...(finalHash === undefined ? {} : { finalHash }),
    ...(coverage === undefined ? {} : { coverage }),
    contradictions,
    unsupportedCitations,
    partialCitations,
    semanticRepairRounds,
    ...(waiver === undefined ? {} : { waiver }),
    judgeFailures,
  };
}

/**
 * The production acceptance predicate (RV4209): the one boolean a
 * production consumer gates on, with the stable reason when it
 * refuses. A verdict is production-acceptable exactly when it exists
 * and reads 'clean': 'partial' and 'vacuous' are legal diagnostics
 * (strict keeps exit 0 on them by documented design), 'waived' is a
 * human exception a machine gate must surface rather than inherit,
 * and an ABSENT verdict means nothing judged anything, which a
 * production gate reads fail closed. The refusal reason distinguishes
 * the two refusal shapes a reader used to conflate (RV4402): an
 * absent verdict reads 'not-recorded' (nothing was configured, or the
 * run predates the fold), while a recorded 'not-judged' verdict lists
 * its judge failure codes, so an operator can tell "the machinery
 * never wrote a verdict" from "judges ran and nothing usable judged
 * the shipped document". Exported so the CLI's `--acceptance-policy
 * production`, a server consumer, and a host pipeline apply the SAME
 * rule instead of three re-derivations.
 */
export function productionAcceptable(verdict: SemanticTerminalVerdict | undefined): {
  ok: boolean;
  reason?: string;
} {
  if (verdict === undefined) {
    return {
      ok: false,
      reason:
        'not-recorded: the terminal carries no semantic verdict (no claim or citation ' +
        'machinery was configured, or the run predates it)',
    };
  }
  if (verdict.verdict === 'clean') {
    return { ok: true };
  }
  const detail =
    verdict.verdict === 'findings'
      ? `${String(verdict.contradictions)} contradiction(s), ` +
        `${String(verdict.unsupportedCitations)} unsupported citation(s)`
      : verdict.verdict === 'waived'
        ? `waived by ${verdict.waiver?.principal ?? 'unknown'} over coverage ` +
          `'${verdict.waiver?.coverage ?? 'unknown'}'`
        : verdict.verdict === 'not-judged'
          ? verdict.judgeFailures.join(', ')
          : `coverage '${verdict.coverage ?? 'unknown'}'`;
  return { ok: false, reason: `${verdict.verdict}: ${detail}` };
}
