/**
 * FileModelKnowledgeStore (M10-T01): the default ModelKnowledgeStore, a
 * single JSON file in the project (`./rulvar.models.json`),
 * git-diffable, serverless, embeddable. The git review of that file IS
 * the human gate's medium; the store itself only enforces the mechanics:
 * CAS by monotonic version (mirroring the lease fencing discipline),
 * append-only claim evolution (supersede and archive flip status, never
 * delete), and atomic replace on write.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { jcsSerialize } from '../l0/jcs.js';
import { ConfigError, KnowledgeCasError } from '../l0/errors.js';
import { requireNonNegativeInteger } from '../l0/validate-numbers.js';
import type {
  ClaimOp,
  ClaimStatus,
  KnowledgeSnapshot,
  ModelClaim,
  ModelKnowledgeStore,
} from '../l0/spi/knowledge.js';
import { validateEditorialCommit } from './claims.js';

/** Deterministic content hash of the claims array (JCS + sha256). */
export function knowledgeHash(claims: readonly ModelClaim[]): string {
  return createHash('sha256').update(jcsSerialize(claims), 'utf8').digest('hex');
}

/**
 * Applies one op batch to a claims array, mechanically (M10-T01). The
 * editorial validators (attestation, caps, statement bounds) layer on
 * top in M10-T02; referential integrity is enforced here because a
 * dangling supersede or archive would corrupt the append-only chain.
 */
export function applyClaimOps(
  claims: readonly ModelClaim[],
  ops: readonly ClaimOp[],
): ModelClaim[] {
  const next = claims.map((claim) => ({ ...claim }));
  const byId = new Map(next.map((claim) => [claim.id, claim]));
  for (const op of ops) {
    switch (op.op) {
      case 'add': {
        if (byId.has(op.claim.id)) {
          throw new ConfigError(`knowledge add rejected: claim id '${op.claim.id}' exists`);
        }
        const added = { ...op.claim };
        next.push(added);
        byId.set(added.id, added);
        break;
      }
      case 'supersede': {
        const prior = byId.get(op.claimId);
        if (prior === undefined) {
          throw new ConfigError(`knowledge supersede rejected: no claim with id '${op.claimId}'`);
        }
        if (byId.has(op.by.id)) {
          throw new ConfigError(`knowledge supersede rejected: claim id '${op.by.id}' exists`);
        }
        prior.status = 'superseded';
        const replacement = { ...op.by, supersedes: op.claimId };
        next.push(replacement);
        byId.set(replacement.id, replacement);
        break;
      }
      case 'archive': {
        const prior = byId.get(op.claimId);
        if (prior === undefined) {
          throw new ConfigError(`knowledge archive rejected: no claim with id '${op.claimId}'`);
        }
        // Archive never deletes: historical runs keep their audit trail.
        // The reason travels
        // in the op and lands in the file's git history, not the file.
        prior.status = 'archived';
        break;
      }
      case 'mark_stale': {
        const prior = byId.get(op.claimId);
        if (prior === undefined) {
          throw new ConfigError(`knowledge mark_stale rejected: no claim with id '${op.claimId}'`);
        }
        // Canary drift (M11-T04):
        // active flips to stale; already-stale is an idempotent noop;
        // terminal statuses stay (superseded and archived never revive).
        if (prior.status === 'active') {
          prior.status = 'stale';
        }
        break;
      }
    }
  }
  return next;
}

/** A lowercase sha256 digest: 64 hex characters. */
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const CLAIM_STATUSES = new Set<ClaimStatus>(['active', 'stale', 'superseded', 'archived']);

/**
 * Structural issues of one PERSISTED claim (empty = sound). Distinct from
 * the editorial commit validator (claims.ts): a persisted snapshot
 * legitimately holds non-active statuses (stale, superseded, archived) and
 * carries no gate, so only shape and vocabulary are checked here. This is
 * the boundary that keeps a null or partial claim from reaching the card
 * render, where `claim.status` would throw an untyped TypeError (v1.36.0
 * review P2-6).
 */
function persistedClaimIssues(value: unknown, path: string): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [`${path}: expected a claim object`];
  }
  const claim = value as Record<string, unknown>;
  const issues: string[] = [];
  if (typeof claim.id !== 'string' || claim.id.length === 0) {
    issues.push(`${path}.id: expected a non-empty string`);
  }
  const subject = claim.subject as Record<string, unknown> | null | undefined;
  if (subject === null || typeof subject !== 'object') {
    issues.push(`${path}.subject: expected an object`);
  } else if (typeof subject.model !== 'string' || !subject.model.includes(':')) {
    issues.push(`${path}.subject.model: expected a 'provider:model' string`);
  }
  if (typeof claim.taskClass !== 'string' || claim.taskClass.length === 0) {
    issues.push(`${path}.taskClass: expected a non-empty string`);
  }
  if (claim.polarity !== 'strength' && claim.polarity !== 'weakness') {
    issues.push(`${path}.polarity: expected 'strength' or 'weakness'`);
  }
  if (typeof claim.statement !== 'string' || claim.statement.length === 0) {
    issues.push(`${path}.statement: expected a non-empty string`);
  }
  if (claim.class !== 'eval-measured' && claim.class !== 'human-editorial') {
    issues.push(`${path}.class: expected 'eval-measured' or 'human-editorial'`);
  }
  if (typeof claim.status !== 'string' || !CLAIM_STATUSES.has(claim.status as ClaimStatus)) {
    issues.push(`${path}.status: expected active, stale, superseded, or archived`);
  }
  if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
    issues.push(`${path}.evidence: expected a non-empty array`);
  }
  if (claim.confidence !== 'high' && claim.confidence !== 'medium' && claim.confidence !== 'low') {
    issues.push(`${path}.confidence: expected 'high', 'medium', or 'low'`);
  }
  if (typeof claim.observedAt !== 'string' || Number.isNaN(Date.parse(claim.observedAt))) {
    issues.push(`${path}.observedAt: expected an ISO date`);
  }
  if (typeof claim.expiresAt !== 'string' || Number.isNaN(Date.parse(claim.expiresAt))) {
    issues.push(`${path}.expiresAt: expected an ISO date`);
  }
  const author = claim.author as Record<string, unknown> | null | undefined;
  if (author === null || typeof author !== 'object') {
    issues.push(`${path}.author: expected an object`);
  } else {
    if (author.kind !== 'eval-pipeline' && author.kind !== 'human') {
      issues.push(`${path}.author.kind: expected 'eval-pipeline' or 'human'`);
    }
    if (typeof author.id !== 'string' || author.id.length === 0) {
      issues.push(`${path}.author.id: expected a non-empty string`);
    }
  }
  return issues;
}

/**
 * The single read boundary of the store (v1.36.0 review P2-6). A persisted
 * snapshot must hold a nonnegative integer version, a lowercase sha256
 * hash, structurally sound claims, and a hash that MATCHES its claims: the
 * KnowledgeSnapshot contract promises the hash is the deterministic
 * content hash of the claims, so a file edited without rehashing (a forged
 * version or hash, a torn write) is refused with a typed ConfigError
 * instead of flowing on to forge the audit trail or crash the render.
 */
function validateKnowledgeSnapshot(parsed: unknown, path: string): KnowledgeSnapshot {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ConfigError(`knowledge store file does not hold a KnowledgeSnapshot: ${path}`);
  }
  const snapshot = parsed as Record<string, unknown>;
  const issues: string[] = [];
  const version = snapshot.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    issues.push(`version: expected a nonnegative integer; got ${String(version)}`);
  }
  const hash = snapshot.hash;
  if (typeof hash !== 'string' || !HASH_PATTERN.test(hash)) {
    issues.push('hash: expected a lowercase sha256 digest of 64 hex characters');
  }
  if (!Array.isArray(snapshot.claims)) {
    issues.push('claims: expected an array');
  } else {
    snapshot.claims.forEach((claim, index) => {
      issues.push(...persistedClaimIssues(claim, `claims[${String(index)}]`));
    });
  }
  if (issues.length > 0) {
    throw new ConfigError(
      `knowledge store file is not a valid KnowledgeSnapshot (${path}):\n- ${issues.join('\n- ')}`,
    );
  }
  // Structure is sound, so the claims serialize and the content hash can be
  // recomputed: it must equal the stored hash (the integrity contract).
  const claims = snapshot.claims as ModelClaim[];
  const recomputed = knowledgeHash(claims);
  if (hash !== recomputed) {
    throw new ConfigError(
      `knowledge store hash does not match its claims (${path}): ` +
        `stored ${String(hash)}, computed ${recomputed}; the file was edited without rehashing`,
    );
  }
  // hash narrowed to string by the equality guard above; version stays
  // unknown until asserted (it was checked, not compared).
  return { version: version as number, hash, claims };
}

export interface FileModelKnowledgeStoreOptions {
  /** Default './rulvar.models.json'. */
  path?: string;
  /**
   * Active claims per (model, taskClass); default 8. A nonnegative
   * integer (zero refuses every active claim), validated at
   * construction: the enforcement compares `count > cap`, and every
   * comparison with NaN is false, so an unvalidated NaN or Infinity
   * silently disabled the cap (v1.35.0 review P2-5).
   */
  activeClaimsCap?: number;
}

export class FileModelKnowledgeStore implements ModelKnowledgeStore {
  private readonly path: string;
  private readonly activeClaimsCap: number | undefined;
  /** In-process commit serialization; cross-process safety is CAS plus atomic rename. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options?: FileModelKnowledgeStoreOptions) {
    this.path = resolve(options?.path ?? './rulvar.models.json');
    if (options?.activeClaimsCap !== undefined) {
      requireNonNegativeInteger(options.activeClaimsCap, 'FileModelKnowledgeStore activeClaimsCap');
    }
    this.activeClaimsCap = options?.activeClaimsCap;
  }

  private read(): KnowledgeSnapshot {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (thrown) {
      if ((thrown as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: 0, hash: knowledgeHash([]), claims: [] };
      }
      throw thrown;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new ConfigError(`knowledge store file is not valid JSON: ${this.path}`, { cause });
    }
    return validateKnowledgeSnapshot(parsed, this.path);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- async lifts sync read errors into rejections (the SPI contract is promise-shaped)
  async current(): Promise<KnowledgeSnapshot> {
    return this.read();
  }

  commit(ops: ClaimOp[], expectedVersion: number): Promise<number> {
    // Sync body under .then(): a throw becomes the promise rejection.
    const run = (): number => {
      const snapshot = this.read();
      if (snapshot.version !== expectedVersion) {
        throw new KnowledgeCasError(
          `knowledge commit rejected: expected version ${String(expectedVersion)}, ` +
            `the store is at ${String(snapshot.version)}; re-read and rebase`,
          { data: { expectedVersion, actualVersion: snapshot.version } },
        );
      }
      const claims = applyClaimOps(snapshot.claims, ops);
      // The editorial path is the ONLY committable path in phase 1:
      // eval-measured claims and metrics wait for the M11 committer
      // identity; the attestation and the active-claims cap hold here.
      validateEditorialCommit(ops, claims, { cap: this.activeClaimsCap });
      const next: KnowledgeSnapshot = {
        version: snapshot.version + 1,
        hash: knowledgeHash(claims),
        claims,
      };
      // Atomic replace: temp write plus rename (the jsonl store idiom).
      mkdirSync(dirname(this.path), { recursive: true });
      const temp = `${this.path}.tmp`;
      writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      renameSync(temp, this.path);
      return next.version;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
