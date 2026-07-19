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
 * Spans form a tree per run; spanId values are engine-minted opaque
 * strings, unique per run, pure telemetry, never identity.
 */
export class SpanRegistry {
  private readonly parents = new Map<string, string>();
  private counter = 0;

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
  private seq = 0;
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
  }) {
    this.runId = options.runId;
    this.spans = options.spans;
    // The default binds the module-load real clock, never the live
    // global: a bus built after a run would capture the dev-mode patch
    // and false-warn from its own frames (v1.18.0 review P2-6).
    this.now = options.now ?? realNow;
    this.maskEvents = options.maskEvents ?? true;
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
    // of emit and disrupt a paid run (v1.21.0 review follow-up). Its
    // failure surfaces as a warn log on the SAME bus instead, once, so
    // it is visible without a crash.
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (thrown) {
        this.reportListenerError(thrown, spanId);
      }
    }
    for (const subscriber of this.subscribers) {
      subscriber.push(event);
    }
    return event;
  }

  /**
   * A throwing on() listener is isolated (its work is best-effort
   * telemetry), and the failure surfaces ONCE as a warn log on this bus
   * rather than propagating into the run. The guard is set before the
   * warn is delivered, so a listener that also throws on the warn cannot
   * re-arm the report or recurse.
   */
  private reportListenerError(thrown: unknown, spanId: string): void {
    if (this.listenerErrorReported) {
      return;
    }
    this.listenerErrorReported = true;
    const parentSpanId = this.spans.parentOf(spanId);
    const warn: WorkflowEvent = {
      runId: this.runId,
      seq: this.seq++,
      ts: new Date(this.now()).toISOString(),
      spanId,
      ...(parentSpanId === undefined ? {} : { parentSpanId }),
      type: 'log',
      level: 'warn',
      msg:
        'an event listener threw and was isolated so the run is unaffected: ' +
        (thrown instanceof Error ? thrown.message : String(thrown)),
    };
    for (const listener of this.listeners) {
      try {
        listener(warn);
      } catch {
        // Already reported; never recurse.
      }
    }
    for (const subscriber of this.subscribers) {
      subscriber.push(warn);
    }
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
    const queue: WorkflowEvent[] = [];
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
          while (queue.length > 0) {
            yield queue.shift() as WorkflowEvent;
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
