/**
 * FakeAdapter abort compliance: the fake obeys the same AbortSignal
 * contract as live adapters (adapter-authors guide), so cancellation,
 * deadline, and budget tests over createTestEngine observe production
 * journal shapes instead of false agent:ok terminals.
 */
import { describe, expect, it } from 'vitest';

import { defineWorkflow, type ChatEvent, type ChatRequest } from '@rulvar/core';
import { FakeAdapter, fakeToolCalls } from './fake-adapter.js';
import { createTestEngine } from './test-engine.js';

const helloReq = (): ChatRequest => ({
  model: 'fake-model',
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
});

async function drain(stream: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

function agentStatuses(entries: readonly unknown[]): string[] {
  return entries
    .map((entry) => entry as { kind?: string; status?: string })
    .filter((entry) => entry.kind === 'agent')
    .map((entry) => entry.status ?? '');
}

describe('FakeAdapter abort compliance', () => {
  it('a pre-aborted signal yields no events, runs no responder, records no call', async () => {
    let ran = false;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          ran = true;
          return 'never seen';
        },
      },
    });
    const controller = new AbortController();
    controller.abort('pre-aborted');
    const events = await drain(adapter.stream(helloReq(), controller.signal));
    expect(events).toEqual([]);
    expect(ran).toBe(false);
    expect(adapter.calls).toHaveLength(0);
  });

  it('a live signal that never fires leaves the served stream identical', async () => {
    const agents = { '*': fakeToolCalls({ name: 'deploy', args: { site: 'prod' } }) };
    // Minted tool-call ids differ between adapter instances; the
    // contract under test is everything else.
    const withoutIds = (events: ChatEvent[]): unknown[] =>
      events.map((event) => ('id' in event ? { ...event, id: '<minted>' } : event));
    const bare = await drain(new FakeAdapter({ agents }).stream(helloReq()));
    const withSignal = await drain(
      new FakeAdapter({ agents }).stream(helloReq(), new AbortController().signal),
    );
    expect(withoutIds(withSignal)).toEqual(withoutIds(bare));
    expect(bare.at(-1)?.type).toBe('finish');
  });

  it('an abort while an async responder is pending ends the stream promptly, no terminal event', async () => {
    let releaseResponder: (value: string) => void = () => undefined;
    let responderSettled = false;
    const adapter = new FakeAdapter({
      agents: {
        '*': () =>
          new Promise<string>((resolve) => {
            releaseResponder = (value) => {
              responderSettled = true;
              resolve(value);
            };
          }),
      },
    });
    const controller = new AbortController();
    const drained = drain(adapter.stream(helloReq(), controller.signal));
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort('mid-flight');
    const events = await drained;
    expect(events).toEqual([]);
    // The iterator finished while the responder was still pending.
    expect(responderSettled).toBe(false);
    // This request WAS served before the abort, so it stays recorded.
    expect(adapter.calls).toHaveLength(1);
    releaseResponder('late value, discarded');
  });

  it('a detached responder rejection after abort is not an unhandled rejection', async () => {
    let rejectResponder: (reason: Error) => void = () => undefined;
    const adapter = new FakeAdapter({
      agents: {
        '*': () =>
          new Promise<string>((_resolve, reject) => {
            rejectResponder = reject;
          }),
      },
    });
    const controller = new AbortController();
    const drained = drain(adapter.stream(helloReq(), controller.signal));
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort('mid-flight');
    await drained;

    const seen: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      seen.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      rejectResponder(new Error('late failure of abandoned work'));
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      expect(seen).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('an engine run with a pre-aborted signal settles cancelled with zero adapter work', async () => {
    const engine = createTestEngine({ agents: { '*': 'stub text' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('hello'));
    const controller = new AbortController();
    controller.abort('pre-aborted');
    const handle = engine.run(wf, undefined, { signal: controller.signal });
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(engine.fake.calls).toHaveLength(0);
    const entries = await engine.stores.journal.load(handle.runId);
    expect(agentStatuses(entries)).not.toContain('ok');
  });

  it('cancelling an in-flight run settles promptly and journals the agent cancelled, not ok', async () => {
    let releaseResponder: (value: string) => void = () => undefined;
    let responderSettled = false;
    let markEntered: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const engine = createTestEngine({
      agents: {
        '*': () => {
          markEntered();
          return new Promise<string>((resolve) => {
            releaseResponder = (value) => {
              responderSettled = true;
              resolve(value);
            };
          });
        },
      },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('hello'));
    const controller = new AbortController();
    const handle = engine.run(wf, undefined, { signal: controller.signal });
    await entered;
    controller.abort('operator cancelled');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    // The run settled while the fake responder was still pending.
    expect(responderSettled).toBe(false);
    const statuses = agentStatuses(await engine.stores.journal.load(handle.runId));
    expect(statuses).toContain('cancelled');
    expect(statuses).not.toContain('ok');
    releaseResponder('late value, discarded');
  });

  it('a crossed deadline cancels the in-flight fake call the same way', async () => {
    const engine = createTestEngine({
      agents: { '*': () => new Promise<string>(() => undefined) },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('hello'));
    const handle = engine.run(wf, undefined, {
      deadlineAt: new Date(Date.now() + 50).toISOString(),
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    const statuses = agentStatuses(await engine.stores.journal.load(handle.runId));
    expect(statuses).not.toContain('ok');
  });

  it('a budget abort mid-call ends the pending fake stream without a fake ok terminal', async () => {
    let releaseSlow: (value: string) => void = () => undefined;
    let slowSettled = false;
    const engine = createTestEngine({
      agents: {
        // ~1000 output tokens at $1M/MTok: the first agent to finish
        // blows the $1 ceiling on its own.
        expensive: 'x'.repeat(4_000),
        slow: () =>
          new Promise<string>((resolve) => {
            releaseSlow = (value) => {
              slowSettled = true;
              resolve(value);
            };
          }),
      },
      pricing: {
        pricingVersion: 'abort-test',
        models: {
          'fake:fake-model': { inputUsdPerMTok: 1_000_000, outputUsdPerMTok: 1_000_000 },
        },
      },
      budgetDefaults: { flatReserveUsd: 0.01 },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) =>
      ctx.parallel([
        () => ctx.agent('spend it all', { agentType: 'expensive' }),
        () => ctx.agent('never finishes', { agentType: 'slow' }),
      ]),
    );
    const handle = engine.run(wf, undefined, { budgetUsd: 1 });
    const outcome = await handle.result;
    expect(outcome.status).toBe('exhausted');
    // The pending fake stream was aborted by the budget signal instead of
    // waiting out (or faking) a successful turn.
    expect(slowSettled).toBe(false);
    const statuses = agentStatuses(await engine.stores.journal.load(handle.runId));
    expect(statuses.filter((status) => status === 'ok').length).toBeLessThanOrEqual(1);
    expect(statuses).toContain('cancelled');
    releaseSlow('late value, discarded');
  });
});
