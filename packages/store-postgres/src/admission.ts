/**
 * PostgresAdmissionScheduler (plan 45, rfcs/admission.md section 9):
 * the durable admission SPI over a postgres schema, exactly the sqlite
 * shape: the scheduler state as ONE plain-JSON document, hydrated into
 * the pure core per lifecycle call inside a transaction serialized by
 * a schema-scoped advisory lock, so a fleet of processes over the same
 * schema acts as the RFC's single scheduler with durable state and
 * deterministic ordering.
 */
import pg from 'pg';

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
const LOCK_SEED = 0x52_55_4c_41;

export interface PostgresAdmissionSchedulerOptions {
  url?: string;
  pool?: pg.Pool;
  schema?: string;
  config: Omit<MemoryAdmissionOptions, 'state' | 'now'>;
  schedulerId?: string;
  now?: () => number;
  max?: number;
}

export class PostgresAdmissionScheduler implements AdmissionScheduler {
  private readonly pool: pg.Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly config: Omit<MemoryAdmissionOptions, 'state' | 'now'>;
  private readonly schedulerId: string;
  private readonly now: () => number;
  private boot: Promise<void> | undefined;

  constructor(options: PostgresAdmissionSchedulerOptions) {
    if (options.pool === undefined && (options.url === undefined || options.url === '')) {
      throw new ConfigError('PostgresAdmissionScheduler requires a url or a pool');
    }
    this.pool =
      options.pool ?? new pg.Pool({ connectionString: options.url, max: options.max ?? 2 });
    this.ownsPool = options.pool === undefined;
    this.schema = options.schema ?? 'public';
    if (!/^[a-z_][a-z0-9_]*$/u.test(this.schema)) {
      throw new ConfigError(
        `PostgresAdmissionScheduler schema '${this.schema}' must match [a-z_][a-z0-9_]*`,
      );
    }
    this.config = options.config;
    this.schedulerId = options.schedulerId ?? 'default';
    this.now = options.now ?? wallClock;
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  private table(): string {
    return `"${this.schema}".adm_state`;
  }

  private booted(): Promise<void> {
    this.boot ??= this.runBootstrap().catch((thrown: unknown) => {
      this.boot = undefined;
      throw thrown;
    });
    return this.boot;
  }

  private async runBootstrap(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
        `rulvar-adm-boot:${this.schema}`,
        LOCK_SEED,
      ]);
      if (this.schema !== 'public') {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
      }
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.table()} (
          id TEXT PRIMARY KEY,
          version BIGINT NOT NULL,
          payload TEXT NOT NULL
        );
      `);
      await client.query('COMMIT');
    } catch (thrown) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw thrown;
    } finally {
      client.release();
    }
  }

  private async withCore<T>(fn: (core: MemoryAdmissionScheduler) => Promise<T>): Promise<T> {
    await this.booted();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
        `rulvar-adm:${this.schema}:${this.schedulerId}`,
        LOCK_SEED,
      ]);
      const rows = (
        await client.query(`SELECT payload FROM ${this.table()} WHERE id = $1`, [this.schedulerId])
      ).rows as Array<{ payload: string }>;
      const state =
        rows[0] === undefined ? undefined : (JSON.parse(rows[0].payload) as AdmissionState);
      const core = new MemoryAdmissionScheduler({
        ...this.config,
        now: this.now,
        ...(state === undefined ? {} : { state }),
      });
      const result = await fn(core);
      const payload = JSON.stringify(core.snapshot());
      await client.query(
        `INSERT INTO ${this.table()} (id, version, payload) VALUES ($1, 1, $2)
           ON CONFLICT (id) DO UPDATE SET version = ${this.table()}.version + 1, payload = $2`,
        [this.schedulerId, payload],
      );
      await client.query('COMMIT');
      return result;
    } catch (thrown) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw thrown;
    } finally {
      client.release();
    }
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

  rebind(
    unitId: string,
    generation: string,
    target: { scope: NonNullable<AdmissionRequest['scope']> },
    opId: string,
  ): Promise<AdmissionTicketDecision> {
    return this.withCore((core) => core.rebind(unitId, generation, target, opId));
  }

  pump(opId: string): Promise<AdmissionTicket[]> {
    return this.withCore((core) => core.pump(opId));
  }
}
