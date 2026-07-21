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

  it('three identical sequential requests consume three rows in recorded order', async () => {
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

describe('passthrough provenance, caller order occurrences, and deep finish shapes (v1.31.0 review P2 and P3)', () => {
  const caps = new FakeAdapter({ agents: { '*': 'x' } }).caps();
  const finishWith = (inputTokens: number, outputTokens: number): ChatEvent => ({
    type: 'finish',
    finish: { reason: 'stop' },
    usage: { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  const req: ChatRequest = {
    model: FAKE_MODEL,
    messages: [{ role: 'user', parts: [{ type: 'text', text: 'same' }] }],
  };
  /** A one answer adapter with optional semantics/provider claims. */
  const answering = (text: string, semantics?: string, provider?: string): ProviderAdapter => ({
    id: 'fake',
    ...(provider === undefined ? {} : { provider }),
    ...(semantics === undefined ? {} : { usageSemantics: semantics }),
    caps: () => caps,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(): AsyncIterable<ChatEvent> {
      yield { type: 'text-delta', text };
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
  const textOf = async (stream: AsyncIterable<ChatEvent>): Promise<string> => {
    let text = '';
    for await (const event of stream) {
      if (event.type === 'text-delta') {
        text += event.text;
      }
    }
    return text;
  };
  /** An adapter whose FIRST call finishes only after `release()`. */
  const gatedPair = (): { adapter: ProviderAdapter; release: () => void } => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    return {
      adapter: {
        id: 'fake',
        caps: () => caps,
        async *stream(): AsyncIterable<ChatEvent> {
          calls += 1;
          if (calls === 1) {
            yield { type: 'text-delta', text: 'FIRST_CALL' };
            await gate;
            yield finishWith(1, 1);
          } else {
            yield { type: 'text-delta', text: 'SECOND_CALL' };
            yield finishWith(1, 1);
          }
        },
      },
      release: () => {
        release();
      },
    };
  };

  it('a passthrough declaration mismatch refuses at replay construction, absent versus present included', async () => {
    const cassette = cassettePath();
    const rec = engineWith(
      record({ adapters: [answering('recorded', 'recorded-semantics-v1', 'family-a')], cassette }),
    );
    expect((await rec.engine.run(wf('seed'), undefined).result).status).toBe('ok');

    expect(() =>
      replay({
        cassette,
        onMiss: 'passthrough',
        adapters: [answering('live', 'live-semantics-v2', 'family-a')],
      }),
    ).toThrow(
      /records usageSemantics 'recorded-semantics-v1' for adapter 'fake' but the live passthrough adapter declares 'live-semantics-v2'/,
    );
    expect(() =>
      replay({
        cassette,
        onMiss: 'passthrough',
        adapters: [answering('live', 'recorded-semantics-v1', 'family-b')],
      }),
    ).toThrow(/records provider 'family-a' .* declares 'family-b'/);
    expect(() =>
      replay({
        cassette,
        onMiss: 'passthrough',
        adapters: [answering('live', undefined, 'family-a')],
      }),
    ).toThrow(/records usageSemantics 'recorded-semantics-v1' .* declares absent/);

    // The reverse absence: unstamped legacy rows, a stamped live one.
    const legacy = cassettePath();
    const legacyRec = engineWith(record({ adapters: [answering('recorded')], cassette: legacy }));
    expect((await legacyRec.engine.run(wf('seed'), undefined).result).status).toBe('ok');
    expect(() =>
      replay({
        cassette: legacy,
        onMiss: 'passthrough',
        adapters: [answering('live', 'live-semantics-v2')],
      }),
    ).toThrow(/records usageSemantics absent .* declares 'live-semantics-v2'/);
  });

  it('matching declarations serve a live miss under the shared truthful stamp', async () => {
    const cassette = cassettePath();
    const rec = engineWith(
      record({ adapters: [answering('recorded answer', 'shared-semantics', 'family')], cassette }),
    );
    expect((await rec.engine.run(wf('the recorded one'), undefined).result).status).toBe('ok');

    const wrappers = replay({
      cassette,
      onMiss: 'passthrough',
      adapters: [answering('live answer', 'shared-semantics', 'family')],
    });
    expect(wrappers[0]?.usageSemantics).toBe('shared-semantics');
    expect(wrappers[0]?.provider).toBe('family');
    const rep = engineWith(wrappers);
    const handle = rep.engine.run(wf('never recorded'), undefined);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('live answer');
    const stamps = await stampsOf(rep.store, handle.runId);
    expect(stamps.length).toBeGreaterThan(0);
    expect(new Set(stamps)).toEqual(new Set(['shared-semantics']));
  });

  it('a live only passthrough adapter keeps its declarations and stamps its journal', async () => {
    const cassette = cassettePath();
    record({ adapters: [], cassette });
    const wrappers = replay({
      cassette,
      onMiss: 'passthrough',
      adapters: [answering('live answer', 'live-semantics-v2', 'live-provider')],
    });
    expect(wrappers[0]?.provider).toBe('live-provider');
    expect(wrappers[0]?.usageSemantics).toBe('live-semantics-v2');
    const rep = engineWith(wrappers);
    const handle = rep.engine.run(wf('anything'), undefined);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('live answer');
    const stamps = await stampsOf(rep.store, handle.runId);
    expect(stamps.length).toBeGreaterThan(0);
    expect(new Set(stamps)).toEqual(new Set(['live-semantics-v2']));
  });

  it('onMiss throw keeps recorded declarations unchecked against a caps only live adapter', async () => {
    const cassette = cassettePath();
    const rec = engineWith(
      record({ adapters: [answering('recorded', 'recorded-semantics-v1')], cassette }),
    );
    expect((await rec.engine.run(wf('seed'), undefined).result).status).toBe('ok');
    const wrappers = replay({
      cassette,
      onMiss: 'throw',
      adapters: [answering('live', 'live-semantics-v2')],
    });
    expect(wrappers[0]?.usageSemantics).toBe('recorded-semantics-v1');
  });

  it('concurrent identical calls that complete out of order replay to the callers that made them', async () => {
    const cassette = cassettePath();
    const { adapter, release } = gatedPair();
    const [recorded] = record({ adapters: [adapter], cassette });
    const firstP = textOf(recorded.stream(req));
    await Promise.resolve();
    const secondP = textOf(recorded.stream(req));
    expect(await secondP).toBe('SECOND_CALL');
    release();
    expect(await firstP).toBe('FIRST_CALL');

    // The file holds COMPLETION order; the occurrence numbers hold
    // the call order.
    const { rows } = readCassette(cassette);
    expect(rows.map((row) => row.occurrence)).toEqual([1, 0]);

    const [replayed] = replay({ cassette, onMiss: 'throw' });
    expect(await textOf(replayed.stream(req))).toBe('FIRST_CALL');
    expect(await textOf(replayed.stream(req))).toBe('SECOND_CALL');
  });

  it('an aborted call leaves a numbering gap that replay serves through', async () => {
    const cassette = cassettePath();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const flaky: ProviderAdapter = {
      id: 'fake',
      caps: () => caps,
      async *stream(): AsyncIterable<ChatEvent> {
        calls += 1;
        if (calls === 1) {
          yield { type: 'text-delta', text: 'OCC0' };
          await gate;
          yield finishWith(1, 1);
        } else if (calls === 2) {
          throw new Error('wire failure');
        } else {
          yield { type: 'text-delta', text: 'OCC2' };
          yield finishWith(1, 1);
        }
      },
    };
    const [recorded] = record({ adapters: [flaky], cassette });
    const firstP = textOf(recorded.stream(req));
    await Promise.resolve();
    await expect(textOf(recorded.stream(req))).rejects.toThrow('wire failure');
    expect(await textOf(recorded.stream(req))).toBe('OCC2');
    release();
    expect(await firstP).toBe('OCC0');

    const { rows } = readCassette(cassette);
    expect(rows.map((row) => row.occurrence)).toEqual([2, 0]);

    const [replayed] = replay({ cassette, onMiss: 'throw' });
    expect(await textOf(replayed.stream(req))).toBe('OCC0');
    expect(await textOf(replayed.stream(req))).toBe('OCC2');
  });

  it('groups without complete occurrence numbers keep file order', async () => {
    const cassette = cassettePath();
    let call = 0;
    const sequenced: ProviderAdapter = {
      id: 'fake',
      caps: () => caps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        const text = ['r1', 'r2'][call] ?? 'over';
        call += 1;
        yield { type: 'text-delta', text };
        yield finishWith(1, 1);
      },
    };
    const [recorded] = record({ adapters: [sequenced], cassette });
    await textOf(recorded.stream(req));
    await textOf(recorded.stream(req));
    const [headerLine, first, second] = readFileSync(cassette, 'utf8').trim().split('\n');
    const withoutOccurrence = (line: string | undefined): string => {
      const { occurrence, ...rest } = JSON.parse(String(line)) as Record<string, unknown>;
      void occurrence;
      return JSON.stringify(rest);
    };

    // Both rows unnumbered and swapped on disk: file order wins.
    writeFileSync(
      cassette,
      `${String(headerLine)}\n${withoutOccurrence(second)}\n${withoutOccurrence(first)}\n`,
    );
    const [legacy] = replay({ cassette, onMiss: 'throw' });
    expect(await textOf(legacy.stream(req))).toBe('r2');
    expect(await textOf(legacy.stream(req))).toBe('r1');

    // A mixed group (one numbered row, one legacy) keeps file order
    // too: sorting applies only when every row carries the number.
    writeFileSync(
      cassette,
      `${String(headerLine)}\n${String(second)}\n${withoutOccurrence(first)}\n`,
    );
    const [mixed] = replay({ cassette, onMiss: 'throw' });
    expect(await textOf(mixed.stream(req))).toBe('r2');
    expect(await textOf(mixed.stream(req))).toBe('r1');
  });

  it('a parallel workflow replays each agent the response its call received live', async () => {
    const cassette = cassettePath();
    const { adapter, release } = gatedPair();
    const pair = defineWorkflow({ name: 'pair' }, async (ctx) => {
      const firstP = ctx.agent('same prompt');
      const secondP = ctx.agent('same prompt');
      const second = await secondP;
      release();
      const first = await firstP;
      return [first, second];
    });
    const rec = engineWith(record({ adapters: [adapter], cassette }));
    const recOutcome = await rec.engine.run(pair, undefined).result;
    expect(recOutcome.status).toBe('ok');
    expect(recOutcome.value).toEqual(['FIRST_CALL', 'SECOND_CALL']);

    // Before the fix the replay callers swapped responses:
    // ['SECOND_CALL', 'FIRST_CALL'].
    const repOutcome = await engineWith(replay({ cassette, onMiss: 'throw' })).engine.run(
      pair,
      undefined,
    ).result;
    expect(repOutcome.status).toBe('ok');
    expect(repOutcome.value).toEqual(['FIRST_CALL', 'SECOND_CALL']);
  });

  const headerText = JSON.stringify({
    v: 1,
    kind: 'rulvar-vcr',
    hashVersion: CURRENT_HASH_VERSION,
    recordedAt: '2026-07-20T00:00:00.000Z',
  });
  const fullUsage = { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };
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

  it.each([
    {
      name: 'a tool call end without args',
      over: { events: [{ type: 'tool-call-end', id: 'call-1' }, finishWith(1, 1)] },
      pattern: /events\[0\]\.args must be present/,
    },
    {
      name: 'a refusal stopDetails that is not an object',
      over: {
        events: [
          {
            type: 'finish',
            finish: {
              reason: 'refusal',
              refusal: { provider: 'openai', stopDetails: 'not-an-object' },
            },
            usage: fullUsage,
          },
        ],
      },
      pattern: /events\[0\]\.finish\.refusal\.stopDetails must be an object when present/,
    },
    {
      name: 'a refusal stopDetails field that is not a string',
      over: {
        events: [
          {
            type: 'finish',
            finish: {
              reason: 'refusal',
              refusal: { provider: 'openai', stopDetails: { category: 7 } },
            },
            usage: fullUsage,
          },
        ],
      },
      pattern: /events\[0\]\.finish\.refusal\.stopDetails\.category must be a string when present/,
    },
    {
      name: 'a finish providerMetadata that is an array',
      over: {
        events: [
          { type: 'finish', finish: { reason: 'stop' }, usage: fullUsage, providerMetadata: [] },
        ],
      },
      pattern: /events\[0\]\.providerMetadata must be a plain object when present/,
    },
    {
      name: 'a null finish providerMetadata',
      over: {
        events: [
          { type: 'finish', finish: { reason: 'stop' }, usage: fullUsage, providerMetadata: null },
        ],
      },
      pattern: /events\[0\]\.providerMetadata must be a plain object when present/,
    },
    {
      name: 'a fractional occurrence',
      over: { occurrence: 1.5 },
      pattern: /occurrence, when present, must be a nonnegative safe integer/,
    },
    {
      name: 'a negative occurrence',
      over: { occurrence: -1 },
      pattern: /occurrence, when present, must be a nonnegative safe integer/,
    },
  ])('readCassette refuses $name at the cassette line', ({ over, pattern }) => {
    const path = cassetteWith(rowWith(over));
    expect(() => readCassette(path)).toThrow(pattern);
    expect(() => readCassette(path)).toThrow(/:2 is not a VCR row/);
  });

  it('null args, full refusal details, object provider metadata, and occurrence numbers stay accepted', () => {
    const path = cassetteWith(
      rowWith({
        occurrence: 0,
        events: [
          { type: 'tool-call-start', id: 'call-1', name: 'lookup' },
          { type: 'tool-call-end', id: 'call-1', args: null },
          {
            type: 'finish',
            finish: {
              reason: 'refusal',
              refusal: {
                provider: 'openai',
                stopDetails: { type: 'policy', category: 'safety', explanation: 'why' },
              },
            },
            usage: fullUsage,
            providerMetadata: { requestId: 'req-1' },
          },
        ],
      }),
    );
    expect(readCassette(path).rows).toHaveLength(1);
    expect(() => replay({ cassette: path, onMiss: 'throw' })).not.toThrow();
  });
});

describe('appending record sessions and occurrence integrity (v1.32.0 review P2)', () => {
  const caps = new FakeAdapter({ agents: { '*': 'x' } }).caps();
  const finishWith = (inputTokens: number, outputTokens: number): ChatEvent => ({
    type: 'finish',
    finish: { reason: 'stop' },
    usage: { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  /** An adapter answering the queued texts one call at a time. */
  const sequenced = (texts: string[], id = 'fake'): ProviderAdapter => {
    const queue = [...texts];
    return {
      id,
      caps: () => caps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        yield { type: 'text-delta', text: queue.shift() ?? 'EXHAUSTED' };
        yield finishWith(2, 1);
      },
    };
  };
  /** Runs `count` sequential identical agent calls; resolves their answers. */
  const run = async (adapters: ProviderAdapter[], count: number): Promise<unknown> => {
    const workflow = defineWorkflow({ name: 'same-prompt' }, async (ctx) => {
      const answers: unknown[] = [];
      for (let call = 0; call < count; call += 1) {
        answers.push(await ctx.agent('same prompt'));
      }
      return answers;
    });
    const engine = createEngine({
      adapters,
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
    const outcome = await engine.run(workflow, undefined).result;
    expect(outcome.status).toBe('ok');
    return outcome.value;
  };
  const cassetteLines = (cassette: string): string[] =>
    readFileSync(cassette, 'utf8')
      .split('\n')
      .filter((line) => line !== '');
  const rowTexts = (cassette: string): string[] =>
    readCassette(cassette).rows.map((row) =>
      row.events.map((event) => (event.type === 'text-delta' ? event.text : '')).join(''),
    );
  const rowOccurrences = (cassette: string): (number | undefined)[] =>
    readCassette(cassette).rows.map((row) => row.occurrence);

  it('a second record session continues the numbering and replay serves the call order across sessions', async () => {
    const cassette = cassettePath();
    expect(await run(record({ adapters: [sequenced(['A', 'B'])], cassette }), 2)).toEqual([
      'A',
      'B',
    ]);
    expect(await run(record({ adapters: [sequenced(['C'])], cassette }), 1)).toEqual(['C']);

    expect(rowTexts(cassette)).toEqual(['A', 'B', 'C']);
    expect(rowOccurrences(cassette)).toEqual([0, 1, 2]);
    // Exactly one header line: an appending session never writes a second.
    const lines = cassetteLines(cassette);
    expect(lines).toHaveLength(4);
    expect(lines.filter((line) => line.includes('"rulvar-vcr"'))).toHaveLength(1);

    expect(await run(replay({ cassette, onMiss: 'throw' }), 3)).toEqual(['A', 'B', 'C']);
  });

  it('seeding skips past a gap instead of filling it', async () => {
    const cassette = cassettePath();
    await run(record({ adapters: [sequenced(['A', 'B'])], cassette }), 2);
    // An aborted call between A and B would have claimed 1 and appended
    // nothing; simulate that history by renumbering the B row to 2.
    const lines = cassetteLines(cassette);
    const moved = { ...(JSON.parse(lines[2] ?? '') as Record<string, unknown>), occurrence: 2 };
    writeFileSync(cassette, `${[lines[0], lines[1], JSON.stringify(moved)].join('\n')}\n`, 'utf8');

    await run(record({ adapters: [sequenced(['C'])], cassette }), 1);
    expect(rowOccurrences(cassette)).toEqual([0, 2, 3]);
    expect(await run(replay({ cassette, onMiss: 'throw' }), 3)).toEqual(['A', 'B', 'C']);
  });

  it('appending to a group recorded before v1.32.0 keeps the documented file order mode', async () => {
    const cassette = cassettePath();
    await run(record({ adapters: [sequenced(['A'])], cassette }), 1);
    const lines = cassetteLines(cassette);
    const legacy = JSON.parse(lines[1] ?? '') as Record<string, unknown>;
    delete legacy.occurrence;
    writeFileSync(cassette, `${[lines[0], JSON.stringify(legacy)].join('\n')}\n`, 'utf8');

    await run(record({ adapters: [sequenced(['B'])], cassette }), 1);
    expect(rowOccurrences(cassette)).toEqual([undefined, 0]);
    // The mixed group is served in file order, never sorted by the
    // numbers only some rows carry.
    expect(await run(replay({ cassette, onMiss: 'throw' }), 2)).toEqual(['A', 'B']);
  });

  it('a duplicate occurrence refuses replay and appending record as ambiguous', async () => {
    const cassette = cassettePath();
    await run(record({ adapters: [sequenced(['D1'])], cassette }), 1);
    const lines = cassetteLines(cassette);
    writeFileSync(cassette, `${[...lines, lines[1]].join('\n')}\n`, 'utf8');

    expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(
      /records occurrence 0 twice for adapter 'fake' hash \S+ two recorder sessions/,
    );
    expect(() => record({ adapters: [sequenced(['D2'])], cassette })).toThrow(
      /records occurrence 0 twice/,
    );
  });

  it('two concurrently constructed recorders collide and replay refuses instead of guessing', async () => {
    const cassette = cassettePath();
    const first = record({ adapters: [sequenced(['A'])], cassette });
    const second = record({ adapters: [sequenced(['B'])], cassette });
    expect(await run(first, 1)).toEqual(['A']);
    expect(await run(second, 1)).toEqual(['B']);

    expect(rowOccurrences(cassette)).toEqual([0, 0]);
    expect(() => replay({ cassette, onMiss: 'throw' })).toThrow(/records occurrence 0 twice/);
  });

  it('record refuses a target file that was never a cassette, and an empty one', () => {
    const garbage = cassettePath();
    writeFileSync(garbage, 'this file was never a cassette\n', 'utf8');
    expect(() => record({ adapters: [sequenced(['A'])], cassette: garbage })).toThrow(
      /is not valid JSON; the cassette is corrupt or truncated/,
    );

    const wrongKind = cassettePath();
    writeFileSync(wrongKind, '{"kind":"something-else"}\n', 'utf8');
    expect(() => record({ adapters: [sequenced(['A'])], cassette: wrongKind })).toThrow(
      /is not a rulvar VCR cassette/,
    );

    const empty = cassettePath();
    writeFileSync(empty, '', 'utf8');
    expect(() => record({ adapters: [sequenced(['A'])], cassette: empty })).toThrow(
      /is not a rulvar VCR cassette/,
    );
  });

  it('record refuses appending under a different hashVersion', async () => {
    const cassette = cassettePath();
    await run(record({ adapters: [sequenced(['A'])], cassette }), 1);
    const lines = cassetteLines(cassette);
    const header = {
      ...(JSON.parse(lines[0] ?? '') as Record<string, unknown>),
      hashVersion: CURRENT_HASH_VERSION - 1,
    };
    writeFileSync(cassette, `${[JSON.stringify(header), lines[1]].join('\n')}\n`, 'utf8');

    expect(() => record({ adapters: [sequenced(['B'])], cassette })).toThrow(
      /appending would mix two identity profiles under one header/,
    );
  });

  it('occurrence seeding is scoped per adapter id', async () => {
    const cassette = cassettePath();
    const req: ChatRequest = {
      model: FAKE_MODEL,
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'same' }] }],
    };
    const only = (adapters: ProviderAdapter[]): ProviderAdapter => {
      const [head] = adapters;
      if (head === undefined) {
        throw new Error('expected one wrapped adapter');
      }
      return head;
    };
    const drain = async (adapter: ProviderAdapter): Promise<string> => {
      let text = '';
      for await (const event of adapter.stream(req)) {
        if (event.type === 'text-delta') {
          text += event.text;
        }
      }
      return text;
    };
    const fake = only(record({ adapters: [sequenced(['A', 'B'])], cassette }));
    expect(await drain(fake)).toBe('A');
    expect(await drain(fake)).toBe('B');
    // A different adapter id starts its own numbering at zero even for
    // the same request hash; the same id seeds past its own rows.
    expect(await drain(only(record({ adapters: [sequenced(['C'], 'other')], cassette })))).toBe(
      'C',
    );
    expect(await drain(only(record({ adapters: [sequenced(['D'])], cassette })))).toBe('D');

    expect(readCassette(cassette).rows.map((row) => [row.adapterId, row.occurrence])).toEqual([
      ['fake', 0],
      ['fake', 1],
      ['other', 0],
      ['fake', 2],
    ]);
  });
});

describe('occurrence numbering boundaries (v1.33.0 review P3)', () => {
  const caps = new FakeAdapter({ agents: { '*': 'x' } }).caps();
  const finishWith = (inputTokens: number, outputTokens: number): ChatEvent => ({
    type: 'finish',
    finish: { reason: 'stop' },
    usage: { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  /** An adapter that counts how often the provider was dispatched. */
  const counted = (): { adapter: ProviderAdapter; calls: () => number } => {
    let calls = 0;
    return {
      calls: () => calls,
      adapter: {
        id: 'fake',
        caps: () => caps,
        // eslint-disable-next-line @typescript-eslint/require-await
        async *stream(): AsyncIterable<ChatEvent> {
          calls += 1;
          yield { type: 'text-delta', text: 'X' };
          yield finishWith(2, 1);
        },
      },
    };
  };
  const req: ChatRequest = {
    model: FAKE_MODEL,
    messages: [{ role: 'user', parts: [{ type: 'text', text: 'same' }] }],
  };
  const only = (adapters: ProviderAdapter[]): ProviderAdapter => {
    const [head] = adapters;
    if (head === undefined) {
      throw new Error('expected one wrapped adapter');
    }
    return head;
  };
  const drain = async (adapter: ProviderAdapter): Promise<string> => {
    let text = '';
    for await (const event of adapter.stream(req)) {
      if (event.type === 'text-delta') {
        text += event.text;
      }
    }
    return text;
  };
  const lines = (cassette: string): string[] =>
    readFileSync(cassette, 'utf8')
      .split('\n')
      .filter((line) => line !== '');
  const renumberLast = (cassette: string, occurrence: number): void => {
    const all = lines(cassette);
    const last = { ...(JSON.parse(all.at(-1) ?? '') as Record<string, unknown>), occurrence };
    writeFileSync(cassette, `${[...all.slice(0, -1), JSON.stringify(last)].join('\n')}\n`, 'utf8');
  };

  it('a group that already numbers MAX_SAFE_INTEGER refuses the appending session at construction', async () => {
    const cassette = cassettePath();
    await drain(only(record({ adapters: [counted().adapter], cassette })));
    renumberLast(cassette, Number.MAX_SAFE_INTEGER);
    expect(readCassette(cassette).rows[0]?.occurrence).toBe(Number.MAX_SAFE_INTEGER);

    const before = readFileSync(cassette, 'utf8');
    const appender = counted();
    const construct = (): ProviderAdapter[] => record({ adapters: [appender.adapter], cassette });
    expect(construct).toThrow(/reached the safe integer ceiling/);
    expect(construct).toThrow(/adapter 'fake' hash \S{12};/);
    // The refusal is free and clean: no provider dispatch, no write.
    expect(appender.calls()).toBe(0);
    expect(readFileSync(cassette, 'utf8')).toBe(before);
  });

  it('a counter that would pass MAX_SAFE_INTEGER refuses that call before the provider', async () => {
    const cassette = cassettePath();
    await drain(only(record({ adapters: [counted().adapter], cassette })));
    renumberLast(cassette, Number.MAX_SAFE_INTEGER - 1);

    // The seed itself is MAX_SAFE_INTEGER, a valid occurrence: one
    // more exchange fits, and the file stays fully readable after it.
    const appender = counted();
    const wrapped = only(record({ adapters: [appender.adapter], cassette }));
    expect(await drain(wrapped)).toBe('X');
    expect(readCassette(cassette).rows.map((row) => row.occurrence)).toEqual([
      Number.MAX_SAFE_INTEGER - 1,
      Number.MAX_SAFE_INTEGER,
    ]);

    // The next claim would land past the safe range, where float
    // addition stalls and duplicates; it refuses synchronously, and
    // the refusal repeats on every further attempt.
    const before = readFileSync(cassette, 'utf8');
    expect(() => wrapped.stream(req)).toThrow(/no safe occurrence number left/);
    expect(() => wrapped.stream(req)).toThrow(/adapter 'fake' hash \S{12};/);
    expect(appender.calls()).toBe(1);
    expect(readFileSync(cassette, 'utf8')).toBe(before);
  });

  it('a large fully numbered group seeds in one pass and appends past it', async () => {
    const cassette = cassettePath();
    await drain(only(record({ adapters: [counted().adapter], cassette })));
    const all = lines(cassette);
    const template = JSON.parse(all[1] ?? '') as Record<string, unknown>;
    const rows = [all[0] ?? ''];
    for (let index = 0; index < 150000; index += 1) {
      rows.push(JSON.stringify({ ...template, occurrence: index }));
    }
    writeFileSync(cassette, `${rows.join('\n')}\n`, 'utf8');

    // Construction used to die here with an untyped RangeError from
    // spreading the group into Math.max.
    const appender = counted();
    const wrapped = only(record({ adapters: [appender.adapter], cassette }));
    expect(await drain(wrapped)).toBe('X');
    const appended = JSON.parse(lines(cassette).at(-1) ?? '') as { occurrence?: number };
    expect(appended.occurrence).toBe(150000);
  }, 20000);
});
