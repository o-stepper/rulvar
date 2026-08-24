/**
 * SqliteAdmissionScheduler (plan 45, rfcs/admission.md section 9): the
 * durable admission SPI over one sqlite database file. The scheduler
 * state is ONE plain-JSON document (AdmissionState) CASed atomically
 * per lifecycle call inside a BEGIN IMMEDIATE transaction, the RFC's
 * first shipped durable shape: a single scheduler over durable state,
 * with deterministic ordering guaranteed by the pure algorithms the
 * document hydrates into. "State moved AND buckets moved" is atomic
 * trivially: the whole document commits or none of it does. In-process
 * calls serialize on a promise chain; cross-process writers serialize
 * on the database's write lock (a concurrent BEGIN IMMEDIATE fails
 * fast, the store's documented runtime posture).
 */
import { DatabaseSync } from 'node:sqlite';

import {
  ConfigError,
  MemoryAdmissionScheduler,
  type AdmissionRecovery,
  type AdmissionRequest,
  type AdmissionReservation,
  type AdmissionScheduler,
  type AdmissionState,
  type AdmissionTicket,
  type AdmissionTicketDecision,
  type MemoryAdmissionOptions,
} from '@rulvar/core';

const wallClock: () => number = Date.now.bind(globalThis);

export interface SqliteAdmissionSchedulerOptions {
  /** Database file path; ':memory:' is single-process only. */
  path: string;
  /** The admission configuration (levels, weights, lease ttl). */
  config: Omit<MemoryAdmissionOptions, 'state' | 'now'>;
  /** Several schedulers may share one file under distinct ids. */
  schedulerId?: string;
  /** Injectable clock for tests; default the wall clock. */
  now?: () => number;
}

export class SqliteAdmissionScheduler implements AdmissionScheduler {
  private readonly db: DatabaseSync;
  private readonly config: Omit<MemoryAdmissionOptions, 'state' | 'now'>;
  private readonly schedulerId: string;
  private readonly now: () => number;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(options: SqliteAdmissionSchedulerOptions) {
    if (typeof options.path !== 'string' || options.path === '') {
      throw new ConfigError('SqliteAdmissionSchedulerOptions.path must be a nonempty string');
    }
    this.db = new DatabaseSync(options.path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS adm_state (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
    `);
    this.config = options.config;
    this.schedulerId = options.schedulerId ?? 'default';
    this.now = options.now ?? wallClock;
  }

  close(): void {
    this.db.close();
  }

  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.chain.then(fn);
    this.chain = next.catch(() => undefined);
    return next;
  }

  /** One lifecycle call: load, hydrate, act, persist, atomically. */
  private withCore<T>(fn: (core: MemoryAdmissionScheduler) => Promise<T>): Promise<T> {
    return this.serialize(async () => {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const row = this.db
          .prepare('SELECT version, payload FROM adm_state WHERE id = ?')
          .get(this.schedulerId) as { version: number | bigint; payload: string } | undefined;
        const state = row === undefined ? undefined : (JSON.parse(row.payload) as AdmissionState);
        const core = new MemoryAdmissionScheduler({
          ...this.config,
          now: this.now,
          ...(state === undefined ? {} : { state }),
        });
        const result = await fn(core);
        const payload = JSON.stringify(core.snapshot());
        if (row === undefined) {
          this.db
            .prepare('INSERT INTO adm_state (id, version, payload) VALUES (?, 1, ?)')
            .run(this.schedulerId, payload);
        } else {
          this.db
            .prepare('UPDATE adm_state SET version = version + 1, payload = ? WHERE id = ?')
            .run(payload, this.schedulerId);
        }
        this.db.exec('COMMIT');
        return result;
      } catch (thrown) {
        try {
          this.db.exec('ROLLBACK');
        } catch {
          // The transaction may already be gone; the throw below wins.
        }
        throw thrown;
      }
    });
  }

  enqueue(request: AdmissionRequest, opId: string): Promise<AdmissionTicketDecision> {
    return this.withCore((core) => core.enqueue(request, opId));
  }

  recover(unitId: string, generation: string, opId: string): Promise<AdmissionRecovery> {
    return this.withCore((core) => core.recover(unitId, generation, opId));
  }

  renew(unitId: string, generation: string, opId: string): Promise<void> {
    return this.withCore((core) => core.renew(unitId, generation, opId));
  }

  checkpointCover(
    unitId: string,
    generation: string,
    cover: AdmissionReservation,
    opId: string,
  ): Promise<void> {
    return this.withCore((core) => core.checkpointCover(unitId, generation, cover, opId));
  }

  release(
    unitId: string,
    generation: string,
    actuals: AdmissionReservation,
    opId: string,
  ): Promise<void> {
    return this.withCore((core) => core.release(unitId, generation, actuals, opId));
  }

  cancel(unitId: string, generation: string, opId: string): Promise<void> {
    return this.withCore((core) => core.cancel(unitId, generation, opId));
  }

  pump(opId: string): Promise<AdmissionTicket[]> {
    return this.withCore((core) => core.pump(opId));
  }
}
