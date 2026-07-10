/**
 * FileModelKnowledgeStore (M10-T01): the default ModelKnowledgeStore, a
 * single JSON file in the project (`./lurker.models.json`),
 * git-diffable, serverless, embeddable. The git review of that file IS
 * the human gate's medium (docs/05, sections "Data model" and "Format
 * decision rationale"); the store itself only enforces the mechanics:
 * CAS by monotonic version (mirroring the lease fencing discipline),
 * append-only claim evolution (supersede and archive flip status, never
 * delete), and atomic replace on write.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { jcsSerialize } from '../l0/jcs.js';
import { ConfigError, KnowledgeCasError } from '../l0/errors.js';
import type {
  ClaimOp,
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
        // Archive never deletes: historical runs keep their audit trail
        // (docs/05, section "Grounding and decay"). The reason travels
        // in the op and lands in the file's git history, not the file.
        prior.status = 'archived';
        break;
      }
      case 'mark_stale': {
        const prior = byId.get(op.claimId);
        if (prior === undefined) {
          throw new ConfigError(`knowledge mark_stale rejected: no claim with id '${op.claimId}'`);
        }
        // Canary drift (docs/05, section "Grounding and decay"; M11-T04):
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

export interface FileModelKnowledgeStoreOptions {
  /** Default './lurker.models.json' (docs/05, section "Data model"). */
  path?: string;
  /** docs/06, Appendix A: active claims per (model, taskClass); default 8. */
  activeClaimsCap?: number;
}

export class FileModelKnowledgeStore implements ModelKnowledgeStore {
  private readonly path: string;
  private readonly activeClaimsCap: number | undefined;
  /** In-process commit serialization; cross-process safety is CAS plus atomic rename. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options?: FileModelKnowledgeStoreOptions) {
    this.path = resolve(options?.path ?? './lurker.models.json');
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
    const snapshot = parsed as Partial<KnowledgeSnapshot> | null;
    if (
      snapshot === null ||
      typeof snapshot.version !== 'number' ||
      typeof snapshot.hash !== 'string' ||
      !Array.isArray(snapshot.claims)
    ) {
      throw new ConfigError(`knowledge store file does not hold a KnowledgeSnapshot: ${this.path}`);
    }
    return { version: snapshot.version, hash: snapshot.hash, claims: snapshot.claims };
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
      // identity; the attestation and the active-claims cap hold here
      // (docs/05, section "The human gate"; docs/06, Appendix A).
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
