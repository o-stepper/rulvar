/**
 * Per-run event machinery (M1-T10): the span registry (run > phase >
 * agent > tool > child hierarchy) and the event bus that stamps the
 * WorkflowEvent envelope, feeds RunHandle.events / on(), and fans out to
 * subscribers. EventSink is deliberately not an SPI.
 *
 * Full contract: https://docs.rulvar.com/guide/observability.
 */
import { realNow } from '../l0/real-clock.js';
import { maskSecretsDeep } from '../l0/serialization.js';
import type { WorkflowEvent, WorkflowEventBody } from '../l0/events.js';

/**
 * The distance between the telemetry counter bases of two consecutive
 * execution segments of one run: segment k of a run starts its event
 * `seq` and span counter at `k * EVENT_SEGMENT_STRIDE`. A single
 * segment would need over four billion events to reach the next base,
 * so `seq` stays strictly increasing and `spanId` unique across
 * suspend/resume and process recreation while remaining an ordinary
 * safe-integer number (v1.22.0 review P1-2). Informational for
 * consumers: treat `seq` as ordered and `spanId` as opaque, never
 * parse segment structure out of either.
 */
export const EVENT_SEGMENT_STRIDE: number = 2 ** 32;

/**
 * Spans form a tree per run; spanId values are engine-minted opaque
 * strings, unique per run, pure telemetry, never identity.
 */
export class SpanRegistry {
  private readonly parents = new Map<string, string>();
  private counter: number;

  constructor(options?: {
    /**
     * First counter value (default 0): the resumed-segment base that
     * keeps span ids unique per run across segments.
     */
    first?: number;
  }) {
    this.counter = options?.first ?? 0;
  }

  mint(parentSpanId?: string): string {
    const spanId = `s${this.counter++}`;
    if (parentSpanId !== undefined) {
      this.parents.set(spanId, parentSpanId);
    }
    return spanId;
  }

  parentOf(spanId: string): string | undefined {
    return this.parents.get(spanId);
  }
}

type Subscriber = {
  push(event: WorkflowEvent): void;
  end(): void;
};

/**
 * Minimum delivered prefix before an iterate() queue compacts in place.
 * Below it the array keeps at most this many cleared slots, which is
 * bounded and holds no references either way.
 */
const ITERATE_COMPACT_MIN = 1024;

/**
 * The per-run event bus. seq is strictly increasing in emission order;
 * `iterate()` yields events from subscription onward; `on()` is the
 * callback form over the same stream and the same seq values.
 */
export class EventBus {
  private readonly runId: string;
  private readonly spans: SpanRegistry;
  private readonly now: () => number;
  private readonly maskEvents: boolean;
  private readonly subscribers = new Set<Subscriber>();
  private readonly listeners = new Set<(event: WorkflowEvent) => void>();
  private seq: number;
  private ended = false;
  private listenerErrorReported = false;

  constructor(options: {
    runId: string;
    spans: SpanRegistry;
    now?: () => number;
    /**
     * Default true (M8-T04): key-shaped strings in every emitted body are masked.
     * Telemetry only, never the journal: events are excluded from
     * identity by construction, so masking cannot perturb replay.
     */
    maskEvents?: boolean;
    /**
     * First seq value (default 0): the resumed-segment base that keeps
     * seq strictly increasing per run across segments (v1.22.0 review
     * P1-2).
     */
    firstSeq?: number;
  }) {
    this.runId = options.runId;
    this.spans = options.spans;
    // The default binds the module-load real clock, never the live
    // global: a bus built after a run would capture the dev-mode patch
    // and false-warn from its own frames (v1.18.0 review P2-6).
    this.now = options.now ?? realNow;
    this.maskEvents = options.maskEvents ?? true;
    this.seq = options.firstSeq ?? 0;
  }

  emit(body: WorkflowEventBody, spanId: string, replayed?: boolean): WorkflowEvent {
    const parentSpanId = this.spans.parentOf(spanId);
    const safeBody = this.maskEvents ? maskSecretsDeep(body) : body;
    const event: WorkflowEvent = {
      runId: this.runId,
      seq: this.seq++,
      ts: new Date(this.now()).toISOString(),
      spanId,
      ...(parentSpanId === undefined ? {} : { parentSpanId }),
      ...(replayed === true ? { replayed: true } : {}),
      ...safeBody,
    };
    // Telemetry never affects the run: a throwing on() subscriber (a
    // renderer, a metrics hook) is isolated so it cannot propagate out
    // of emit and disrupt a paid run (v1.21.0 review follow-up). The
    // failure is only COLLECTED here; the warn is emitted strictly
    // after this event has reached every listener and subscriber, so no
    // observer ever sees the warn reordered ahead of the event that
    // caused it (v1.22.0 review P2-1).
    let listenerFailure: unknown;
    let sawListenerFailure = false;
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (thrown) {
        if (!sawListenerFailure) {
          sawListenerFailure = true;
          listenerFailure = thrown;
        }
      }
    }
    for (const subscriber of this.subscribers) {
      subscriber.push(event);
    }
    if (sawListenerFailure) {
      this.reportListenerError(listenerFailure, spanId);
    }
    return event;
  }

  /**
   * A throwing on() listener is isolated (its work is best-effort
   * telemetry), and the failure surfaces ONCE as a warn log on this bus
   * rather than propagating into the run. The warn goes through emit()
   * itself, AFTER the triggering event's fan-out completed: it is
   * masked exactly like every other event (a secret-shaped fragment of
   * the listener's error message never reaches observers raw), its seq
   * is stamped at delivery, and every surface sees [event, warn] in
   * that order. The guard is set before the recursive emit, so a
   * listener that also throws on the warn cannot re-arm the report or
   * recurse (v1.22.0 review P2-1).
   */
  private reportListenerError(thrown: unknown, spanId: string): void {
    if (this.listenerErrorReported) {
      return;
    }
    this.listenerErrorReported = true;
    this.emit(
      {
        type: 'log',
        level: 'warn',
        msg:
          'an event listener threw and was isolated so the run is unaffected: ' +
          (thrown instanceof Error ? thrown.message : String(thrown)),
      },
      spanId,
    );
  }

  on<T extends WorkflowEvent['type']>(
    type: T,
    cb: (event: Extract<WorkflowEvent, { type: T }>) => void,
  ): () => void {
    const listener = (event: WorkflowEvent): void => {
      if (event.type === type) {
        cb(event as Extract<WorkflowEvent, { type: T }>);
      }
    };
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Ends every open iterator once the run has settled. */
  end(): void {
    this.ended = true;
    for (const subscriber of this.subscribers) {
      subscriber.end();
    }
    this.subscribers.clear();
  }

  iterate(): AsyncIterable<WorkflowEvent> {
    if (this.ended) {
      return (async function* empty() {
        // Stream already closed: yields nothing.
      })();
    }
    // A queue with a head index, never Array.shift(): a late or bursty consumer
    // drains N buffered events in O(N) total, where shift() re-shifted
    // the whole tail per event and made a late read of 100k buffered events quadratic
    // (v1.25.0 scale review P1-1). Delivered slots are cleared eagerly
    // and the array is compacted in place once the read prefix dominates,
    // so a paused consumer never retains already delivered events. The
    // gapless contract is unchanged: the subscription starts here, at
    // handle creation, and buffers until the consumer arrives.
    const queue: Array<WorkflowEvent | undefined> = [];
    let head = 0;
    let notify: (() => void) | undefined;
    let done = false;
    const subscriber: Subscriber = {
      push: (event) => {
        queue.push(event);
        notify?.();
      },
      end: () => {
        done = true;
        notify?.();
      },
    };
    this.subscribers.add(subscriber);
    const subscribers = this.subscribers;
    return (async function* stream() {
      try {
        while (true) {
          while (head < queue.length) {
            const event = queue[head] as WorkflowEvent;
            queue[head] = undefined;
            head += 1;
            if (head >= ITERATE_COMPACT_MIN && head * 2 >= queue.length) {
              // Compaction in place with no allocation; amortized O(1)
              // per delivered event because head must regrow past the
              // threshold before the next compaction.
              queue.copyWithin(0, head);
              queue.length -= head;
              head = 0;
            }
            yield event;
          }
          if (done) {
            return;
          }
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
          notify = undefined;
        }
      } finally {
        subscribers.delete(subscriber);
      }
    })();
  }
}
