/**
 * ModelKnowledgeStore SPI (M10-T01): the engine-scoped, per-project,
 * append-only store of schematized claims about the suitability of the
 * triple (model, effort, taskClass). A neighbor of JournalStore; the
 * seam freezes with knowledge-base phase 1, post-1.0, not at the 1.0
 * freeze of the six core seams.
 *
 * Owning spec: docs/05-model-knowledge-spec.md, section "Data model".
 * Two structural security decisions live in the shapes themselves:
 * there is NO propose() method in the SPI at all (proposals exist only
 * in the journaled RunLedger and reach the gate via LedgerExport), and
 * the runtime receives ModelKnowledgeHandle, which physically lacks
 * commit. A GateRecord of the human kind does not assemble without the
 * attribution attestation, and without a GateRecord no add or
 * supersede ClaimOp assembles.
 */
import type { Effort, ModelRef } from '../messages.js';

/**
 * Task-class vocabulary aligned with the role quality floors vocabulary
 * (docs/04, section "Role quality floors"). Scopeless global statements
 * are inexpressible: every claim binds a taskClass.
 */
export type TaskClass =
  | 'code-edit'
  | 'investigation'
  | 'synthesis'
  | 'extraction'
  | 'planning'
  | 'judging'
  | (string & {});

export type ClaimClass = 'eval-measured' | 'human-editorial';

export type ClaimStatus = 'active' | 'stale' | 'superseded' | 'archived';

/** entryRef is the journal entry seq (canonical EntryRef; XF ruling). */
export type EvidenceRef =
  | { kind: 'journal'; runId: string; entryRef: number }
  | { kind: 'eval'; reportId: string; caseIds: string[] };

export interface ModelClaim {
  /** ULID. */
  id: string;
  /** effort is part of identity, as in the canonical modelSpec. */
  subject: { model: ModelRef; effort?: Effort };
  taskClass: TaskClass;
  polarity: 'strength' | 'weakness';
  /** <=200 chars; proposal-born claims use a typed template, never a quote from tool output. */
  statement: string;
  /** eval-measured is committable only through the eval-committer identity (M11). */
  class: ClaimClass;
  status: ClaimStatus;
  /** Mandatory, >=1. */
  evidence: EvidenceRef[];
  /** Writable ONLY by the eval-committer identity (schema-enforced from M11). */
  metrics?: {
    passRate: number;
    n: number;
    graderId: string;
    cost?: number;
    baseline?: { model: ModelRef; passRate: number };
  };
  confidence: 'high' | 'medium' | 'low';
  /** ISO date. */
  observedAt: string;
  /** TTL by class and polarity (docs/05, section "Grounding and decay"). */
  expiresAt: string;
  /** Honestly best-effort drift signal. */
  modelEpoch?: {
    registryVersion?: string;
    pricingVersion?: string;
    capsHash?: string;
    canaryFingerprint?: string;
  };
  author: { kind: 'eval-pipeline' | 'human'; id: string };
  /** Orchestrator proposal provenance (phase 3). */
  origin?: { kind: 'kb-proposal'; runId: string; entryRef: number };
  /** Append-only: an edit is a new claim plus supersede. */
  supersedes?: string;
}

export interface KnowledgeSnapshot {
  /** Monotonic; the CAS token of commit. */
  version: number;
  /** Deterministic content hash of the claims array. */
  hash: string;
  claims: ModelClaim[];
}

/**
 * The write gate. The human variant carries the MANDATORY attribution
 * attestation (ruledOut over the checklist prompt, tools, difficulty,
 * transient-provider; recommended contrast evidence): rubber-stamping
 * "evidence exists" is constructively impossible. The eval-confirmed
 * variant is reserved for v2, outside the committed roadmap.
 */
export type GateRecord =
  | {
      kind: 'human';
      approver: string;
      at: string;
      attribution: {
        ruledOut: Array<'prompt' | 'tools' | 'difficulty' | 'transient-provider'>;
        contrastEvidence?: EvidenceRef;
      };
    }
  /**
   * The dedicated committer identity (docs/05, section 5.4; M11): the
   * ONLY gate under which eval-measured claims and the metrics block
   * commit. Coherence is schema-enforced in both directions.
   */
  | { kind: 'eval-committer'; committerId: string; reportId: string }
  /** Reserved for v2: the proposal auto-gate, NOT the committer identity. */
  | { kind: 'eval-confirmed'; reportId: string; n: number; passRate: number };

export type ClaimOp =
  | { op: 'add'; claim: ModelClaim; gate: GateRecord }
  | { op: 'supersede'; claimId: string; by: ModelClaim; gate: GateRecord }
  | { op: 'archive'; claimId: string; reason: 'deprecated' | 'stale' | 'rejected' | 'falsified' };

/**
 * The SPI seam (docs/05, section "Data model"). commit performs CAS on
 * the monotonic snapshot version, mirroring the fencing-epoch
 * discipline of LeasableStore; concurrent maintenance commits serialize
 * through CAS rejection and rebase. commit is UNREACHABLE from the
 * runtime: runs hold ModelKnowledgeHandle.
 */
export interface ModelKnowledgeStore {
  current(): Promise<KnowledgeSnapshot>;
  commit(ops: ClaimOp[], expectedVersion: number): Promise<number>;
}

/**
 * The runtime handle: with propose() deleted from the design and
 * commit absent from this shape, a run has no write path into the
 * cross-run medium at all (docs/05, section "Security", channel 3).
 */
export type ModelKnowledgeHandle = Pick<ModelKnowledgeStore, 'current'>;
