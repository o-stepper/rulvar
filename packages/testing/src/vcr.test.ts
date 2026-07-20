/**
 * VCR self-tests with a stub adapter (M5-T04): record wraps and
 * captures; secrets never appear in cassette bytes; replay serves
 * recorded streams hermetically (onMiss throw) or passes through;
 * request hashing ignores the engine telemetry namespace; cassettes
 * carry the hashVersion header (DEF-6).
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  CURRENT_HASH_VERSION,
  defineWorkflow,
  InMemoryStore,
  type ChatEvent,
  type ChatRequest,
  type ProviderAdapter,
} from '@rulvar/core';

import { FAKE_MODEL, FakeAdapter, FAKE_MODEL_REF } from './fake-adapter.js';
import { defaultRedact, readCassette, record, replay, requestHash, VcrMissError } from './vcr.js';

const SECRET = 'sk-live-abcdef1234567890';

function cassettePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'rulvar-vcr-')), 'session.jsonl');
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

  it('replay refuses a cassette recorded outside the hashVersion support window', async () => {
    const cassette = cassettePath();
    await runThrough(
      record({ adapters: [new FakeAdapter({ agents: { '*': 'stale' } })], cassette }),
      'the stale one',
    );
    const [headerLine, ...rest] = readFileSync(cassette, 'utf8').split('\n');
    const header = JSON.parse(headerLine ?? '{}') as { hashVersion: number };

    header.hashVersion = CURRENT_HASH_VERSION - 2;
    writeFileSync(cassette, [JSON.stringify(header), ...rest].join('\n'));
    expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(/outside the supported window/);

    // The oldest in-window profile stays replayable, mirroring the
    // engine's own journal support window.
    header.hashVersion = CURRENT_HASH_VERSION - 1;
    writeFileSync(cassette, [JSON.stringify(header), ...rest].join('\n'));
    expect(() => replay({ cassette, onMiss: 'throw' })).not.toThrow();
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
      providerOptions: { rulvar: { agentType: 'reviewer', label: 'a' } },
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

describe('a cassette row is the record of one completed exchange (v1.28.0 review P2 and P3)', () => {
  const req: ChatRequest = {
    model: FAKE_MODEL,
    messages: [{ role: 'user', parts: [{ type: 'text', text: 'q' }] }],
  };
  const caps = new FakeAdapter({ agents: { '*': 'x' } }).caps();
  const adapterOf = (events: ChatEvent[], options?: { throwAfter?: boolean }): ProviderAdapter => ({
    id: 'fake',
    caps: () => caps,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(): AsyncIterable<ChatEvent> {
      for (const event of events) {
        yield event;
      }
      if (options?.throwAfter === true) {
        throw new Error('wire failure');
      }
    },
  });
  const drain = async (adapter: ProviderAdapter): Promise<void> => {
    for await (const event of adapter.stream(req)) {
      void event;
    }
  };
  const delta: ChatEvent = { type: 'text-delta', text: 'partial' };
  const finish: ChatEvent = {
    type: 'finish',
    finish: { reason: 'stop' },
    usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
  };
  const wireError: ChatEvent = {
    type: 'error',
    error: { code: 'agent', message: 'boom', retryable: true, data: { kind: 'transport' } },
  };

  it('a stream that drains without a terminal event appends nothing', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta])], cassette });
    await drain(recorded);
    expect(readCassette(cassette).rows).toHaveLength(0);
  });

  it('a consumer return before any terminal (the abort shape) appends nothing', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta, finish])], cassette });
    const iterator = recorded.stream(req)[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.return?.();
    expect(readCassette(cassette).rows).toHaveLength(0);
  });

  it('a consumer return right after the terminal (the engine shape) still commits the row', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta, finish])], cassette });
    const iterator = recorded.stream(req)[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.next();
    await iterator.return?.();
    const { rows } = readCassette(cassette);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.events.map((event) => event.type)).toEqual(['text-delta', 'finish']);
  });

  it('a second terminal or data after the terminal appends nothing (contract violation)', async () => {
    const doubled = cassettePath();
    const [twoFinishes] = record({
      adapters: [adapterOf([delta, finish, finish])],
      cassette: doubled,
    });
    await drain(twoFinishes);
    expect(readCassette(doubled).rows).toHaveLength(0);

    const trailing = cassettePath();
    const [postTerminal] = record({
      adapters: [adapterOf([delta, finish, delta])],
      cassette: trailing,
    });
    await drain(postTerminal);
    expect(readCassette(trailing).rows).toHaveLength(0);
  });

  it('a thrown wire failure keeps the no row semantics', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta], { throwAfter: true })], cassette });
    await expect(drain(recorded)).rejects.toThrow('wire failure');
    expect(readCassette(cassette).rows).toHaveLength(0);
  });

  it('a terminal error stream appends exactly one row and replays exactly', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta, wireError])], cassette });
    await drain(recorded);
    const { rows } = readCassette(cassette);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.events.map((event) => event.type)).toEqual(['text-delta', 'error']);

    const [replayed] = replay({ cassette, onMiss: 'throw' });
    const seen: string[] = [];
    for await (const event of replayed.stream(req)) {
      seen.push(event.type);
    }
    expect(seen).toEqual(['text-delta', 'error']);
  });

  it('readCassette refuses an unknown cassette format version (v1.28.0 review P3)', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta, finish])], cassette });
    await drain(recorded);
    const [headerLine, ...rest] = readFileSync(cassette, 'utf8').split('\n');
    const header = JSON.parse(headerLine ?? '{}') as Record<string, unknown>;

    writeFileSync(cassette, [JSON.stringify({ ...header, v: 2 }), ...rest].join('\n'));
    expect(() => readCassette(cassette)).toThrow(/cassette format v 2/);
    expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(/cassette format v 2/);

    const { v, ...withoutV } = header;
    void v;
    writeFileSync(cassette, [JSON.stringify(withoutV), ...rest].join('\n'));
    expect(() => readCassette(cassette)).toThrow(/cassette format v undefined/);

    // hashVersion gates request identity, never the format: a current
    // hashVersion does not rescue an unknown format version.
    writeFileSync(
      cassette,
      [JSON.stringify({ ...header, v: 2, hashVersion: CURRENT_HASH_VERSION }), ...rest].join('\n'),
    );
    expect(() => readCassette(cassette)).toThrow(/cassette format v 2/);
  });

  it('a corrupt line or a malformed row reports the cassette path and line', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [adapterOf([delta, finish])], cassette });
    await drain(recorded);

    const valid = readFileSync(cassette, 'utf8');
    writeFileSync(cassette, `${valid}{{{ not json\n`);
    expect(() => readCassette(cassette)).toThrow(/session\.jsonl:3 is not valid JSON/);

    const [headerLine] = valid.split('\n');
    writeFileSync(cassette, `${String(headerLine)}\n{"foo":1}\n`);
    expect(() => readCassette(cassette)).toThrow(/session\.jsonl:2 is not a VCR row/);
  });
});
