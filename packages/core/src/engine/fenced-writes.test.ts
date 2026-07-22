/**
 * Fenced writes threading (the fenced run state RFC, phase 2): a leased
 * resume must carry its lease on EVERY durable mutation of the segment
 * (meta writes and transcript blob writes, exactly as the Replayer
 * already carries it on journal appends), a fenced store's rejection of
 * a stale terminal settle must degrade to a no-op, and a rejection of
 * the segment's very first meta write must fail the segment typed
 * before any paid work.
 */
import { describe, expect, it } from 'vitest';

import { LeaseHeldError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import type { Bytes } from '../l0/json.js';
import type { JournalStore, Lease, RunFilter, RunMeta } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { Replayer } from '../journal/replayer.js';
import { tool } from '../tools/tool.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok'],
  properties: { ok: { type: 'boolean' } },
} as const;

const lookup = tool({
  name: 'lookup',
  description: 'looks up a fact',
  parameters: {},
  execute: () => Promise.resolve({ fact: 'sunny' }),
});

/** Suspends between two agents so segment 2 runs a LIVE tool agent. */
const gateWf = defineWorkflow({ name: 'fenced-gate' }, async (ctx) => {
  const before = await ctx.agent('scout the change');
  const gate = await ctx.awaitExternal<{ ok: boolean }>('gate', { schema: GATE_SCHEMA });
  const after = await ctx.agent('inspect with the tool', { tools: [lookup] });
  return { before, after, ok: gate.ok };
});

interface MetaWrite {
  status: string;
  lease?: Lease;
}

/**
 * Probe journal store: delegates to InMemoryStore and records the lease
 * each putMeta carried. `rejectMeta` simulates a fencedWrites store
 * refusing a superseded holder: 'terminal' rejects every non-running
 * write, 'all' rejects every one.
 */
function probeJournal(): {
  store: JournalStore;
  metaWrites: MetaWrite[];
  mode: { rejectMeta?: 'terminal' | 'all' };
} {
  const inner = new InMemoryStore();
  const metaWrites: MetaWrite[] = [];
  const mode: { rejectMeta?: 'terminal' | 'all' } = {};
  const store: JournalStore = {
    // InMemoryStore has no lease capability; the delegation drops the
    // lease exactly like any pre-capability store ignores it.
    append: (runId: string, e: JournalEntry) => inner.append(runId, e),
    load: (runId: string) => inner.load(runId),
    putMeta: (m: RunMeta, lease?: Lease) => {
      metaWrites.push({ status: m.status, ...(lease === undefined ? {} : { lease }) });
      if (mode.rejectMeta === 'all' || (mode.rejectMeta === 'terminal' && m.status !== 'running')) {
        return Promise.reject(
          new LeaseHeldError('stale fencing epoch: the meta write is rejected'),
        );
      }
      return inner.putMeta(m);
    },
    listRuns: (f?: RunFilter) => inner.listRuns(f),
    delete: (runId: string) => inner.delete(runId),
  };
  return { store, metaWrites, mode };
}

interface BlobWrite {
  ref: string;
  lease?: Lease;
}

function probeTranscripts(): { store: TranscriptStore; blobWrites: BlobWrite[] } {
  const inner = new InMemoryTranscriptStore();
  const blobWrites: BlobWrite[] = [];
  const store: TranscriptStore = {
    put: (ref: string, blob: Bytes, lease?: Lease) => {
      blobWrites.push({ ref, ...(lease === undefined ? {} : { lease }) });
      return inner.put(ref, blob);
    },
    get: (ref: string) => inner.get(ref),
    list: (runId: string) => inner.list(runId),
    delete: (ref: string) => inner.delete(ref),
  };
  return { store, blobWrites };
}

function makeEngine(journal: JournalStore, transcripts: TranscriptStore) {
  const adapter = scriptedAdapter((req, call) => {
    const wantsTool = req.tools !== undefined && req.tools.length > 0;
    if (wantsTool) {
      // The live segment-2 agent: one tool turn (a checkpoint boundary),
      // then the terminal text.
      const alreadyCalled = req.messages.some(
        (msg) => msg.role === 'tool' || msg.parts.some((part) => part.type === 'tool-result'),
      );
      return alreadyCalled ? { text: 'inspected' } : { toolCall: { name: 'lookup', args: {} } };
    }
    return { text: `scouted-${String(call)}` };
  });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal, transcripts },
    defaults: { routing: { loop: 'fake:model' } },
  });
  return { engine, adapter };
}

async function resolveGate(store: JournalStore, runId: string): Promise<void> {
  const prior = await store.load(runId);
  const suspended = prior.find((e) => e.kind === 'external');
  const offline = new Replayer({ runId, store, priorEntries: prior });
  await offline.resolveSuspended(suspended?.seq ?? -1, { by: 'external', value: { ok: true } });
}

describe('fenced writes threading (fenced run state RFC, phase 2)', () => {
  const LEASE: Lease = { runId: 'FR1', owner: 'worker-7', epoch: 7 };

  it('a leased resume carries the lease on every meta and blob write', async () => {
    const journal = probeJournal();
    const transcripts = probeTranscripts();

    const first = makeEngine(journal.store, transcripts.store);
    const firstOutcome = await first.engine.run(gateWf, undefined, { runId: 'FR1' }).result;
    expect(firstOutcome.status).toBe('suspended');
    // The unleased segment wrote its meta without a lease.
    expect(journal.metaWrites.length).toBeGreaterThan(0);
    expect(journal.metaWrites.every((write) => write.lease === undefined)).toBe(true);

    await resolveGate(journal.store, 'FR1');
    const metaBefore = journal.metaWrites.length;
    const blobsBefore = transcripts.blobWrites.length;

    const second = makeEngine(journal.store, transcripts.store);
    const outcome = await second.engine.resume('FR1', gateWf, { lease: LEASE }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toMatchObject({ ok: true, after: 'inspected' });

    // Every meta write of the leased segment carried THE lease: the
    // running write at boot and the terminal settle write.
    const segmentMeta = journal.metaWrites.slice(metaBefore);
    expect(segmentMeta.map((write) => write.status)).toEqual(['running', 'ok']);
    expect(segmentMeta.every((write) => write.lease?.epoch === 7)).toBe(true);

    // The live tool agent crossed a turn boundary, so at least one
    // checkpoint blob was written, and every blob write carried it too.
    const segmentBlobs = transcripts.blobWrites.slice(blobsBefore);
    expect(segmentBlobs.length).toBeGreaterThan(0);
    expect(segmentBlobs.every((write) => write.lease?.epoch === 7)).toBe(true);
  });

  it('a fenced rejection of the stale terminal settle is a no-op, not a crash', async () => {
    const journal = probeJournal();
    const transcripts = probeTranscripts();

    const first = makeEngine(journal.store, transcripts.store);
    await first.engine.run(gateWf, undefined, { runId: 'FR1' }).result;
    await resolveGate(journal.store, 'FR1');

    // The store now refuses every non-running meta write, the shape a
    // fencedWrites store gives a superseded segment at settle.
    journal.mode.rejectMeta = 'terminal';
    const second = makeEngine(journal.store, transcripts.store);
    const outcome = await second.engine.resume('FR1', gateWf, { lease: LEASE }).result;
    // The run still settles for its caller; the terminal meta write was
    // refused and swallowed, leaving the successor's row untouched.
    expect(outcome.status).toBe('ok');
    const listed = await journal.store.listRuns();
    expect(listed.find((m) => m.runId === 'FR1')?.status).toBe('running');
  });

  it('a fenced rejection of the boot meta write fails the segment before any paid call', async () => {
    const journal = probeJournal();
    const transcripts = probeTranscripts();

    const first = makeEngine(journal.store, transcripts.store);
    await first.engine.run(gateWf, undefined, { runId: 'FR1' }).result;
    await resolveGate(journal.store, 'FR1');

    journal.mode.rejectMeta = 'all';
    const second = makeEngine(journal.store, transcripts.store);
    const handle = second.engine.resume('FR1', gateWf, { lease: LEASE });
    await expect(handle.result).rejects.toThrow(LeaseHeldError);
    // Refused ownership means zero live calls and zero paid work.
    expect(second.adapter.calls).toHaveLength(0);
  });
});
