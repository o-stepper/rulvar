/**
 * Event-bus subscriber isolation (v1.21.0 review follow-up): a throwing
 * on() listener is best-effort telemetry and must never propagate out of
 * emit to disrupt a paid run; the failure surfaces once as a warn log.
 */
import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from '../l0/events.js';
import { EventBus, SpanRegistry } from './events.js';

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
