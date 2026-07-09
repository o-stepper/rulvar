/**
 * Per-run event machinery (M1-T10): the span registry (run > phase >
 * agent > tool > child hierarchy) and the event bus that stamps the
 * WorkflowEvent envelope, feeds RunHandle.events / on(), and fans out to
 * subscribers. EventSink is deliberately not an SPI (docs/02, section
 * "SPI seams and the 1.0 freeze").
 *
 * Owning spec: docs/09-observability-testing-spec.md, section "Event
 * stream".
 */
import { maskSecretsDeep } from '../l0/serialization.js';
import type { WorkflowEvent, WorkflowEventBody } from '../l0/events.js';

/**
 * Spans form a tree per run; spanId values are engine-minted opaque
 * strings, unique per run, pure telemetry, never identity (docs/09,
 * section "Span hierarchy").
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

  constructor(options: {
    runId: string;
    spans: SpanRegistry;
    now?: () => number;
    /**
     * Default true (M8-T04; docs/09, section "Redaction and sensitive
     * data"): key-shaped strings in every emitted body are masked.
     * Telemetry only, never the journal: events are excluded from
     * identity by construction, so masking cannot perturb replay.
     */
    maskEvents?: boolean;
  }) {
    this.runId = options.runId;
    this.spans = options.spans;
    this.now = options.now ?? Date.now;
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
    for (const listener of this.listeners) {
      listener(event);
    }
    for (const subscriber of this.subscribers) {
      subscriber.push(event);
    }
    return event;
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
