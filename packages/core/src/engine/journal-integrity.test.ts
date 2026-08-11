/**
 * The append-loss settle barrier (RV3201, the 2026-08-11 four-agent
 * experiment's first confirmed blocker): deterministic shims journal
 * fire-and-forget through the Replayer's serialized queue, whose chain
 * swallows rejections to keep later appends flowing, and the settle
 * path used to swallow the flush verdict on top
 * (`flush().catch(() => undefined)`), so a persist failure was visible
 * to NOBODY: the run settled ok/complete over a journal missing a
 * record it believes it wrote, and a resume regenerated a different
 * random without one provider call. The first lost append now latches
 * in the Replayer, every flush() from that moment rethrows it typed,
 * and the engine settle converts a would-be ok into an error terminal.
 */
import { describe, expect, it } from 'vitest';

import { JournalIntegrityError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { Replayer } from '../journal/replayer.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';

/** Fails the FIRST append of a 'rand' entry while armed; later appends persist. */
class RandAppendOutageStore extends InMemoryStore {
  armed = true;
  private failed = false;

  override append(runId: string, e: JournalEntry): Promise<void> {
    if (this.armed && !this.failed && e.kind === 'rand') {
      this.failed = true;
      return Promise.reject(new Error('injected outage: rand append failed'));
    }
    return super.append(runId, e);
  }
}

describe('append loss fails the settle closed (RV3201)', () => {
  it('a lost rand append converts the ok settle into an error terminal', async () => {
    const store = new RandAppendOutageStore();
    const engine = createEngine({ adapters: [], stores: { journal: store } });
    const wf = defineWorkflow({ name: 'lossy' }, (ctx) => {
      // The shim returns the live value and journals fire-and-forget;
      // the injected outage swallows exactly the FIRST record. The
      // second rand persists, so the segment did durable work and the
      // converted settle must land durably too.
      const lost = ctx.random();
      const kept = ctx.random('kept');
      return Promise.resolve(lost + kept);
    });
    const handle = engine.run(wf, undefined, {});
    let runEnd: { status: string } | undefined;
    handle.on('run:end', (event) => {
      runEnd = event;
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('journal append lost');
    expect(runEnd?.status).toBe('error');
    // The journal holds only the SECOND rand record, and the settle it
    // DOES hold records the converted status: nothing durable claims
    // ok over the torn segment.
    const entries = await store.load(handle.runId);
    expect(entries.filter((e) => e.kind === 'rand')).toHaveLength(1);
    const settle = entries.find(
      (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
    );
    expect(settle).toBeDefined();
    expect((settle?.value as { runStatus?: string }).runStatus).toBe('error');
  });

  it('an intact run keeps its ok settle byte for byte', async () => {
    const store = new RandAppendOutageStore();
    store.armed = false;
    const engine = createEngine({ adapters: [], stores: { journal: store } });
    const wf = defineWorkflow({ name: 'clean' }, (ctx) => Promise.resolve(ctx.random()));
    const outcome = await engine.run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    expect(typeof outcome.value).toBe('number');
  });
});

describe('the Replayer latch (RV3201)', () => {
  it('flush rethrows the first lost append typed, permanently, with the cause attached', async () => {
    const store = new RandAppendOutageStore();
    const replayer = new Replayer({ runId: 'run-l', store, now: () => 1_700_000_000_000 });
    await expect(
      replayer.appendSinglePhase({
        scope: '',
        key: 'k'.repeat(64),
        kind: 'rand',
        status: 'ok',
        spanId: 's1',
        value: { subtype: 'random', value: 0.5 },
      }),
    ).rejects.toThrow('injected outage');
    await expect(replayer.flush()).rejects.toThrow(JournalIntegrityError);
    // The queue itself stays alive: a later append persists normally,
    // and the latch still names the FIRST loss on every later flush.
    store.armed = false;
    const later = await replayer.appendSinglePhase({
      scope: '',
      key: 'j'.repeat(64),
      kind: 'rand',
      status: 'ok',
      spanId: 's1',
      value: { subtype: 'random', value: 0.7 },
    });
    expect(later.seq).toBeGreaterThanOrEqual(0);
    const second = await replayer.flush().catch((thrown: unknown) => thrown);
    expect(second).toBeInstanceOf(JournalIntegrityError);
    expect((second as JournalIntegrityError).message).toContain('injected outage');
    expect(((second as JournalIntegrityError).cause as Error).message).toContain('injected outage');
  });

  it('a domain rejection thrown before persist does not latch', async () => {
    const replayer = new Replayer({
      runId: 'run-d',
      store: new InMemoryStore(),
      now: () => 1_700_000_000_000,
    });
    // appendTerminal on a seq that is not a running entry is the
    // caller-facing lifecycle ConfigError, always awaited by its
    // callers; the integrity latch is reserved for persist losses.
    await expect(replayer.appendTerminal(99, { status: 'ok' })).rejects.toThrow(
      'is not a running entry',
    );
    await expect(replayer.flush()).resolves.toBeUndefined();
  });
});
