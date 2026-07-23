/**
 * The adversarial multi-process soak (the fenced run state RFC, phase
 * 3's last open item): real OS processes storm one store file through
 * EVERY write surface the `fencedWrites` capability names (journal
 * append, meta write, transcript blob put and delete, fenced run
 * deletion, renew, release), with injected stalls past the lease ttl so
 * takeovers happen while superseded holders are still alive and
 * probing. The harness then rebuilds the ONE serial history the fencing
 * epochs promise (accepted mutations ordered by `(epoch, counter)`) and
 * diffs it against the actual store state: any stale acceptance, lost
 * accepted write, epoch inversion, or divergent final byte is a
 * violation.
 *
 * Three pieces, split so the child side never needs the referee:
 * - {@link runSoakWriter} is the writer protocol one child process runs
 *   against the consumer-constructed store (the consumer's writer
 *   script is a few lines: construct the store over
 *   `soakWriterConfigFromEnv().storePath`, call `runSoakWriter`, exit).
 *   Constructing the store bare, concurrently with every other writer,
 *   is deliberately part of the exercise: a store whose boot dies under
 *   concurrent construction fails the soak in the referee's exit-code
 *   check before any fencing is probed.
 * - {@link verifySoakHistory} is the pure referee: given the merged
 *   report events and a fixture opened AFTER the storm, it returns
 *   every violation as a descriptive string (empty array = the promise
 *   held).
 * - {@link runMultiProcessSoak} orchestrates: spawns the writers, stops
 *   the storm once the activity quorum is met (so slow machines run
 *   longer instead of asserting on thin coverage), waits for clean
 *   exits, verifies, and throws one Error naming every violation.
 *
 * The probe sweep defeats the A5 monotonic-seq mask on purpose: a stale
 * append is attempted with a FRESH tail seq (re-loading the journal
 * first), so the fencing check is the only thing standing between the
 * write and the journal.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  JournalOrderViolation,
  LeaseHeldError,
  type JournalEntry,
  type Lease,
  type MetaLookupStore,
  type RunMeta,
} from '@rulvar/core';
import type { FencedTranscriptsFixture } from './fenced-transcripts.js';

/** Accepted-mutation surfaces of the soaked run (serial-history members). */
export type SoakAcceptSurface = 'marker' | 'append' | 'meta' | 'blob-put' | 'blob-delete';

/** Surfaces of the stale-probe sweep; every one must reject typed. */
export type SoakProbeSurface =
  'append' | 'meta' | 'blob-put' | 'blob-delete' | 'run-delete' | 'renew' | 'cross-run' | 'release';

/** One JSONL line of a writer's report file (`w` is the writer index). */
export type SoakEvent =
  | { t: 'grant'; w: number; epoch: number }
  | {
      t: 'accept';
      w: number;
      surface: SoakAcceptSurface;
      epoch: number;
      counter: number;
      nonce: string;
      seq?: number;
      ref?: string;
    }
  | { t: 'victim'; w: number; epoch: number; vid: string }
  | { t: 'stale-reject'; w: number; surface: SoakProbeSurface; epoch: number }
  | { t: 'stale-accept'; w: number; surface: string; epoch: number }
  | { t: 'live-cross-reject'; w: number; epoch: number }
  | { t: 'fence-kick'; w: number; surface: string; epoch: number }
  | { t: 'busy'; w: number; surface: string }
  | { t: 'renewed'; w: number; epoch: number }
  | { t: 'released'; w: number; epoch: number }
  | { t: 'stall'; w: number; epoch: number }
  | { t: 'victim-abandoned'; w: number; vid: string; surface: string; why: string }
  | { t: 'error'; w: number; surface: string; message: string }
  | { t: 'fatal'; w: number; message: string }
  | { t: 'done'; w: number };

/**
 * The per-writer contract, serialized as JSON into the
 * `RULVAR_SOAK_CONFIG` environment variable of each spawned writer.
 */
export interface SoakWriterConfig {
  /** Store location the writer script constructs its store over. */
  storePath: string;
  /** The soaked run id every writer competes for. */
  runId: string;
  /** This writer's index (0-based; also its report identity). */
  writer: number;
  /** Lease ttl the writer's store MUST be constructed with. */
  ttlMs: number;
  /** Deterministic PRNG seed (writers derive per-index streams). */
  seed: number;
  /** JSONL report file this writer appends its events to. */
  reportPath: string;
  /** The storm ends when this file exists. */
  stopPath: string;
}

/** Consumer hooks for {@link runSoakWriter}. */
export interface SoakWriterHooks {
  /**
   * Classifies a thrown store error as transient contention worth an
   * in-place retry (for `SqliteStore`, the driver's SQLITE_BUSY under
   * `BEGIN IMMEDIATE`). Typed `LeaseHeldError` and
   * `JournalOrderViolation` are classified by the protocol itself and
   * never reach this hook. Default: nothing is retryable.
   */
  retryable?: (thrown: unknown) => boolean;
}

/**
 * Minimum activity the storm must reach before the referee stops it:
 * run-until-quorum makes the soak adaptive (a slow CI machine storms
 * longer, it never asserts on thin coverage).
 */
export interface SoakQuorum {
  /** Distinct fencing epochs granted (each one is a takeover). */
  epochs: number;
  /** Typed rejections observed by stale probe sweeps, all surfaces. */
  staleRejects: number;
  /** Accepted journal appends (markers included). */
  appends: number;
  /** Accepted meta writes. */
  metaWrites: number;
  /** Accepted transcript blob puts. */
  blobPuts: number;
  /** Accepted transcript blob deletes. */
  blobDeletes: number;
  /** Full fenced-deletion cycles on side runs. */
  victimCycles: number;
  /** Typed rejections of a live lease guarding a foreign run. */
  liveCrossRejects: number;
}

/** Default quorum: a few seconds of storm on a developer machine. */
export const DEFAULT_SOAK_QUORUM: SoakQuorum = {
  epochs: 4,
  staleRejects: 16,
  appends: 8,
  metaWrites: 5,
  blobPuts: 5,
  blobDeletes: 1,
  victimCycles: 1,
  liveCrossRejects: 1,
};

/** Activity counters derived from the merged report events. */
export interface SoakActivity {
  epochs: number;
  staleRejects: number;
  appends: number;
  metaWrites: number;
  blobPuts: number;
  blobDeletes: number;
  victimCycles: number;
  liveCrossRejects: number;
  busyRetries: number;
}

export interface MultiProcessSoakOptions {
  /**
   * Absolute path of the consumer's writer script. It must construct
   * the store over `soakWriterConfigFromEnv().storePath` (bare, no
   * retry wrapper: concurrent boot is part of the promise under test),
   * call {@link runSoakWriter}, and exit 0.
   */
  writerScript: string;
  /** Scratch directory for the store file, reports, and stop file. */
  dir: string;
  /**
   * Opens the referee's own fixture over the SAME store location once
   * the storm has ended, for state verification.
   */
  openStore: (storePath: string) => Promise<FencedTranscriptsFixture> | FencedTranscriptsFixture;
  /** Closes what {@link openStore} opened. */
  closeStore?: (fixture: FencedTranscriptsFixture) => void | Promise<void>;
  /** Store location; default `join(dir, 'soak.db')`. */
  storePath?: string;
  /** Concurrent writer processes; default 3. */
  writers?: number;
  /** Lease ttl for the storm; default 250 ms (short = many takeovers). */
  ttlMs?: number;
  /** PRNG seed; default 1. */
  seed?: number;
  /** Activity quorum overrides; see {@link DEFAULT_SOAK_QUORUM}. */
  quorum?: Partial<SoakQuorum>;
  /** Hard wall-clock cap on the storm; default 60000 ms. */
  capMs?: number;
  /** Extra environment for the writer processes. */
  env?: Record<string, string>;
  /** Extra `node` arguments placed before the writer script. */
  execArgv?: string[];
}

/** What a green soak returns (the storm's observed coverage). */
export interface MultiProcessSoakResult {
  activity: SoakActivity;
  stormMs: number;
  journalEntries: number;
  events: SoakEvent[];
}

const SOAK_CONFIG_ENV = 'RULVAR_SOAK_CONFIG';

/** Reads the writer contract a referee serialized into the child env. */
export function soakWriterConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): SoakWriterConfig {
  const raw = env[SOAK_CONFIG_ENV];
  if (raw === undefined) {
    throw new Error(
      `store-conformance multi-process-soak: the writer expects its config in ${SOAK_CONFIG_ENV}`,
    );
  }
  return JSON.parse(raw) as SoakWriterConfig;
}

// Bound at module load like the reference stores' clocks: the soak
// measures real elapsed wall time and must not capture a test's patched
// Date.now.
const wallClock: () => number = Date.now.bind(globalThis);

/** Deterministic PRNG (mulberry32): the soak never uses Math.random. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function soakEntry(seq: number, nonce: string): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `soak-${nonce}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { soak: { nonce } },
    spanId: 'soak-span',
    startedAt: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
  };
}

const soakBlob = (nonce: string): Uint8Array =>
  new TextEncoder().encode(JSON.stringify({ soak: { nonce } }));

const nonceOfBlob = (bytes: Uint8Array | null): string | undefined => {
  if (bytes === null) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { soak?: { nonce?: string } };
    return parsed.soak?.nonce;
  } catch {
    return undefined;
  }
};

const nonceOfEntry = (entry: JournalEntry): string | undefined =>
  (entry.value as { soak?: { nonce?: string } } | undefined)?.soak?.nonce;

async function readMeta(
  journal: FencedTranscriptsFixture['journal'],
  runId: string,
): Promise<RunMeta | undefined> {
  const lookup = journal as Partial<MetaLookupStore>;
  if (typeof lookup.getMeta === 'function') {
    return lookup.getMeta(runId);
  }
  return (await journal.listRuns()).find((m) => m.runId === runId);
}

type OpOutcome = 'ok' | 'lease' | 'order';

/**
 * The writer protocol: run it in a spawned process against the
 * consumer-constructed store pair. Appends every observation to the
 * report file; protocol-level anomalies (a stale acceptance, an
 * unexpected error class) are logged as events for the referee, never
 * thrown, so one writer's finding cannot vanish with its process.
 */
export async function runSoakWriter(
  fixture: FencedTranscriptsFixture,
  config: SoakWriterConfig,
  hooks: SoakWriterHooks = {},
): Promise<void> {
  const { journal, transcripts } = fixture;
  const retryable = hooks.retryable ?? (() => false);
  const owner = `soak-w${config.writer}`;
  const rnd = prng(config.seed * 1000003 + config.writer * 7919);
  const log = (event: SoakEvent): void => {
    appendFileSync(config.reportPath, `${JSON.stringify(event)}\n`);
  };
  const stopRequested = (): boolean => existsSync(config.stopPath);

  const tailSeq = async (): Promise<number> => {
    let max = 0;
    for (const entry of await journal.load(config.runId)) {
      if (Number.isFinite(entry.seq) && entry.seq > max) {
        max = entry.seq;
      }
    }
    return max;
  };

  // Retries an op through transient contention; classifies the typed
  // outcomes; logs and rethrows anything else.
  const attempt = async (surface: string, op: () => Promise<unknown>): Promise<OpOutcome> => {
    for (let round = 0; round < 500; round += 1) {
      try {
        await op();
        return 'ok';
      } catch (thrown) {
        if (thrown instanceof LeaseHeldError) {
          return 'lease';
        }
        if (thrown instanceof JournalOrderViolation) {
          return 'order';
        }
        if (retryable(thrown)) {
          log({ t: 'busy', w: config.writer, surface });
          await sleep(1 + Math.floor(rnd() * 3));
          continue;
        }
        log({ t: 'error', w: config.writer, surface, message: String(thrown) });
        throw thrown;
      }
    }
    log({ t: 'error', w: config.writer, surface, message: 'transient retries exhausted' });
    throw new Error(`soak writer: transient retries exhausted on ${surface}`);
  };

  // The stale-probe sweep: this lease is dead (expired by an injected
  // stall, or fenced out by a takeover). EVERY surface must reject with
  // the typed LeaseHeldError; any acceptance is a fencing violation.
  const staleSweep = async (deadLease: Lease): Promise<void> => {
    const probes: Array<[SoakProbeSurface, () => Promise<unknown>]> = [
      [
        'append',
        async () => {
          // Fresh tail on purpose: with a stale tail the A5 monotonic
          // seq guard would reject first and mask a fencing hole.
          const tail = await tailSeq();
          await journal.append(
            config.runId,
            soakEntry(tail + 1, `stale-w${config.writer}-e${deadLease.epoch}`),
            deadLease,
          );
        },
      ],
      [
        'meta',
        () =>
          journal.putMeta(
            { runId: config.runId, status: 'cancelled', updatedAt: `stale-w${config.writer}` },
            deadLease,
          ),
      ],
      [
        'blob-put',
        () =>
          transcripts.put(
            `${config.runId}/blob-0`,
            soakBlob(`stale-w${config.writer}-e${deadLease.epoch}`),
            deadLease,
          ),
      ],
      ['blob-delete', () => transcripts.delete(`${config.runId}/blob-0`, deadLease)],
      ['run-delete', () => journal.delete(config.runId, deadLease)],
      ['renew', () => journal.renew(deadLease)],
      [
        'cross-run',
        () => transcripts.put('soak-other/blob', soakBlob(`cross-w${config.writer}`), deadLease),
      ],
      ['release', () => journal.release(deadLease)],
    ];
    for (const [surface, op] of probes) {
      let outcome: OpOutcome;
      try {
        outcome = await attempt(`stale-${surface}`, op);
      } catch {
        continue; // already logged as an error event
      }
      if (outcome === 'ok') {
        log({ t: 'stale-accept', w: config.writer, surface, epoch: deadLease.epoch });
      } else if (outcome === 'lease') {
        log({ t: 'stale-reject', w: config.writer, surface, epoch: deadLease.epoch });
      } else {
        log({
          t: 'error',
          w: config.writer,
          surface: `stale-${surface}`,
          message: 'JournalOrderViolation where the fence should reject first',
        });
      }
    }
  };

  // One full fenced-deletion cycle on a side run under ITS OWN lease:
  // the soaked run's journal never shrinks, so accepted deletion (the
  // RFC's deletion surface) gets disposable runs.
  let victimSeq = 0;
  const victimCycle = async (epoch: number): Promise<OpOutcome> => {
    const vid = `victim-w${config.writer}-e${epoch}-${victimSeq}`;
    victimSeq += 1;
    let vlease: Lease | undefined;
    const acquired = await attempt('victim-acquire', async () => {
      vlease = await journal.acquire(vid, owner);
    });
    if (acquired !== 'ok' || vlease === undefined) {
      log({
        t: 'victim-abandoned',
        w: config.writer,
        vid,
        surface: 'victim-acquire',
        why: acquired,
      });
      return acquired;
    }
    const lease = vlease;
    const steps: Array<[string, () => Promise<unknown>]> = [
      ['victim-append', () => journal.append(vid, soakEntry(1, `${vid}-entry`), lease)],
      [
        'victim-meta',
        () => journal.putMeta({ runId: vid, status: 'running', updatedAt: `soak-${vid}` }, lease),
      ],
      ['victim-blob', () => transcripts.put(`${vid}/blob`, soakBlob(vid), lease)],
      ['victim-blob-delete', () => transcripts.delete(`${vid}/blob`, lease)],
      ['victim-delete', () => journal.delete(vid, lease)],
    ];
    for (const [surface, op] of steps) {
      const outcome = await attempt(surface, op);
      if (outcome !== 'ok') {
        log({ t: 'victim-abandoned', w: config.writer, vid, surface, why: outcome });
        return outcome;
      }
    }
    log({ t: 'victim', w: config.writer, epoch, vid });
    return 'ok';
  };

  const tenure = async (): Promise<void> => {
    let lease: Lease;
    try {
      lease = await journal.acquire(config.runId, owner);
    } catch (thrown) {
      if (thrown instanceof LeaseHeldError || retryable(thrown)) {
        await sleep(3 + Math.floor(rnd() * 12));
        return;
      }
      log({ t: 'error', w: config.writer, surface: 'acquire', message: String(thrown) });
      throw thrown;
    }
    const epoch = lease.epoch;
    log({ t: 'grant', w: config.writer, epoch });
    let tail = await tailSeq();
    let counter = 0;
    let alive = true;
    const nonce = (): string => `w${config.writer}-e${epoch}-c${counter}`;
    const accepted = (
      surface: SoakAcceptSurface,
      extra: { seq?: number; ref?: string } = {},
    ): void => {
      log({ t: 'accept', w: config.writer, surface, epoch, counter, nonce: nonce(), ...extra });
      counter += 1;
    };

    // The first act as owner is the marker append: any stale landing
    // after this point shows as an epoch inversion along the journal.
    {
      const seq = tail + 1;
      const outcome = await attempt('marker', () =>
        journal.append(config.runId, soakEntry(seq, nonce()), lease),
      );
      if (outcome === 'ok') {
        tail = seq;
        accepted('marker', { seq });
      } else if (outcome === 'lease') {
        log({ t: 'fence-kick', w: config.writer, surface: 'marker', epoch });
        await staleSweep(lease);
        return;
      } else {
        log({
          t: 'error',
          w: config.writer,
          surface: 'marker',
          message: 'JournalOrderViolation under a live lease',
        });
        return;
      }
    }

    const ops = 3 + Math.floor(rnd() * 6);
    for (let k = 0; k < ops && alive && !stopRequested(); k += 1) {
      const dice = rnd();
      if (dice < 0.3) {
        const seq = tail + 1;
        const outcome = await attempt('append', () =>
          journal.append(config.runId, soakEntry(seq, nonce()), lease),
        );
        if (outcome === 'ok') {
          tail = seq;
          accepted('append', { seq });
        } else if (outcome === 'lease') {
          log({ t: 'fence-kick', w: config.writer, surface: 'append', epoch });
          alive = false;
        } else {
          log({
            t: 'error',
            w: config.writer,
            surface: 'append',
            message: 'JournalOrderViolation under a live lease',
          });
          alive = false;
        }
      } else if (dice < 0.5) {
        const meta: RunMeta & { soak: { nonce: string } } = {
          runId: config.runId,
          status: 'running',
          updatedAt: `soak-${nonce()}`,
          soak: { nonce: nonce() },
        };
        const outcome = await attempt('meta', () => journal.putMeta(meta, lease));
        if (outcome === 'ok') {
          accepted('meta');
        } else {
          log({ t: 'fence-kick', w: config.writer, surface: 'meta', epoch });
          alive = false;
        }
      } else if (dice < 0.65) {
        const ref = `${config.runId}/blob-${Math.floor(rnd() * 4)}`;
        const outcome = await attempt('blob-put', () =>
          transcripts.put(ref, soakBlob(nonce()), lease),
        );
        if (outcome === 'ok') {
          accepted('blob-put', { ref });
        } else {
          log({ t: 'fence-kick', w: config.writer, surface: 'blob-put', epoch });
          alive = false;
        }
      } else if (dice < 0.75) {
        const ref = `${config.runId}/blob-${Math.floor(rnd() * 4)}`;
        const outcome = await attempt('blob-delete', () => transcripts.delete(ref, lease));
        if (outcome === 'ok') {
          accepted('blob-delete', { ref });
        } else {
          log({ t: 'fence-kick', w: config.writer, surface: 'blob-delete', epoch });
          alive = false;
        }
      } else if (dice < 0.85) {
        const outcome = await victimCycle(epoch);
        if (outcome === 'lease') {
          log({ t: 'fence-kick', w: config.writer, surface: 'victim', epoch });
          alive = false;
        }
      } else if (dice < 0.93) {
        const outcome = await attempt('renew', () => journal.renew(lease));
        if (outcome === 'ok') {
          log({ t: 'renewed', w: config.writer, epoch });
        } else {
          log({ t: 'fence-kick', w: config.writer, surface: 'renew', epoch });
          alive = false;
        }
      } else {
        // A LIVE lease guarding a foreign run must reject just like a
        // stale one: the run-match rule.
        const outcome = await attempt('cross-run-live', () =>
          transcripts.put('soak-other/blob', soakBlob(nonce()), lease),
        );
        if (outcome === 'lease') {
          log({ t: 'live-cross-reject', w: config.writer, epoch });
        } else if (outcome === 'ok') {
          log({ t: 'stale-accept', w: config.writer, surface: 'cross-run-live', epoch });
        }
      }
    }

    if (!alive) {
      await staleSweep(lease);
      return;
    }
    if (rnd() < 0.5) {
      // The injected stall: sleep past the ttl without renewing, then
      // probe with the now-dead lease across every surface.
      log({ t: 'stall', w: config.writer, epoch });
      await sleep(Math.ceil(config.ttlMs * 1.4));
      await staleSweep(lease);
      return;
    }
    const outcome = await attempt('release', () => journal.release(lease));
    if (outcome === 'ok') {
      log({ t: 'released', w: config.writer, epoch });
    } else {
      log({ t: 'fence-kick', w: config.writer, surface: 'release', epoch });
      await staleSweep(lease);
    }
  };

  try {
    while (!stopRequested()) {
      await tenure();
    }
    log({ t: 'done', w: config.writer });
  } catch (thrown) {
    log({ t: 'fatal', w: config.writer, message: String(thrown) });
    throw thrown;
  }
}

/** Parses one report file, tolerating a torn trailing line. */
export function parseSoakReport(path: string): SoakEvent[] {
  if (!existsSync(path)) {
    return [];
  }
  const events: SoakEvent[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    try {
      events.push(JSON.parse(line) as SoakEvent);
    } catch {
      // A line being appended mid-read; the post-storm parse sees it whole.
    }
  }
  return events;
}

/** Derives the activity counters the quorum is judged against. */
export function countSoakActivity(events: readonly SoakEvent[]): SoakActivity {
  const epochs = new Set<number>();
  const activity: SoakActivity = {
    epochs: 0,
    staleRejects: 0,
    appends: 0,
    metaWrites: 0,
    blobPuts: 0,
    blobDeletes: 0,
    victimCycles: 0,
    liveCrossRejects: 0,
    busyRetries: 0,
  };
  for (const event of events) {
    switch (event.t) {
      case 'grant':
        epochs.add(event.epoch);
        break;
      case 'stale-reject':
        activity.staleRejects += 1;
        break;
      case 'accept':
        if (event.surface === 'marker' || event.surface === 'append') {
          activity.appends += 1;
        } else if (event.surface === 'meta') {
          activity.metaWrites += 1;
        } else if (event.surface === 'blob-put') {
          activity.blobPuts += 1;
        } else {
          activity.blobDeletes += 1;
        }
        break;
      case 'victim':
        activity.victimCycles += 1;
        break;
      case 'live-cross-reject':
        activity.liveCrossRejects += 1;
        break;
      case 'busy':
        activity.busyRetries += 1;
        break;
      default:
        break;
    }
  }
  activity.epochs = epochs.size;
  return activity;
}

function quorumMet(activity: SoakActivity, quorum: SoakQuorum): boolean {
  return (
    activity.epochs >= quorum.epochs &&
    activity.staleRejects >= quorum.staleRejects &&
    activity.appends >= quorum.appends &&
    activity.metaWrites >= quorum.metaWrites &&
    activity.blobPuts >= quorum.blobPuts &&
    activity.blobDeletes >= quorum.blobDeletes &&
    activity.victimCycles >= quorum.victimCycles &&
    activity.liveCrossRejects >= quorum.liveCrossRejects
  );
}

/**
 * The pure referee: rebuilds the serial history from the merged report
 * events and diffs it against the actual post-storm store state.
 * Returns every violation as a descriptive string; an empty array means
 * the fencing promise held for the whole storm.
 */
export async function verifySoakHistory(
  fixture: FencedTranscriptsFixture,
  events: readonly SoakEvent[],
  runId: string,
): Promise<string[]> {
  const violations: string[] = [];

  // Direct violations logged by the writers themselves.
  for (const event of events) {
    if (event.t === 'stale-accept') {
      violations.push(
        `writer ${event.w}: STALE ACCEPT on ${event.surface} under epoch ${event.epoch}`,
      );
    } else if (event.t === 'error') {
      violations.push(`writer ${event.w}: unexpected error on ${event.surface}: ${event.message}`);
    } else if (event.t === 'fatal') {
      violations.push(`writer ${event.w}: fatal: ${event.message}`);
    }
  }

  // Epochs are granted exactly once, and each writer's grants increase.
  const grantee = new Map<number, number>();
  const lastGrant = new Map<number, number>();
  for (const event of events) {
    if (event.t !== 'grant') {
      continue;
    }
    if (grantee.has(event.epoch)) {
      violations.push(
        `epoch ${event.epoch} granted twice (writers ${String(grantee.get(event.epoch))} and ${event.w})`,
      );
    }
    grantee.set(event.epoch, event.w);
    const prior = lastGrant.get(event.w) ?? 0;
    if (event.epoch <= prior) {
      violations.push(
        `writer ${event.w}: grant epochs not increasing (${prior} then ${event.epoch})`,
      );
    }
    lastGrant.set(event.w, event.epoch);
  }

  // Accepted mutations belong to the epoch's grantee, and (epoch,
  // counter) positions are unique: the serial history is well formed.
  const accepts = events.filter(
    (event): event is Extract<SoakEvent, { t: 'accept' }> => event.t === 'accept',
  );
  for (const event of accepts) {
    if (grantee.get(event.epoch) !== event.w) {
      violations.push(
        `writer ${event.w} accepted a mutation under epoch ${event.epoch} granted to ` +
          `${String(grantee.get(event.epoch))}`,
      );
    }
  }
  const serial = [...accepts].sort((a, b) => a.epoch - b.epoch || a.counter - b.counter);
  const positions = new Set<string>();
  for (const event of serial) {
    const position = `${event.epoch}:${event.counter}`;
    if (positions.has(position)) {
      violations.push(`duplicate serial position ${position}`);
    }
    positions.add(position);
  }

  // Journal equivalence: the actual journal IS the serial history's
  // appends, nonce for nonce, seq contiguous from 1, epochs
  // non-decreasing.
  const journal = await fixture.journal.load(runId);
  const expectedAppends = serial.filter(
    (event) => event.surface === 'marker' || event.surface === 'append',
  );
  if (journal.length !== expectedAppends.length) {
    violations.push(
      `journal has ${journal.length} entries, the serial history accepted ${expectedAppends.length}`,
    );
  }
  let lastEpoch = 0;
  const comparable = Math.min(journal.length, expectedAppends.length);
  for (let i = 0; i < comparable; i += 1) {
    const actual = journal[i];
    const expected = expectedAppends[i];
    if (nonceOfEntry(actual) !== expected.nonce) {
      violations.push(
        `journal[${i}] carries nonce ${String(nonceOfEntry(actual))}, expected ${expected.nonce}`,
      );
      break;
    }
    if (actual.seq !== i + 1) {
      violations.push(`journal[${i}] seq ${actual.seq} breaks the contiguous 1..N order`);
    }
    if (expected.seq !== i + 1) {
      violations.push(
        `accepted append ${expected.nonce} logged seq ${String(expected.seq)}, expected ${i + 1}`,
      );
    }
    if (expected.epoch < lastEpoch) {
      violations.push(
        `epoch inversion along the journal at index ${i}: ${expected.epoch} after ${lastEpoch}`,
      );
    }
    lastEpoch = Math.max(lastEpoch, expected.epoch);
  }

  // Meta equivalence: the final row is the serial history's last
  // accepted meta write.
  const nonceOfMeta = (meta: RunMeta | undefined): string | undefined =>
    (meta as { soak?: { nonce?: string } } | undefined)?.soak?.nonce;
  const metaAccepts = serial.filter((event) => event.surface === 'meta');
  if (metaAccepts.length > 0) {
    const got = nonceOfMeta(await readMeta(fixture.journal, runId));
    const want = metaAccepts[metaAccepts.length - 1].nonce;
    if (got !== want) {
      violations.push(`final meta nonce ${String(got)} is not the last accepted ${want}`);
    }
  }

  // Blob equivalence: replay puts and deletes per ref in serial order.
  const expectedBlobs = new Map<string, string>();
  for (const event of serial) {
    if (event.surface === 'blob-put' && event.ref !== undefined) {
      expectedBlobs.set(event.ref, event.nonce);
    } else if (event.surface === 'blob-delete' && event.ref !== undefined) {
      expectedBlobs.delete(event.ref);
    }
  }
  const listed = await fixture.transcripts.list(runId);
  const expectedRefs = [...expectedBlobs.keys()].sort();
  if (JSON.stringify(listed) !== JSON.stringify(expectedRefs)) {
    violations.push(
      `blob list ${JSON.stringify(listed)} diverges from the serial history ${JSON.stringify(expectedRefs)}`,
    );
  }
  for (const [ref, want] of expectedBlobs) {
    const got = nonceOfBlob(await fixture.transcripts.get(ref));
    if (got !== want) {
      violations.push(`blob ${ref} carries nonce ${String(got)}, expected ${want}`);
    }
  }
  const foreign = await fixture.transcripts.list('soak-other');
  if (foreign.length !== 0) {
    violations.push(`cross-run writes leaked into soak-other: ${JSON.stringify(foreign)}`);
  }

  // Victim runs that completed their fenced-deletion cycle are gone.
  for (const event of events) {
    if (event.t !== 'victim') {
      continue;
    }
    const entries = await fixture.journal.load(event.vid);
    const meta = await readMeta(fixture.journal, event.vid);
    const blobs = await fixture.transcripts.list(event.vid);
    if (entries.length !== 0 || meta !== undefined || blobs.length !== 0) {
      violations.push(
        `victim ${event.vid} not fully deleted: ${entries.length} entries, meta ` +
          `${JSON.stringify(meta)}, ${blobs.length} blobs`,
      );
    }
  }

  return violations;
}

/**
 * Spawns the writer processes, stops the storm at quorum (or at the
 * hard cap), verifies the serial history against the store, and throws
 * one Error naming every violation. The returned result is the storm's
 * observed coverage; assert on it if the caller wants a floor beyond
 * the quorum.
 */
export async function runMultiProcessSoak(
  options: MultiProcessSoakOptions,
): Promise<MultiProcessSoakResult> {
  const writers = options.writers ?? 3;
  const ttlMs = options.ttlMs ?? 250;
  const seed = options.seed ?? 1;
  const capMs = options.capMs ?? 60_000;
  const quorum: SoakQuorum = { ...DEFAULT_SOAK_QUORUM, ...options.quorum };
  const storePath = options.storePath ?? join(options.dir, 'soak.db');
  const stopPath = join(options.dir, 'soak-stop');
  const runId = 'soak-run';
  const reportPaths = Array.from({ length: writers }, (_, i) =>
    join(options.dir, `soak-report-${i}.jsonl`),
  );

  const children = reportPaths.map((reportPath, i) => {
    const config: SoakWriterConfig = {
      storePath,
      runId,
      writer: i,
      ttlMs,
      seed,
      reportPath,
      stopPath,
    };
    const child = spawn(process.execPath, [...(options.execArgv ?? []), options.writerScript], {
      env: {
        ...process.env,
        ...options.env,
        [SOAK_CONFIG_ENV]: JSON.stringify(config),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
    });
    const exit = new Promise<number | null>((resolve) => {
      child.on('exit', (code) => resolve(code));
    });
    return { child, exit, stderrOf: () => stderr };
  });

  const startedAt = wallClock();
  let capped = false;
  for (;;) {
    await sleep(100);
    const activity = countSoakActivity(reportPaths.flatMap((path) => parseSoakReport(path)));
    if (quorumMet(activity, quorum)) {
      break;
    }
    if (wallClock() - startedAt > capMs) {
      capped = true;
      break;
    }
  }
  writeFileSync(stopPath, '');

  // Writers check the stop file between tenures; a writer that cannot
  // reach that check is itself a finding, so the wait is bounded.
  const exitDeadline = wallClock() + 30_000;
  const codes = await Promise.all(
    children.map(async ({ child, exit }) => {
      const timeout = Math.max(1, exitDeadline - wallClock());
      const code = await Promise.race([exit, sleep(timeout).then(() => 'hung' as const)]);
      if (code === 'hung') {
        child.kill('SIGKILL');
        return 'hung' as const;
      }
      return code;
    }),
  );
  const stormMs = wallClock() - startedAt;

  const events = reportPaths.flatMap((path) => parseSoakReport(path));
  const activity = countSoakActivity(events);
  const violations: string[] = [];
  for (const [i, code] of codes.entries()) {
    if (code === 'hung') {
      violations.push(`writer ${i} did not exit after the stop signal (killed)`);
    } else if (code !== 0) {
      violations.push(
        `writer ${i} exited with code ${String(code)}: ${children[i]?.stderrOf().slice(0, 2000) ?? ''}`,
      );
    }
  }
  if (capped) {
    violations.push(
      `activity quorum not reached inside ${capMs} ms: ${JSON.stringify(activity)} versus ` +
        JSON.stringify(quorum),
    );
  }

  const fixture = await options.openStore(storePath);
  let journalEntries = 0;
  try {
    violations.push(...(await verifySoakHistory(fixture, events, runId)));
    journalEntries = (await fixture.journal.load(runId)).length;
  } finally {
    await options.closeStore?.(fixture);
  }

  if (violations.length > 0) {
    throw new Error(
      `store-conformance multi-process-soak: ${violations.length} violation(s)\n - ` +
        violations.join('\n - '),
    );
  }
  return { activity, stormMs, journalEntries, events };
}
