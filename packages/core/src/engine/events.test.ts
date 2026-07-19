/**
 * Event-bus subscriber isolation (v1.21.0 review follow-up): a throwing
 * on() listener is best-effort telemetry and must never propagate out of
 * emit to disrupt a paid run; the failure surfaces once as a warn log.
 */
import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from '../l0/events.js';
import { EVENT_SEGMENT_STRIDE, EventBus, SpanRegistry } from './events.js';

function bus(): { bus: EventBus; span: string } {
  const spans = new SpanRegistry();
  const span = spans.mint();
  return { bus: new EventBus({ runId: 'R1', spans, now: () => 0 }), span };
}

describe('EventBus subscriber isolation', () => {
  it('a throwing listener does not propagate out of emit', () => {
    const { bus: eb, span } = bus();
    eb.on('log', () => {
      throw new Error('renderer blew up');
    });
    // The run code path calls emit; it must not throw.
    expect(() => eb.emit({ type: 'log', level: 'info', msg: 'hi' }, span)).not.toThrow();
  });

  it('other listeners still receive the event when one throws', () => {
    const { bus: eb, span } = bus();
    const seen: string[] = [];
    eb.on('log', () => {
      throw new Error('boom');
    });
    eb.on('log', (event) => {
      if (event.level !== 'warn') {
        seen.push(event.msg);
      }
    });
    eb.emit({ type: 'log', level: 'info', msg: 'first' }, span);
    expect(seen).toEqual(['first']);
  });

  it('reports the failure once as a warn log, then stays quiet', () => {
    const { bus: eb, span } = bus();
    const warns: Array<Extract<WorkflowEvent, { type: 'log' }>> = [];
    eb.on('log', (event) => {
      if (event.level === 'warn') {
        warns.push(event);
        return;
      }
      throw new Error('listener failure');
    });
    eb.emit({ type: 'log', level: 'info', msg: 'a' }, span);
    eb.emit({ type: 'log', level: 'info', msg: 'b' }, span);
    eb.emit({ type: 'log', level: 'info', msg: 'c' }, span);
    // Exactly one warn, no crash, and it names the isolation.
    expect(warns).toHaveLength(1);
    expect(warns[0]?.msg).toContain('isolated so the run is unaffected');
  });

  it('a listener that also throws on the warn cannot recurse or re-arm', () => {
    const { bus: eb, span } = bus();
    let calls = 0;
    eb.on('log', () => {
      calls += 1;
      throw new Error('always throws');
    });
    expect(() => eb.emit({ type: 'log', level: 'info', msg: 'x' }, span)).not.toThrow();
    // Once for the original event, once for the isolated warn delivery,
    // and never again (the guard was set before the warn was sent).
    expect(calls).toBe(2);
    expect(() => eb.emit({ type: 'log', level: 'info', msg: 'y' }, span)).not.toThrow();
    expect(calls).toBe(3);
  });
});

describe('EventBus listener failure ordering and masking (v1.22.0 review P2-1)', () => {
  const SECRET = 'sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  it('every surface sees the original event before the isolation warn, seq ascending', async () => {
    const { bus: eb, span } = bus();
    const iterated: Array<{ seq: number; type: string }> = [];
    const pump = (async () => {
      for await (const event of eb.iterate()) {
        iterated.push({ seq: event.seq, type: event.type });
      }
    })();
    const listened: Array<{ seq: number; level?: string }> = [];
    eb.on('agent:start', () => {
      throw new Error('boom');
    });
    eb.on('agent:start', (event) => listened.push({ seq: event.seq }));
    eb.on('log', (event) => listened.push({ seq: event.seq, level: event.level }));
    eb.emit({ type: 'agent:start', agentType: 'w', model: 'm', role: 'loop' }, span);
    eb.end();
    await pump;
    // The iterator: original first, warn strictly after, seq ascending.
    expect(iterated.map((e) => e.type)).toEqual(['agent:start', 'log']);
    expect(iterated[0]?.seq).toBeLessThan(iterated[1]?.seq ?? -1);
    // The later-registered listeners: same order.
    expect(listened).toEqual([{ seq: 0 }, { seq: 1, level: 'warn' }]);
  });

  it('the isolation warn is masked like every other event', () => {
    const { bus: eb, span } = bus();
    const warns: string[] = [];
    eb.on('log', (event) => {
      if (event.level === 'warn') {
        warns.push(event.msg);
      }
    });
    eb.on('agent:start', () => {
      throw new Error(`credentials leaked: ${SECRET}`);
    });
    eb.emit({ type: 'agent:start', agentType: 'w', model: 'm', role: 'loop' }, span);
    expect(warns).toHaveLength(1);
    expect(warns[0]).not.toContain(SECRET);
    expect(warns[0]).toContain('[masked-secret]');
  });

  it('maskEvents false keeps the documented opt-out for the warn too', () => {
    const spans = new SpanRegistry();
    const span = spans.mint();
    const eb = new EventBus({ runId: 'R1', spans, now: () => 0, maskEvents: false });
    const warns: string[] = [];
    eb.on('log', (event) => {
      if (event.level === 'warn') {
        warns.push(event.msg);
      }
    });
    eb.on('agent:start', () => {
      throw new Error(`raw: ${SECRET}`);
    });
    eb.emit({ type: 'agent:start', agentType: 'w', model: 'm', role: 'loop' }, span);
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain(SECRET);
  });

  it('two throwing listeners produce one ordered warn, no reorder', async () => {
    const { bus: eb, span } = bus();
    const iterated: string[] = [];
    const pump = (async () => {
      for await (const event of eb.iterate()) {
        iterated.push(`${String(event.seq)}:${event.type}`);
      }
    })();
    eb.on('agent:start', () => {
      throw new Error('first');
    });
    eb.on('agent:start', () => {
      throw new Error('second');
    });
    eb.emit({ type: 'agent:start', agentType: 'w', model: 'm', role: 'loop' }, span);
    eb.end();
    await pump;
    expect(iterated).toEqual(['0:agent:start', '1:log']);
  });
});

describe('segment-seeded telemetry counters (v1.22.0 review P1-2)', () => {
  it('EventBus and SpanRegistry start at the given base', () => {
    const spans = new SpanRegistry({ first: EVENT_SEGMENT_STRIDE });
    const eb = new EventBus({
      runId: 'R1',
      spans,
      now: () => 0,
      firstSeq: EVENT_SEGMENT_STRIDE,
    });
    const span = spans.mint();
    expect(span).toBe(`s${String(EVENT_SEGMENT_STRIDE)}`);
    const first = eb.emit({ type: 'log', level: 'info', msg: 'a' }, span);
    const second = eb.emit({ type: 'log', level: 'info', msg: 'b' }, span);
    expect(first.seq).toBe(EVENT_SEGMENT_STRIDE);
    expect(second.seq).toBe(EVENT_SEGMENT_STRIDE + 1);
    expect(Number.isSafeInteger(second.seq)).toBe(true);
  });

  it('defaults stay at zero for a fresh segment', () => {
    const spans = new SpanRegistry();
    const eb = new EventBus({ runId: 'R1', spans, now: () => 0 });
    expect(spans.mint()).toBe('s0');
    expect(eb.emit({ type: 'log', level: 'info', msg: 'a' }, 's0').seq).toBe(0);
  });
});
