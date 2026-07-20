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
import { fileURLToPath } from 'node:url';
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

describe('repeated hashes replay as ordered occurrences (v1.29.0 review P2 and P3)', () => {
  const caps = new FakeAdapter({ agents: { '*': 'x' } }).caps();
  const req: ChatRequest = {
    model: FAKE_MODEL,
    messages: [{ role: 'user', parts: [{ type: 'text', text: 'q' }] }],
  };
  const finishWith = (inputTokens: number, outputTokens: number): ChatEvent => ({
    type: 'finish',
    finish: { reason: 'stop' },
    usage: { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  const rateLimited: ChatEvent = {
    type: 'error',
    error: {
      code: 'agent',
      message: 'rate limited',
      retryable: true,
      data: { kind: 'rate-limit', retryAfterMs: 1 },
    },
  };
  /** An adapter answering call N of the same request with texts[N-1]. */
  const sequencedAdapter = (texts: string[]): ProviderAdapter => {
    let call = 0;
    return {
      id: 'fake',
      caps: () => caps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        const text = texts[call] ?? 'over';
        call += 1;
        yield { type: 'text-delta', text };
        yield finishWith(1, 1);
      },
    };
  };
  const textOf = async (stream: AsyncIterable<ChatEvent>): Promise<string> => {
    let text = '';
    for await (const event of stream) {
      if (event.type === 'text-delta') {
        text += event.text;
      }
    }
    return text;
  };
  const engineFor = (adapters: ProviderAdapter[]) =>
    createEngine({
      adapters,
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
  const retryWf = defineWorkflow({ name: 'vcr-retry' }, (ctx) =>
    ctx.agent('go', { retry: { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 1 } } }),
  );

  it('a recorded retry (error then success under one hash) replays both attempts in order', async () => {
    const cassette = cassettePath();
    let call = 0;
    const flaky: ProviderAdapter = {
      id: 'fake',
      caps: () => caps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        call += 1;
        if (call === 1) {
          yield { type: 'usage', usage: { inputTokens: 100 } };
          yield rateLimited;
          return;
        }
        yield { type: 'text-delta', text: 'second try' };
        yield finishWith(10, 5);
      },
    };
    const recorded = record({ adapters: [flaky], cassette });
    const recOutcome = await engineFor(recorded).run(retryWf, undefined).result;
    expect(recOutcome.status).toBe('ok');
    expect(call).toBe(2);
    expect(recOutcome.usage.inputTokens).toBe(110);

    const { rows } = readCassette(cassette);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.requestHash).toBe(rows[1]?.requestHash);

    // Before v1.30.0 the replay map collapsed the pair: the first call
    // was served the LATER success row (usage 10, no retry branch).
    const repOutcome = await engineFor(replay({ cassette, onMiss: 'throw' })).run(
      retryWf,
      undefined,
    ).result;
    expect(repOutcome.status).toBe('ok');
    expect(repOutcome.usage.inputTokens).toBe(110);
    expect(repOutcome.usage.outputTokens).toBe(5);
    expect(repOutcome.value).toBe('second try');
  });

  it('three identical sequential requests consume three rows in file order', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1', 'r2', 'r3'])], cassette });
    for (let i = 0; i < 3; i += 1) {
      await textOf(recorded.stream(req));
    }
    expect(readCassette(cassette).rows).toHaveLength(3);

    const [replayed] = replay({ cassette, onMiss: 'throw' });
    expect(await textOf(replayed.stream(req))).toBe('r1');
    expect(await textOf(replayed.stream(req))).toBe('r2');
    expect(await textOf(replayed.stream(req))).toBe('r3');
  });

  it('two concurrent identical requests claim occurrences at stream() call time', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1', 'r2'])], cassette });
    await textOf(recorded.stream(req));
    await textOf(recorded.stream(req));

    const [replayed] = replay({ cassette, onMiss: 'throw' });
    // Allocation is synchronous in the stream() call itself, so the
    // FIRST call owns row 1 even when it is drained second.
    const first = replayed.stream(req);
    const second = replayed.stream(req);
    expect(await textOf(second)).toBe('r2');
    expect(await textOf(first)).toBe('r1');
  });

  it('a call past the last occurrence is a typed exhausted miss', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1', 'r2', 'r3'])], cassette });
    for (let i = 0; i < 3; i += 1) {
      await textOf(recorded.stream(req));
    }
    const [replayed] = replay({ cassette, onMiss: 'throw' });
    for (let i = 0; i < 3; i += 1) {
      await textOf(replayed.stream(req));
    }
    let caught: unknown;
    try {
      await textOf(replayed.stream(req));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(VcrMissError);
    expect((caught as VcrMissError).recordedOccurrences).toBe(3);
    expect((caught as VcrMissError).message).toMatch(/exhausted the 3 recorded occurrences/);
    // A never-recorded request still reads as a plain miss.
    const other: ChatRequest = {
      model: FAKE_MODEL,
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'unrecorded' }] }],
    };
    await expect(textOf(replayed.stream(other))).rejects.toThrow(/no recorded row/);
  });

  it('onMiss passthrough forwards an exhausted hash to the live adapter', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1'])], cassette });
    await textOf(recorded.stream(req));

    const live = new FakeAdapter({ agents: { '*': 'live answer' } });
    const [replayed] = replay({ cassette, onMiss: 'passthrough', adapters: [live] });
    expect(await textOf(replayed.stream(req))).toBe('r1');
    expect(await textOf(replayed.stream(req))).toBe('live answer');
  });

  it('conflicting caps snapshots for one model refuse at replay build time', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1'])], cassette });
    await textOf(recorded.stream(req));
    const [headerLine, rowLine] = readFileSync(cassette, 'utf8').split('\n');
    const conflicting = JSON.parse(String(rowLine)) as {
      requestHash: string;
      caps: { contextWindow: number };
    };
    conflicting.requestHash = 'other-hash';
    conflicting.caps = { ...conflicting.caps, contextWindow: conflicting.caps.contextWindow + 1 };
    writeFileSync(
      cassette,
      `${String(headerLine)}\n${String(rowLine)}\n${JSON.stringify(conflicting)}\n`,
    );
    expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(/conflicting caps snapshots/);
  });

  it('replay refuses a row that does not record one completed exchange', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1'])], cassette });
    await textOf(recorded.stream(req));
    const [headerLine, rowLine] = readFileSync(cassette, 'utf8').split('\n');
    const template = JSON.parse(String(rowLine)) as { events: ChatEvent[] };
    const badEvents: ChatEvent[][] = [
      [{ type: 'text-delta', text: 'no terminal' }],
      [finishWith(1, 1), finishWith(1, 1)],
      [finishWith(1, 1), { type: 'text-delta', text: 'after terminal' }],
    ];
    for (const events of badEvents) {
      writeFileSync(
        cassette,
        `${String(headerLine)}\n${JSON.stringify({ ...template, events })}\n`,
      );
      expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(
        /row 1 .* does not record one completed exchange/,
      );
    }
  });

  it('readCassette validates the full documented header and row shape', async () => {
    const cassette = cassettePath();
    const [recorded] = record({ adapters: [sequencedAdapter(['r1'])], cassette });
    await textOf(recorded.stream(req));
    const [headerLine, rowLine] = readFileSync(cassette, 'utf8').split('\n');
    const header = JSON.parse(String(headerLine)) as Record<string, unknown>;
    const row = JSON.parse(String(rowLine)) as Record<string, unknown>;
    const writtenWith = (h: Record<string, unknown>, r: Record<string, unknown>): void => {
      writeFileSync(cassette, `${JSON.stringify(h)}\n${JSON.stringify(r)}\n`);
    };

    const dropped = (source: Record<string, unknown>, key: string): Record<string, unknown> => {
      const { [key]: _omitted, ...rest } = source;
      return rest;
    };
    writtenWith(dropped(header, 'hashVersion'), row);
    expect(() => readCassette(cassette)).toThrow(/header hashVersion must be an integer/);
    writtenWith({ ...header, hashVersion: 1.5 }, row);
    expect(() => readCassette(cassette)).toThrow(/header hashVersion must be an integer/);
    writtenWith(dropped(header, 'recordedAt'), row);
    expect(() => readCassette(cassette)).toThrow(/header recordedAt must be a date string/);
    writtenWith({ ...header, recordedAt: 'not a date' }, row);
    expect(() => readCassette(cassette)).toThrow(/header recordedAt must be a date string/);

    writtenWith(header, dropped(row, 'model'));
    expect(() => readCassette(cassette)).toThrow(/model must be a nonempty string/);
    writtenWith(header, dropped(row, 'caps'));
    expect(() => readCassette(cassette)).toThrow(/caps must be an object/);
    writtenWith(header, dropped(row, 'request'));
    expect(() => readCassette(cassette)).toThrow(/request must be an object/);
    writtenWith(header, { ...row, provider: 7 });
    expect(() => readCassette(cassette)).toThrow(/provider, when present, must be a string/);

    // Unknown extra fields stay tolerated for forward compatibility.
    writtenWith({ ...header, future: 'x' }, { ...row, extra: 1 });
    expect(readCassette(cassette).rows).toHaveLength(1);
  });
});

describe('cassette provenance and deep shape validation (v1.30.0 review P2 and P3)', () => {
  const caps = new FakeAdapter({ agents: { '*': 'x' } }).caps();
  const finishWith = (inputTokens: number, outputTokens: number): ChatEvent => ({
    type: 'finish',
    finish: { reason: 'stop' },
    usage: { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  /** A one answer adapter with an optional semantics/provider claim. */
  const answering = (semantics?: string, provider?: string): ProviderAdapter => ({
    id: 'fake',
    ...(provider === undefined ? {} : { provider }),
    ...(semantics === undefined ? {} : { usageSemantics: semantics }),
    caps: () => caps,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(): AsyncIterable<ChatEvent> {
      yield { type: 'text-delta', text: 'ready' };
      yield finishWith(20, 2);
    },
  });
  const engineWith = (adapters: ProviderAdapter[]) => {
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters,
      stores: { journal: store },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
    return { engine, store };
  };
  const stampsOf = async (store: InMemoryStore, runId: string): Promise<string[]> => {
    const entries = (await store.load(runId)) as unknown as { usageSemantics?: string }[];
    return entries
      .map((entry) => entry.usageSemantics)
      .filter((stamp): stamp is string => stamp !== undefined);
  };

  it.each(['openai-cache-subsets-v2', 'anthropic-cache-additive-v1', 'audit-custom-v9'])(
    'record snapshots usageSemantics %s and replay stamps a fresh journal identically',
    async (semantics) => {
      const cassette = cassettePath();
      const rec = engineWith(record({ adapters: [answering(semantics)], cassette }));
      const recHandle = rec.engine.run(wf('stamp me'), undefined);
      expect((await recHandle.result).status).toBe('ok');
      const recStamps = await stampsOf(rec.store, recHandle.runId);
      expect(recStamps.length).toBeGreaterThan(0);
      expect(new Set(recStamps)).toEqual(new Set([semantics]));
      expect(readCassette(cassette).rows[0]?.usageSemantics).toBe(semantics);

      const replayed = replay({ cassette, onMiss: 'throw' });
      expect(replayed[0]?.usageSemantics).toBe(semantics);
      const rep = engineWith(replayed);
      const repHandle = rep.engine.run(wf('stamp me'), undefined);
      expect((await repHandle.result).status).toBe('ok');
      // The acceptance of the finding: a replayed run's fresh journal
      // carries the SAME provenance stamps the recorded run got.
      expect(await stampsOf(rep.store, repHandle.runId)).toEqual(recStamps);
    },
  );

  it('a legacy cassette without usageSemantics replays unstamped and unrefused', async () => {
    const cassette = cassettePath();
    const rec = engineWith(record({ adapters: [answering()], cassette }));
    expect((await rec.engine.run(wf('legacy'), undefined).result).status).toBe('ok');
    expect(readFileSync(cassette, 'utf8')).not.toContain('usageSemantics');

    const replayed = replay({ cassette, onMiss: 'throw' });
    expect(replayed[0]?.usageSemantics).toBeUndefined();
    const rep = engineWith(replayed);
    const repHandle = rep.engine.run(wf('legacy'), undefined);
    expect((await repHandle.result).status).toBe('ok');
    expect(await stampsOf(rep.store, repHandle.runId)).toEqual([]);
  });

  it('conflicting usageSemantics or provider declarations refuse at replay build', async () => {
    const cassette = cassettePath();
    for (const semantics of ['semantics-a', 'semantics-b']) {
      const rec = engineWith(record({ adapters: [answering(semantics)], cassette }));
      expect((await rec.engine.run(wf(semantics), undefined).result).status).toBe('ok');
    }
    expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(
      /conflicting usageSemantics values for adapter 'fake' \('semantics-a', 'semantics-b'\)/,
    );

    const mixed = cassettePath();
    const stamped = engineWith(record({ adapters: [answering('semantics-a')], cassette: mixed }));
    expect((await stamped.engine.run(wf('one'), undefined).result).status).toBe('ok');
    const silent = engineWith(record({ adapters: [answering()], cassette: mixed }));
    expect((await silent.engine.run(wf('two'), undefined).result).status).toBe('ok');
    expect(() => replay({ cassette: mixed, onMiss: 'throw' })).toThrow(
      /conflicting usageSemantics values for adapter 'fake' \('semantics-a', absent\)/,
    );

    const families = cassettePath();
    for (const family of ['family-a', 'family-b']) {
      const rec = engineWith(
        record({ adapters: [answering(undefined, family)], cassette: families }),
      );
      expect((await rec.engine.run(wf(family), undefined).result).status).toBe('ok');
    }
    expect(() => replay({ cassette: families, onMiss: 'throw' })).toThrow(
      /conflicting provider values for adapter 'fake' \('family-a', 'family-b'\)/,
    );
  });

  const headerText = JSON.stringify({
    v: 1,
    kind: 'rulvar-vcr',
    hashVersion: CURRENT_HASH_VERSION,
    recordedAt: '2026-07-20T00:00:00.000Z',
  });
  const rowWith = (over: Record<string, unknown>): Record<string, unknown> => ({
    adapterId: 'fake',
    requestHash: 'a'.repeat(64),
    request: {},
    events: [{ type: 'text-delta', text: 'x' }, finishWith(1, 1)],
    caps,
    model: FAKE_MODEL,
    ...over,
  });
  const cassetteWith = (...rows: Record<string, unknown>[]): string => {
    const path = cassettePath();
    writeFileSync(
      path,
      `${[headerText, ...rows.map((row) => JSON.stringify(row))].join('\n')}\n`,
      'utf8',
    );
    return path;
  };
  const fullUsage = { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };

  it.each([
    {
      name: 'a request recorded as an array',
      over: { request: [] },
      pattern: /request must be an object/,
    },
    {
      name: 'a null event element',
      over: { events: [null, finishWith(1, 1)] },
      pattern: /events\[0\] must be an object \(a canonical ChatEvent\)/,
    },
    {
      name: 'a bare finish event without its payload',
      over: { events: [{ type: 'finish' }] },
      pattern: /events\[0\]\.finish must be an object/,
    },
    {
      name: 'a finish event with a reason outside the vocabulary',
      over: { events: [{ type: 'finish', finish: { reason: 'done' }, usage: fullUsage }] },
      pattern: /events\[0\]\.finish\.reason must be a canonical finish reason/,
    },
    {
      name: 'a finish usage violating the Usage invariant',
      over: {
        events: [
          { type: 'finish', finish: { reason: 'stop' }, usage: { ...fullUsage, outputTokens: -2 } },
        ],
      },
      pattern: /events\[0\]\.usage violates the Usage invariant: outputTokens is negative/,
    },
    {
      name: 'a refusal finish without its provider',
      over: {
        events: [{ type: 'finish', finish: { reason: 'refusal', refusal: {} }, usage: fullUsage }],
      },
      pattern: /events\[0\]\.finish\.refusal must be an object naming the provider/,
    },
    {
      name: 'a fractional partial usage event',
      over: { events: [{ type: 'usage', usage: { inputTokens: 1.5 } }, finishWith(1, 1)] },
      pattern: /events\[0\]\.usage\.inputTokens must be a nonnegative safe integer when present/,
    },
    {
      name: 'an error event without a WireError shape',
      over: { events: [{ type: 'error', error: { message: 'boom' } }] },
      pattern: /events\[0\]\.error\.code must be a nonempty string/,
    },
    {
      name: 'an unknown event type',
      over: { events: [{ type: 'telemetry-blob' }, finishWith(1, 1)] },
      pattern: /events\[0\]\.type must be a canonical ChatEvent type; got 'telemetry-blob'/,
    },
    {
      name: 'an empty caps object',
      over: { caps: {} },
      pattern: /caps\.structuredOutput must be 'native', 'forced-tool', or 'prompt'/,
    },
    {
      name: 'caps with a malformed pricing tier',
      over: {
        caps: {
          ...caps,
          pricing: {
            inputUsdPerMTok: 1,
            outputUsdPerMTok: 1,
            tiers: [{ aboveInputTokens: -1, inputMultiplier: 1, outputMultiplier: 1 }],
          },
        },
      },
      pattern: /caps\.pricing\.tiers\[0\]\.aboveInputTokens must be a nonnegative safe integer/,
    },
    {
      name: 'an empty usageSemantics',
      over: { usageSemantics: '' },
      pattern: /usageSemantics, when present, must be a nonempty string/,
    },
  ])('readCassette refuses $name at the cassette line', ({ over, pattern }) => {
    const path = cassetteWith(rowWith(over));
    expect(() => readCassette(path)).toThrow(pattern);
    expect(() => readCassette(path)).toThrow(/:2 is not a VCR row/);
  });

  it('unknown extra fields on the header, row, and events stay tolerated', () => {
    const path = cassettePath();
    const header = { ...(JSON.parse(headerText) as Record<string, unknown>), future: true };
    const row = rowWith({
      futureRowField: 1,
      events: [{ type: 'text-delta', text: 'x', futureEventField: 'y' }, finishWith(1, 1)],
    });
    writeFileSync(path, `${JSON.stringify(header)}\n${JSON.stringify(row)}\n`, 'utf8');
    expect(readCassette(path).rows).toHaveLength(1);
    expect(() => replay({ cassette: path, onMiss: 'throw' })).not.toThrow();
  });

  it('the committed anthropic cassette passes the deep validation unchanged', () => {
    const committed = fileURLToPath(
      new URL('../../../cassettes/vcr/anthropic.jsonl', import.meta.url),
    );
    const { rows } = readCassette(committed);
    expect(rows.length).toBeGreaterThan(0);
  });
});
