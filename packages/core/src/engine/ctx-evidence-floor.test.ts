/**
 * The evidence floor enforcement (RV507, the ninth-experiment review):
 * a profile's declared EvidenceContract stops being purely declarative
 * under enforce: 'refuse'. An ok settle whose message window carries
 * fewer successful record_evidence executions than minEntries becomes a
 * typed error terminal carrying the machine-readable counter and
 * threshold in the journaled error data (and the memoize stamp, so a
 * resume rolls the refusal forward); 'warn' and an absent enforce keep
 * today's preflight-only behavior byte for byte.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentResult } from '../runtime/agent-loop.js';
import type { JournalEntry } from '../l0/entries.js';
import { ConfigError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { createEngine } from './engine.js';
import { researchAgentProfile } from './profile-templates.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

/**
 * A scripted stand-in for the research kit's record_evidence tool: the
 * enforcement counts SUCCESSFUL records (result.recorded === true), so
 * duplicates and verification errors must not satisfy the floor.
 */
function recorder(outcomes: ReadonlyArray<'recorded' | 'duplicate' | 'error'>) {
  let call = 0;
  return tool({
    name: 'record_evidence',
    description: 'records one evidence entry',
    parameters: {},
    execute: () => {
      const outcome = outcomes[Math.min(call, outcomes.length - 1)] ?? 'error';
      call += 1;
      if (outcome === 'error') {
        return Promise.resolve({ error: 'citation could not be verified' });
      }
      return Promise.resolve({
        recorded: outcome === 'recorded',
        duplicate: outcome === 'duplicate',
        totalEvidence: call,
      });
    },
  });
}

/** Calls record_evidence `calls` times, then finishes with plain text. */
function recordThenFinish(calls: number) {
  return scriptedAdapter((_req, call) =>
    call < calls ? { toolCall: { name: 'record_evidence', args: {} } } : { text: 'done' },
  );
}

function diggerInternals(
  outcomes: ReadonlyArray<'recorded' | 'duplicate' | 'error'>,
  contract: { minEntries: number; enforce?: 'warn' | 'refuse' },
  adapter: ReturnType<typeof scriptedAdapter>,
  priorEntries?: JournalEntry[],
) {
  return makeInternals({
    adapters: [adapter],
    routing: { loop: 'fake:model' },
    profiles: {
      digger: {
        description: 'records evidence',
        tools: [recorder(outcomes)],
        evidenceContract: contract,
      },
    },
    ...(priorEntries === undefined ? {} : { priorEntries }),
  });
}

describe('the evidence floor enforcement (RV507)', () => {
  it("enforce: 'refuse' turns an under-floor ok finish into the typed terminal error", async () => {
    const adapter = recordThenFinish(1);
    const { internals } = diggerInternals(
      ['recorded'],
      { minEntries: 2, enforce: 'refuse' },
      adapter,
    );
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('error');
    expect(result.error).toEqual({ kind: 'terminal', retryable: false });
    expect(result.errorMessage).toContain('1 of 2');
    expect(result.output).toBeNull();
    // The journaled terminal carries the machine-readable verdict and
    // the memoize stamp: the refusal is deterministic from the paid
    // transcript, so a resume must roll it forward, never re-pay.
    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'error');
    expect(terminal?.memoizeOutcome).toBe(true);
    expect(
      (terminal?.error?.data as { evidenceFloor?: unknown } | undefined)?.evidenceFloor,
    ).toEqual({
      recordedEntries: 1,
      minEntries: 2,
    });
  });

  it('a floor met by successful records settles ok, and the terminal stays clean', async () => {
    const adapter = recordThenFinish(2);
    const { internals } = diggerInternals(
      ['recorded', 'recorded'],
      { minEntries: 2, enforce: 'refuse' },
      adapter,
    );
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'ok');
    expect(terminal?.error).toBeUndefined();
    expect(terminal?.memoizeOutcome).toBeUndefined();
  });

  it('duplicates and verification errors do not satisfy the floor', async () => {
    const adapter = recordThenFinish(3);
    const { internals } = diggerInternals(
      ['recorded', 'duplicate', 'error'],
      { minEntries: 2, enforce: 'refuse' },
      adapter,
    );
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('1 of 2');
  });

  it("enforce: 'warn' keeps today's behavior: the under-floor finish settles ok", async () => {
    const adapter = recordThenFinish(1);
    const { internals } = diggerInternals(
      ['recorded'],
      { minEntries: 2, enforce: 'warn' },
      adapter,
    );
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
  });

  it('a non-ok terminal is never re-judged by the floor', async () => {
    // The scripted stream errors out before any record: the terminal
    // keeps its own error class, and no evidenceFloor data is folded.
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'exploded', retryable: false },
    }));
    const { internals } = diggerInternals([], { minEntries: 2, enforce: 'refuse' }, adapter);
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('error');
    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'error');
    expect((terminal?.error?.data as { evidenceFloor?: unknown } | undefined)?.evidenceFloor).toBe(
      undefined,
    );
  });

  it('the refusal replays memoized: a resume rolls the identical error forward for free', async () => {
    const first = recordThenFinish(1);
    const { internals, store } = diggerInternals(
      ['recorded'],
      { minEntries: 2, enforce: 'refuse' },
      first,
    );
    const live = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(live.status).toBe('error');
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = recordThenFinish(1);
    const { internals: resumed } = diggerInternals(
      ['recorded'],
      { minEntries: 2, enforce: 'refuse' },
      replayAdapter,
      prior,
    );
    const replayed = fullResult(
      await createCtx(resumed).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(replayed.status).toBe('error');
    expect(replayed.error).toEqual({ kind: 'terminal', retryable: false });
    expect(replayAdapter.calls).toHaveLength(0);
  });

  it('the real research kit end to end: one verified citation short of the floor is refused', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rulvar-evidence-'));
    await writeFile(join(root, 'notes.txt'), 'alpha\nbeta\n');
    const { profile, evidence } = researchAgentProfile({
      root,
      evidenceContract: { minEntries: 2, enforce: 'refuse' },
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCall: {
              name: 'record_evidence',
              args: { claim: 'alpha comes first', file: 'notes.txt', lines: '1', quote: 'alpha' },
            },
          }
        : { text: 'report done' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { researcher: profile },
    });
    const result = fullResult(
      await createCtx(internals).agent('research', { agentType: 'researcher', result: 'full' }),
    );
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('1 of 2');
    // The host-side snapshot agrees with the refused count.
    expect(evidence()).toHaveLength(1);
  });

  it('the profile intake refuses a malformed enforce and accepts the two modes', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    const base = {
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
    };
    expect(() =>
      createEngine({
        ...base,
        defaults: {
          profiles: {
            bad: { evidenceContract: { minEntries: 1, enforce: 'block' as 'refuse' } },
          },
        },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      createEngine({
        ...base,
        defaults: {
          profiles: {
            warn: { evidenceContract: { minEntries: 1, enforce: 'warn' } },
            refuse: { evidenceContract: { minEntries: 1, enforce: 'refuse' } },
          },
        },
      }),
    ).not.toThrow();
  });
});

describe('the evidence verdict on the settled result (RV806)', () => {
  it('a declared contract stamps the settled result with the count and the met verdict', async () => {
    const short = recordThenFinish(2);
    const { internals } = diggerInternals(
      ['recorded', 'recorded'],
      { minEntries: 3, enforce: 'warn' },
      short,
    );
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('ok');
    expect(result.evidence).toEqual({ recordedEntries: 2, minEntries: 3, met: false });
  });

  it('a met floor reads met true, and only SUCCESSFUL records count', async () => {
    const adapter = recordThenFinish(3);
    const { internals } = diggerInternals(
      ['recorded', 'duplicate', 'recorded'],
      { minEntries: 2, enforce: 'warn' },
      adapter,
    );
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.evidence).toEqual({ recordedEntries: 2, minEntries: 2, met: true });
  });

  it('without a declared contract the field is absent, byte for byte', async () => {
    const adapter = recordThenFinish(1);
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { digger: { description: 'records evidence', tools: [recorder(['recorded'])] } },
    });
    const result = fullResult(
      await createCtx(internals).agent('dig', { agentType: 'digger', result: 'full' }),
    );
    expect(result.status).toBe('ok');
    expect(result.evidence).toBeUndefined();
  });
});
