/**
 * In-process exercises of the multi-process soak pieces: the writer
 * protocol and the pure referee run against a small fake fenced store,
 * both in an honest configuration (zero violations) and with the
 * fencing DELIBERATELY broken (the soak must catch what it claims to
 * catch: a harness that cannot detect a violation proves nothing).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LeaseHeldError, type JournalEntry, type Lease, type RunMeta } from '@rulvar/core';

import type { FencedTranscriptsFixture } from './fenced-transcripts.js';
import {
  countSoakActivity,
  parseSoakReport,
  runSoakWriter,
  soakWriterConfigFromEnv,
  verifySoakHistory,
  type SoakEvent,
  type SoakWriterConfig,
} from './multi-process-soak.js';

const wallClock: () => number = Date.now.bind(globalThis);

/**
 * A minimal fenced store pair over Maps: leases with monotonic epochs
 * and expiry, fenced journal/meta/delete, and a transcript twin fencing
 * per the ref's leading path segment. `honest: false` skips the holder
 * check (the mutation always lands), which is exactly the class of bug
 * the soak exists to detect.
 */
function makeFakePair(options: { honest: boolean; ttlMs: number }): FencedTranscriptsFixture {
  const entries = new Map<string, JournalEntry[]>();
  const metas = new Map<string, RunMeta>();
  const leases = new Map<string, { owner: string; epoch: number; expiresAt: number }>();
  const epochs = new Map<string, number>();
  const blobs = new Map<string, Uint8Array>();
  const runOf = (ref: string): string => ref.split('/', 1)[0] ?? ref;
  const fenced = (lease: Lease | undefined, runId: string, mutate: () => void): void => {
    if (lease === undefined) {
      mutate();
      return;
    }
    if (lease.runId !== runId) {
      throw new LeaseHeldError(`lease for '${lease.runId}' cannot guard '${runId}'`);
    }
    if (options.honest) {
      const live = leases.get(lease.runId);
      if (
        live === undefined ||
        live.expiresAt <= wallClock() ||
        live.owner !== lease.owner ||
        live.epoch !== lease.epoch
      ) {
        throw new LeaseHeldError(`stale lease for '${lease.runId}'`);
      }
    }
    mutate();
  };
  const journal: FencedTranscriptsFixture['journal'] = {
    fencedWrites: true,
    // eslint-disable-next-line @typescript-eslint/require-await
    append: async (runId, e, lease) => {
      fenced(lease, runId, () => {
        entries.set(runId, [...(entries.get(runId) ?? []), e]);
      });
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    load: async (runId) => [...(entries.get(runId) ?? [])],
    // eslint-disable-next-line @typescript-eslint/require-await
    putMeta: async (m, lease) => {
      fenced(lease, m.runId, () => {
        metas.set(m.runId, m);
      });
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    listRuns: async () => [...metas.values()],
    // eslint-disable-next-line @typescript-eslint/require-await
    delete: async (runId, lease) => {
      fenced(lease, runId, () => {
        entries.delete(runId);
        metas.delete(runId);
        leases.delete(runId);
        epochs.delete(runId);
      });
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    acquire: async (runId, owner) => {
      const live = leases.get(runId);
      if (live !== undefined && live.expiresAt > wallClock()) {
        throw new LeaseHeldError(`run '${runId}' is leased by '${live.owner}'`);
      }
      const epoch = (epochs.get(runId) ?? 0) + 1;
      epochs.set(runId, epoch);
      leases.set(runId, { owner, epoch, expiresAt: wallClock() + options.ttlMs });
      return { runId, owner, epoch };
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    renew: async (l) => {
      fenced(l, l.runId, () => {
        const live = leases.get(l.runId);
        if (live !== undefined && live.owner === l.owner && live.epoch === l.epoch) {
          live.expiresAt = wallClock() + options.ttlMs;
        }
      });
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    release: async (l) => {
      fenced(l, l.runId, () => {
        const live = leases.get(l.runId);
        if (live !== undefined && live.owner === l.owner && live.epoch === l.epoch) {
          leases.delete(l.runId);
        }
      });
    },
  };
  const transcripts: FencedTranscriptsFixture['transcripts'] = {
    fencedWrites: true,
    // eslint-disable-next-line @typescript-eslint/require-await
    put: async (ref, blob, lease) => {
      fenced(lease, runOf(ref), () => {
        blobs.set(ref, new Uint8Array(blob));
      });
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    get: async (ref) => {
      const found = blobs.get(ref);
      return found === undefined ? null : new Uint8Array(found);
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    list: async (runId) =>
      [...blobs.keys()].filter((ref) => runOf(ref) === runId && ref !== runId).sort(),
    // eslint-disable-next-line @typescript-eslint/require-await
    delete: async (ref, lease) => {
      fenced(lease, runOf(ref), () => {
        blobs.delete(ref);
      });
    },
  };
  return { journal, transcripts };
}

function writerConfig(dir: string, ttlMs: number): SoakWriterConfig {
  return {
    storePath: join(dir, 'unused'),
    runId: 'soak-run',
    writer: 0,
    ttlMs,
    seed: 5,
    reportPath: join(dir, 'report-0.jsonl'),
    stopPath: join(dir, 'stop'),
  };
}

/** Runs the writer until `enough` says the report suffices, then stops it. */
async function runWriterUntil(
  fixture: FencedTranscriptsFixture,
  config: SoakWriterConfig,
  enough: (events: SoakEvent[]) => boolean,
): Promise<SoakEvent[]> {
  const writer = runSoakWriter(fixture, config);
  const deadline = wallClock() + 30_000;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    const events = parseSoakReport(config.reportPath);
    if (enough(events) || wallClock() > deadline) {
      writeFileSync(config.stopPath, '');
      break;
    }
  }
  await writer;
  return parseSoakReport(config.reportPath);
}

describe('multi-process soak pieces (in-process)', () => {
  it('the writer protocol over an honest fenced store leaves zero violations', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-soak-unit-'));
    const fixture = makeFakePair({ honest: true, ttlMs: 40 });
    const config = writerConfig(dir, 40);
    const events = await runWriterUntil(fixture, config, (seen) => {
      const activity = countSoakActivity(seen);
      return activity.epochs >= 3 && activity.staleRejects >= 8 && activity.appends >= 4;
    });
    const violations = await verifySoakHistory(fixture, events, config.runId);
    expect(violations).toEqual([]);
    const activity = countSoakActivity(events);
    expect(activity.epochs).toBeGreaterThanOrEqual(3);
    expect(activity.staleRejects).toBeGreaterThanOrEqual(8);
    // The serial history materialized: the journal is exactly the
    // accepted appends.
    const journal = await fixture.journal.load(config.runId);
    expect(journal.length).toBe(activity.appends);
  });

  it('a store whose fencing is broken is caught twice: stale accepts logged, state diverges', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-soak-broken-'));
    const fixture = makeFakePair({ honest: false, ttlMs: 40 });
    const config = writerConfig(dir, 40);
    const events = await runWriterUntil(fixture, config, (seen) =>
      seen.some((event) => event.t === 'stale-accept'),
    );
    const violations = await verifySoakHistory(fixture, events, config.runId);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join('\n')).toContain('STALE ACCEPT');
  });

  it('the pure referee flags tampered histories without any writer', async () => {
    const fixture = makeFakePair({ honest: true, ttlMs: 1000 });
    const doubleGrant: SoakEvent[] = [
      { t: 'grant', w: 0, epoch: 1 },
      { t: 'grant', w: 1, epoch: 1 },
    ];
    expect((await verifySoakHistory(fixture, doubleGrant, 'soak-run')).join('\n')).toContain(
      'granted twice',
    );

    const ungrantedAccept: SoakEvent[] = [
      { t: 'grant', w: 0, epoch: 1 },
      { t: 'accept', w: 1, surface: 'meta', epoch: 2, counter: 0, nonce: 'w1-e2-c0' },
    ];
    expect((await verifySoakHistory(fixture, ungrantedAccept, 'soak-run')).join('\n')).toContain(
      'granted to',
    );

    // An accepted append the journal never got: a lost write.
    const lostWrite: SoakEvent[] = [
      { t: 'grant', w: 0, epoch: 1 },
      { t: 'accept', w: 0, surface: 'marker', epoch: 1, counter: 0, nonce: 'w0-e1-c0', seq: 1 },
    ];
    expect((await verifySoakHistory(fixture, lostWrite, 'soak-run')).join('\n')).toContain(
      'journal has 0 entries',
    );
  });

  it('soakWriterConfigFromEnv round-trips the referee contract and rejects absence', () => {
    const config = writerConfig('/tmp/x', 40);
    expect(soakWriterConfigFromEnv({ RULVAR_SOAK_CONFIG: JSON.stringify(config) })).toEqual(config);
    expect(() => soakWriterConfigFromEnv({})).toThrow(/RULVAR_SOAK_CONFIG/);
  });
});
