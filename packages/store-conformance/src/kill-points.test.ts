/**
 * In-process pieces of the kill-point suite: the worker protocol's
 * write matching, phase bracketing, and report lines over an honest
 * fenced in-memory pair, with an injected kill hook standing in for the
 * SIGKILL (a throwing hook surfaces through the engine as a store
 * failure; a no-op hook lets the run finish so the completion report is
 * observable). The real cross-process suite, death by actual SIGKILL
 * included, runs in the shipped store packages via
 * {@link killPointConformance}.
 */
import { mkdtempSync } from 'node:fs';
import { appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LeaseHeldError, type JournalEntry, type Lease, type RunMeta } from '@rulvar/core';

import type { FencedTranscriptsFixture } from './fenced-transcripts.js';
import {
  KILL_POINT_SCENARIOS,
  killPointWorkerConfigFromEnv,
  parseKillPointReport,
  runKillPointWorker,
  type KillPointWorkerConfig,
} from './kill-points.js';

const wallClock: () => number = Date.now.bind(globalThis);

/** An honest fenced in-memory pair (the soak unit fixture, trimmed). */
function makeFakePair(ttlMs: number): FencedTranscriptsFixture & {
  entriesOf: (runId: string) => JournalEntry[];
  metaOf: (runId: string) => RunMeta | undefined;
} {
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
    const live = leases.get(lease.runId);
    if (
      live === undefined ||
      live.expiresAt <= wallClock() ||
      live.owner !== lease.owner ||
      live.epoch !== lease.epoch
    ) {
      throw new LeaseHeldError(`stale lease for '${lease.runId}'`);
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
      leases.set(runId, { owner, epoch, expiresAt: wallClock() + ttlMs });
      return { runId, owner, epoch };
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    renew: async (l) => {
      fenced(l, l.runId, () => {
        const live = leases.get(l.runId);
        if (live !== undefined && live.owner === l.owner && live.epoch === l.epoch) {
          live.expiresAt = wallClock() + ttlMs;
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
  return {
    journal,
    transcripts,
    entriesOf: (runId) => [...(entries.get(runId) ?? [])],
    metaOf: (runId) => metas.get(runId),
  };
}

function config(dir: string, scenarioId: string): KillPointWorkerConfig {
  return {
    storePath: join(dir, 'unused'),
    runId: `kp-${scenarioId}`,
    ttlMs: 250,
    reportPath: join(dir, `report-${scenarioId}.jsonl`),
    scenarioId,
  };
}

describe('kill-point scenario table', () => {
  it('covers both brackets of all five write points with unique ids', () => {
    expect(KILL_POINT_SCENARIOS).toHaveLength(10);
    expect(new Set(KILL_POINT_SCENARIOS.map((s) => s.id)).size).toBe(10);
    const brackets = new Set(KILL_POINT_SCENARIOS.map((s) => `${s.point}/${s.phase}`));
    for (const point of ['running', 'ok-terminal', 'limit-terminal', 'settle', 'meta']) {
      expect(brackets.has(`${point}/before`)).toBe(true);
      expect(brackets.has(`${point}/after`)).toBe(true);
    }
  });
});

describe('kill-point worker protocol (in-process, injected kill hook)', () => {
  it('a before-phase kill fires ahead of the settle write: the work is journaled, the settle is not', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kp-unit-'));
    const pair = makeFakePair(250);
    const cfg = config(dir, 'happy-settle-before');
    await expect(
      runKillPointWorker(pair, cfg, {
        kill: () => {
          throw new Error('kp-test-kill');
        },
      }),
    ).rejects.toThrow();
    const events = parseKillPointReport(cfg.reportPath);
    const kill = events.find((e) => e.t === 'kill');
    expect(kill).toMatchObject({ point: 'settle', phase: 'before', site: 'append' });
    expect(events.filter((e) => e.t === 'call')).toHaveLength(2);
    const entries = pair.entriesOf(cfg.runId);
    // Both steps are durable; the settle never landed and the meta
    // write was skipped (the settlement acknowledgement), so the store
    // holds the meta-behind-free crashed shape a real SIGKILL leaves.
    expect(entries.filter((e) => e.kind === 'agent' && e.status === 'ok')).toHaveLength(2);
    expect(
      entries.filter(
        (e) =>
          e.kind === 'decision' &&
          (e.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
      ),
    ).toHaveLength(0);
    expect(pair.metaOf(cfg.runId)?.status).toBe('running');
  });

  it('an after-phase kill fires once the write is durable and the report names its seq', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kp-unit-'));
    const pair = makeFakePair(250);
    const cfg = config(dir, 'happy-ok-terminal-after');
    // occurrence 2 = step two's terminal; the injected throw then fails
    // the step it brackets, so the run completes as an error instead of
    // dying, which is exactly why the referee insists on the SIGKILL
    // signal instead of an exit code.
    await runKillPointWorker(pair, cfg, {
      kill: () => {
        throw new Error('kp-test-kill');
      },
    });
    const events = parseKillPointReport(cfg.reportPath);
    const kill = events.find((e) => e.t === 'kill');
    expect(kill).toMatchObject({
      point: 'ok-terminal',
      phase: 'after',
      site: 'append',
      status: 'ok',
    });
    expect(typeof (kill as { seq?: number }).seq).toBe('number');
    const terminals = pair
      .entriesOf(cfg.runId)
      .filter((e) => e.kind === 'agent' && e.ref !== undefined && e.status === 'ok');
    // The bracketed write itself IS durable.
    expect(terminals).toHaveLength(2);
    expect(events.some((e) => e.t === 'ran-to-completion')).toBe(true);
  });

  it('a kill point that never fires reports ran-to-completion for the referee to flag', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kp-unit-'));
    const pair = makeFakePair(250);
    const cfg = config(dir, 'happy-meta-before');
    // A no-op hook: the kill line is logged, nothing dies, the run
    // finishes; a worker script losing its SIGKILL privilege would look
    // exactly like this, and the referee must treat it as a violation.
    await runKillPointWorker(pair, cfg, { kill: () => undefined });
    const events = parseKillPointReport(cfg.reportPath);
    expect(events.find((e) => e.t === 'ran-to-completion')).toMatchObject({ status: 'ok' });
    expect(pair.metaOf(cfg.runId)?.status).toBe('ok');
  });

  it('an unknown scenario id is refused before any store touch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kp-unit-'));
    const pair = makeFakePair(250);
    await expect(runKillPointWorker(pair, config(dir, 'no-such'))).rejects.toThrow(
      /unknown scenario/,
    );
  });
});

describe('kill-point plumbing', () => {
  it('the worker config round-trips through the environment variable', () => {
    const cfg: KillPointWorkerConfig = {
      storePath: '/tmp/kp.db',
      runId: 'kp-x',
      ttlMs: 300,
      reportPath: '/tmp/kp.jsonl',
      scenarioId: 'happy-settle-after',
    };
    expect(killPointWorkerConfigFromEnv({ RULVAR_KILL_POINT_CONFIG: JSON.stringify(cfg) })).toEqual(
      cfg,
    );
    expect(() => killPointWorkerConfigFromEnv({})).toThrow(/RULVAR_KILL_POINT_CONFIG/);
  });

  it('the report parser tolerates a line torn by the kill itself', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kp-unit-'));
    const path = join(dir, 'torn.jsonl');
    writeFileSync(path, `${JSON.stringify({ t: 'call', prompt: 'step one' })}\n`);
    appendFileSync(path, '{"t":"kill","point":"set');
    expect(parseKillPointReport(path)).toEqual([{ t: 'call', prompt: 'step one' }]);
    expect(parseKillPointReport(join(dir, 'absent.jsonl'))).toEqual([]);
  });
});
