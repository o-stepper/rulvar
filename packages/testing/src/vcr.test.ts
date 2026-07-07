/**
 * VCR self-tests with a stub adapter (M5-T04): record wraps and
 * captures; secrets never appear in cassette bytes; replay serves
 * recorded streams hermetically (onMiss throw) or passes through;
 * request hashing ignores the engine telemetry namespace; cassettes
 * carry the hashVersion header (DEF-6).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  CURRENT_HASH_VERSION,
  defineWorkflow,
  InMemoryStore,
  type ChatRequest,
} from '@lurker/core';

import { FakeAdapter, FAKE_MODEL_REF } from './fake-adapter.js';
import { defaultRedact, readCassette, record, replay, requestHash, VcrMissError } from './vcr.js';

const SECRET = 'sk-live-abcdef1234567890';

function cassettePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'lurker-vcr-')), 'session.jsonl');
}

const wf = (prompt: string) => defineWorkflow({ name: 'vcr-demo' }, (ctx) => ctx.agent(prompt));

async function runThrough(adapters: ReturnType<typeof record>, prompt: string): Promise<unknown> {
  const engine = createEngine({
    adapters,
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const outcome = await engine.run(wf(prompt), undefined).result;
  expect(outcome.status).toBe('ok');
  return outcome.value;
}

describe('VCR record/replay (M5-T04)', () => {
  it('records through the live adapter and replays hermetically with zero live calls', async () => {
    const cassette = cassettePath();
    const live = new FakeAdapter({ agents: { '*': 'recorded answer' } });
    const recorded = record({ adapters: [live], cassette });
    expect(await runThrough(recorded, 'do the thing')).toBe('recorded answer');

    const { header, rows } = readCassette(cassette);
    expect(header.hashVersion).toBe(CURRENT_HASH_VERSION);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.adapterId).toBe('fake');

    // Replay: the same engine-shaped request replays with NO live
    // adapter behind it at all.
    const replayed = replay({ cassette, onMiss: 'throw' });
    expect(await runThrough(replayed, 'do the thing')).toBe('recorded answer');
  });

  it('onMiss throw raises the typed miss; passthrough forwards to the live adapter', async () => {
    const cassette = cassettePath();
    // One recorded exchange establishes the adapter; the test request
    // below is a DIFFERENT prompt with no recorded row.
    await runThrough(
      record({ adapters: [new FakeAdapter({ agents: { '*': 'x' } })], cassette }),
      'the recorded one',
    );
    const hermetic = replay({ cassette, onMiss: 'throw' });
    const engine = createEngine({
      adapters: hermetic,
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
    const outcome = await engine.run(wf('never recorded'), undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('VCR miss');

    const passthrough = replay({
      cassette,
      onMiss: 'passthrough',
      adapters: [new FakeAdapter({ agents: { '*': 'live fallback' } })],
    });
    expect(await runThrough(passthrough, 'never recorded')).toBe('live fallback');
  });

  it('secrets never appear in cassette bytes (built-in redaction plus hook)', async () => {
    const cassette = cassettePath();
    const live = new FakeAdapter({ agents: { '*': `token ${SECRET} accepted, PIN 7777` } });
    const recorded = record({
      adapters: [live],
      cassette,
      redact: (value) => value.replaceAll('7777', '[PIN]'),
    });
    await runThrough(recorded, `use key ${SECRET} and Bearer abc.def.ghi-jkl for auth`);
    const bytes = readFileSync(cassette, 'utf8');
    expect(bytes).not.toContain(SECRET);
    expect(bytes).not.toContain('abc.def.ghi-jkl');
    expect(bytes).not.toContain('7777');
    expect(bytes).toContain('[REDACTED]');
    expect(bytes).toContain('[PIN]');
  });

  it('hashing ignores the engine telemetry namespace but keys everything else', () => {
    const base: ChatRequest = {
      model: 'fake-model',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
    };
    const withTelemetry: ChatRequest = {
      ...base,
      providerOptions: { lurker: { agentType: 'reviewer', label: 'a' } },
    };
    expect(requestHash(withTelemetry)).toBe(requestHash(base));
    expect(requestHash({ ...base, providerOptions: { fake: { temperature: 0 } } })).not.toBe(
      requestHash(base),
    );
    expect(requestHash({ ...base, model: 'other' })).not.toBe(requestHash(base));
  });

  it('defaultRedact masks authorization material shapes', () => {
    expect(defaultRedact('sk-live-abcdef1234567890')).toBe('[REDACTED]');
    expect(defaultRedact('Authorization: Bearer eyJhbGciOi.payload.sig')).toContain(
      'Bearer [REDACTED]',
    );
    expect(defaultRedact('api_key="super-secret-value"')).toContain('[REDACTED]');
    expect(defaultRedact('plain text stays')).toBe('plain text stays');
  });

  it('replay adapters expose recorded caps snapshots', async () => {
    const cassette = cassettePath();
    await runThrough(
      record({ adapters: [new FakeAdapter({ agents: { '*': 'ok' } })], cassette }),
      'caps check',
    );
    const [replayed] = replay({ cassette, onMiss: 'throw' });
    // The FakeAdapter caps snapshot rode the cassette row.
    expect(replayed?.caps('fake-model').contextWindow).toBe(1_000_000);
    expect(new VcrMissError('fake', 'deadbeef'.repeat(8)).name).toBe('VcrMissError');
  });
});
