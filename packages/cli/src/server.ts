/**
 * createServer (M8-T01): the HTTP shell over the public engine API
 * (FR-702). Canonical signature
 * `createServer({ engine, workflows })` returning
 * `{ fetch(req: Request): Promise<Response> }`; the journal store comes
 * from the engine (Engine.stores, M8 entry amendment).
 *
 * Routes:
 *   POST /runs                     start a run of a registered workflow
 *   GET  /runs/:id                 run status and outcome
 *   GET  /runs/:id/events          SSE event stream (Last-Event-ID resume)
 *   POST /runs/:id/external/:key   resolve an awaitExternal suspension
 *   GET  /runs/:id/cost            CostReport
 *
 * Authentication is explicitly out of scope: the server is host-embedded
 * and auth belongs to host middleware (OQ-16). SSE reconnection
 * maps Last-Event-ID to the event seq (the per-run telemetry counter);
 * replay is at-least-once by design, matching the
 * journal-backed re-emission contract (consumers
 * deduplicate on `replayed`). A terminal settle closes connected
 * streams only AFTER the segment's event pump has delivered the full
 * tail (run:end included), and every connection's pending queue is
 * bounded by maxPendingEventsPerClient: a consumer that stops reading
 * is closed at the bound and resumes through the standard
 * Last-Event-ID replay window (v1.26.0 deep E2E review P1-1/P1-2).
 *
 * The server is a single-process shell: it tracks the runs it started
 * (or resumed) in memory and serves everything else from the engine's
 * stores. A resolution posted for a run that is NOT live in this process
 * is the documented offline append (load, compute
 * next seq, append, under a lease where the store is leasable); such a
 * run resumes on a queue worker (createWorker, M8-T02), not here,
 * because original run arguments are not journaled in v1 (OQ-21).
 */
import {
  ConfigError,
  InvalidResolutionError,
  RulvarError,
  Replayer,
  costReportFromJournal,
  normalizeEntry,
  readRunMeta,
  validateSchemaSpec,
  type CostReport,
  type Engine,
  type JournalEntry,
  type JournalStore,
  type Json,
  type LeasableStore,
  type Lease,
  type ModelRef,
  type ResolutionOutcome,
  type RunHandle,
  type RunMeta,
  type RunOptions,
  type RunOutcome,
  type SchemaSpec,
  type Usage,
  type Workflow,
  type WorkflowEvent,
  type WorkflowRegistry,
} from '@rulvar/core';

export interface CreateServerOptions {
  engine: Engine;
  /** The explicit, first-class registry. */
  workflows: WorkflowRegistry;
  /**
   * Prices the journal fold behind GET /runs/:id/cost for runs without a
   * settled in-process outcome (the host assembles pricing exactly as it
   * does for the CLI); absent means those usages surface as `unpriced`,
   * never a silent zero.
   */
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /**
   * Opt-in DURABLE retention (OQ-20 executed at M8-T04): evaluated
   * when a tracked run settles terminally; a true verdict applies
   * engine.deleteRun (transcript cascade, then the journal) and
   * untracks the run. This deletes the durable record; to release only
   * process memory, use `memoryRetention` or `maxTrackedRuns`. Absent
   * means nothing is deleted.
   */
  retention?: (meta: RunMeta) => boolean;
  /**
   * Opt-in retention of PROCESS MEMORY, decoupled from the durable kind
   * (v1.25.0 scale review P1-2): evaluated when a tracked run settles
   * terminally, after `retention`; a true verdict releases the tracked
   * state (args, outcome, handle, SSE buffer) while the journal and
   * transcripts stay untouched, after which GET status/cost serve from
   * the store exactly as for a run another process owns, and GET events
   * answers with the documented empty stream for a run not live here.
   */
  memoryRetention?: (meta: RunMeta) => boolean;
  /**
   * Cap on SETTLED tracked runs kept in process memory: when a run
   * settles terminally and neither retention released it, the oldest
   * settled tracked runs beyond the cap are released exactly like a
   * `memoryRetention` verdict (durable state untouched). Live runs are
   * never evicted and do not count toward the cap. Absent means no cap.
   * Validated at construction: a non-negative safe integer (zero keeps
   * no settled runs), anything else is a typed ConfigError.
   */
  maxTrackedRuns?: number;
  /**
   * Upper bound on buffered SSE replay events per tracked run: past the
   * bound the OLDEST buffered events are dropped in chunks (so the
   * retained replay window stays at least seven eighths of the bound)
   * and counted. A replay that no longer reaches back to a client's
   * cursor carries `x-rulvar-events-dropped: <count>` and a leading SSE
   * comment naming the first retained seq; the journal remains the
   * durable record of the run itself. Absent means unbounded (the
   * historical behavior). Validated at construction: a positive safe
   * integer, anything else is a typed ConfigError.
   */
  maxBufferedEventsPerRun?: number;
  /**
   * Upper bound on SSE frames PENDING in one client connection's
   * response queue, replay and live feed alike (v1.26.0 deep E2E
   * review P1-2: the replay buffer bound does not bound what a
   * connected consumer that stopped reading accumulates). When a
   * connection's pending queue reaches the bound, the server unhooks
   * the feed, appends an SSE comment naming the bound, and CLOSES that
   * connection; queued frames stay readable, and the standard
   * Last-Event-ID reconnect resumes strictly after the last frame the
   * client consumed. A replay longer than the bound is likewise
   * delivered in bounded chunks across reconnects, so pending memory
   * per connection is O(bound), never O(events). Validated at
   * construction: a positive safe integer. Defaults to 10000.
   */
  maxPendingEventsPerClient?: number;
}

/**
 * The default per-connection pending-frame bound: generous enough that
 * a reading consumer never notices (a normal reader keeps the queue
 * near empty), small enough that a consumer that stopped reading
 * cannot grow process memory past a few megabytes per connection.
 */
export const DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT = 10_000;

export interface RulvarServer {
  fetch(req: Request): Promise<Response>;
}

/** POST /runs request body. */
interface StartRunBody {
  workflow?: string;
  args?: Json;
  options?: {
    runId?: string;
    budgetUsd?: number;
    name?: string;
    tags?: string[];
    deadlineAt?: string;
  };
}

/** One run this server process started or resumed. */
interface TrackedRun {
  runId: string;
  workflowName: string;
  args: unknown;
  /**
   * Events observed across resume segments, in arrival (= seq) order;
   * bounded by maxBufferedEventsPerRun when configured.
   */
  buffer: WorkflowEvent[];
  /** Oldest events dropped from the buffer by the configured bound. */
  dropped: number;
  /**
   * Live SSE feeds; fed `null` exactly once at the terminal settle,
   * AFTER the segment's event pump drained (an optional note becomes a
   * closing SSE comment when delivery could not be proven complete).
   */
  feeds: Set<(event: WorkflowEvent | null, note?: string) => void>;
  handle: RunHandle<unknown>;
  /** The latest settled outcome; undefined while a segment is in flight. */
  outcome?: RunOutcome<unknown>;
  /** True once the run settled with a non-suspended status. */
  done: boolean;
  /** Serializes resolve-then-maybe-resume sections per run. */
  queue: Promise<unknown>;
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// Captured at module load, before any run installs the dev-mode
// bare-Date.now guard (the same convention as createEngine's realNow).
const wallClock: () => number = Date.now.bind(globalThis);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function errorStatus(error: RulvarError): number {
  switch (error.code) {
    case 'config':
    case 'invalid_resolution':
    case 'non_serializable_value':
      return 400;
    case 'lease_held':
    case 'journal_compat':
      return 409;
    default:
      return 500;
  }
}

function errorResponse(thrown: unknown): Response {
  if (thrown instanceof RulvarError) {
    return json(errorStatus(thrown), { error: thrown.toWire() });
  }
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return json(500, { error: { code: 'error', message, retryable: false } });
}

function sseFrame(event: WorkflowEvent): string {
  return `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function isLeasable(store: JournalStore): store is LeasableStore {
  const candidate = store as Partial<LeasableStore>;
  return (
    typeof candidate.acquire === 'function' &&
    typeof candidate.renew === 'function' &&
    typeof candidate.release === 'function'
  );
}

/** The approval-suspension resolution key. */
const APPROVAL_KEY_PREFIX = 'approval:';

function suspensionKeyOf(entry: JournalEntry): string | undefined {
  if (entry.status !== 'suspended') {
    return undefined;
  }
  if (entry.kind === 'external') {
    const key = (entry.value as { key?: unknown } | undefined)?.key;
    return typeof key === 'string' ? key : undefined;
  }
  if (entry.kind === 'approval') {
    return `${APPROVAL_KEY_PREFIX}${entry.seq}`;
  }
  return undefined;
}

/**
 * Rejects a numeric cap outside its documented domain with a typed
 * ConfigError at construction (v1.26.0 deep E2E review P2-1: NaN
 * silently meant unbounded, Infinity looked like a cap without capping,
 * negatives and fractions produced policies nobody asked for).
 */
function requireCap(name: string, value: number | undefined, minimum: 0 | 1): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new ConfigError(
      `createServer ${name} must be a ${minimum === 0 ? 'non-negative' : 'positive'} ` +
        `safe integer, got ${String(value)}`,
    );
  }
}

export function createServer(options: CreateServerOptions): RulvarServer {
  const { engine, workflows } = options;
  requireCap('maxTrackedRuns', options.maxTrackedRuns, 0);
  requireCap('maxBufferedEventsPerRun', options.maxBufferedEventsPerRun, 1);
  requireCap('maxPendingEventsPerClient', options.maxPendingEventsPerClient, 1);
  const pendingCap = options.maxPendingEventsPerClient ?? DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT;
  const journal = engine.stores.journal;
  const runs = new Map<string, TrackedRun>();

  /**
   * Buffers one event under the configured bound. Overflow drops the
   * oldest chunk (an eighth of the bound) in one splice, so the
   * amortized cost per event stays O(1) and the retained window never
   * falls below seven eighths of the bound.
   */
  function pushBuffered(run: TrackedRun, event: WorkflowEvent): void {
    run.buffer.push(event);
    const max = options.maxBufferedEventsPerRun;
    if (max !== undefined && run.buffer.length > max) {
      const chunk = Math.max(1, Math.floor(max / 8));
      run.buffer.splice(0, chunk);
      run.dropped += chunk;
    }
  }

  /**
   * Releases settled tracked runs beyond maxTrackedRuns, oldest first
   * (Map insertion order), durable state untouched. Live runs never
   * count and are never evicted.
   */
  function enforceTrackedCap(): void {
    const cap = options.maxTrackedRuns;
    if (cap === undefined) {
      return;
    }
    const settled = [...runs.values()].filter((run) => run.done);
    for (const run of settled.slice(0, Math.max(0, settled.length - cap))) {
      runs.delete(run.runId);
    }
  }

  /** Pumps one resume segment's events into the buffer and the feeds. */
  function attach(run: TrackedRun, handle: RunHandle<unknown>): void {
    run.handle = handle;
    run.outcome = undefined;
    let pumpFailed = false;
    // THIS segment's pump; the terminal routine below awaits exactly it
    // (a later resume segment installs its own pump and its own await).
    const pump = (async () => {
      for await (const event of handle.events) {
        pushBuffered(run, event);
        for (const feed of [...run.feeds]) {
          feed(event);
        }
      }
    })().catch(() => {
      pumpFailed = true;
    });
    void handle.result
      .then(async (outcome) => {
        // The outcome is authoritative immediately (GET /runs/:id and
        // the resolve guards read it); only the EVENT-side terminal
        // moves after the drain below.
        run.outcome = outcome;
        if (outcome.status === 'suspended') {
          return;
        }
        // Deliver the terminal tail before closing: handle.events
        // completes at the settle, so awaiting the pump proves every
        // event the run emitted (run:end included) reached the buffer
        // and the connected feeds. Closing on the result alone raced
        // the pump and silently swallowed the backlog (v1.26.0 deep
        // E2E review P1-1).
        await pump;
        run.done = true;
        for (const feed of [...run.feeds]) {
          feed(
            null,
            pumpFailed
              ? 'event pump failed; the stream may be incomplete, ' +
                  'reconnect with Last-Event-ID to replay'
              : undefined,
          );
        }
        run.feeds.clear();
        // The retention cascade at the terminal settle: durable
        // retention first (deletes the record AND untracks), then
        // memory retention (untracks only), then the settled cap. It
        // runs after the drain so the released buffer is the full one.
        void (async () => {
          const meta =
            options.retention === undefined && options.memoryRetention === undefined
              ? undefined
              : await metaOf(run.runId);
          if (meta !== undefined && options.retention?.(meta) === true) {
            await engine.deleteRun(run.runId);
            runs.delete(run.runId);
            return;
          }
          if (meta !== undefined && options.memoryRetention?.(meta) === true) {
            runs.delete(run.runId);
            return;
          }
          enforceTrackedCap();
        })().catch(() => undefined);
      })
      .catch(() => undefined);
  }

  function track(
    runId: string,
    workflowName: string,
    args: unknown,
    handle: RunHandle<unknown>,
  ): TrackedRun {
    const run: TrackedRun = {
      runId,
      workflowName,
      args,
      buffer: [],
      dropped: 0,
      feeds: new Set(),
      handle,
      done: false,
      queue: Promise.resolve(),
    };
    runs.set(runId, run);
    attach(run, handle);
    return run;
  }

  async function metaOf(runId: string): Promise<RunMeta | undefined> {
    // Exact lookup through the optional store capability; stores
    // without it fall back to the historical full listRuns scan.
    return readRunMeta(journal, runId);
  }

  async function startRun(req: Request): Promise<Response> {
    let body: StartRunBody;
    try {
      body = (await req.json()) as StartRunBody;
    } catch {
      return json(400, { error: { code: 'config', message: 'request body is not valid JSON' } });
    }
    const name = body.workflow;
    if (typeof name !== 'string' || name.length === 0) {
      return json(400, {
        error: { code: 'config', message: "body requires { workflow: '<registered name>' }" },
      });
    }
    const workflow = workflows[name];
    if (workflow === undefined) {
      return json(400, {
        error: {
          code: 'config',
          message: `no workflow named '${name}' in the registry`,
        },
      });
    }
    const runOptions: RunOptions = {
      ...(body.options?.runId === undefined ? {} : { runId: body.options.runId }),
      ...(body.options?.budgetUsd === undefined ? {} : { budgetUsd: body.options.budgetUsd }),
      ...(body.options?.name === undefined ? {} : { name: body.options.name }),
      ...(body.options?.tags === undefined ? {} : { tags: body.options.tags }),
      ...(body.options?.deadlineAt === undefined ? {} : { deadlineAt: body.options.deadlineAt }),
    };
    const handle = engine.run(
      workflow as unknown as Workflow<unknown, unknown>,
      body.args,
      runOptions,
    );
    track(handle.runId, name, body.args, handle);
    return new Response(
      JSON.stringify({ runId: handle.runId, status: 'running', workflow: name }),
      {
        status: 201,
        headers: { ...JSON_HEADERS, location: `/runs/${handle.runId}` },
      },
    );
  }

  async function runStatus(runId: string): Promise<Response> {
    const run = runs.get(runId);
    if (run !== undefined) {
      const outcome = run.outcome;
      if (outcome === undefined) {
        return json(200, { runId, status: 'running', workflow: run.workflowName, live: true });
      }
      return json(200, {
        runId,
        status: outcome.status,
        workflow: run.workflowName,
        live: true,
        ...(outcome.value === undefined ? {} : { value: outcome.value }),
        ...(outcome.error === undefined ? {} : { error: outcome.error }),
        pending: outcome.pending,
        dropped: outcome.dropped.length,
        usage: outcome.usage,
      });
    }
    const meta = await metaOf(runId);
    if (meta === undefined) {
      return json(404, { error: { code: 'config', message: `run '${runId}' not found` } });
    }
    return json(200, {
      runId,
      status: meta.status,
      live: false,
      ...(meta.workflowName === undefined ? {} : { workflow: meta.workflowName }),
      ...(meta.name === undefined ? {} : { name: meta.name }),
      ...(meta.tags === undefined ? {} : { tags: meta.tags }),
      updatedAt: meta.updatedAt,
    });
  }

  async function runEvents(runId: string, req: Request): Promise<Response> {
    const run = runs.get(runId);
    if (run === undefined) {
      const meta = await metaOf(runId);
      if (meta === undefined) {
        return json(404, { error: { code: 'config', message: `run '${runId}' not found` } });
      }
      // Known in the store but not live here: an empty stream that closes
      // immediately is the honest answer (events are process-local
      // telemetry).
      const empty = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(': run is not live in this process\n\n'));
          controller.close();
        },
      });
      return new Response(empty, {
        status: 200,
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      });
    }
    const lastEventId = req.headers.get('last-event-id');
    const encoder = new TextEncoder();
    let feed: ((event: WorkflowEvent | null, note?: string) => void) | undefined;
    // Pending frames in THIS connection's queue: the stream uses the
    // default count queuing strategy (highWaterMark 1), so desiredSize
    // is 1 minus the queued chunk count; null means the stream errored
    // or was cancelled and nothing should be enqueued.
    const pendingOf = (controller: ReadableStreamDefaultController<Uint8Array>): number | null => {
      const desired = controller.desiredSize;
      return desired === null ? null : 1 - desired;
    };
    const slowConsumerComment =
      `: pending frames reached maxPendingEventsPerClient (${pendingCap}); ` +
      'reconnect with Last-Event-ID to continue\n\n';
    // Replay strictly AFTER the client's cursor. The buffer is
    // ascending by seq, so the resume point is a binary search, and the
    // replay walks the buffer by index (never a slice copy). A cursor
    // seq the buffer no longer holds replays everything after it, which
    // preserves at-least-once: events at or before the cursor were
    // already delivered (consumers deduplicate replayed events).
    let cursor: number | undefined;
    if (lastEventId !== null) {
      const parsed = Number(lastEventId);
      if (Number.isFinite(parsed)) {
        cursor = parsed;
      }
    }
    let startIndex = 0;
    if (cursor !== undefined) {
      let lo = 0;
      let hi = run.buffer.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (run.buffer[mid].seq <= cursor) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      startIndex = lo;
    }
    // The bound dropped buffered events AND this client's cursor does
    // not prove it saw them: mark the gap (the journal is the durable
    // record; only in-process SSE replay is windowed).
    const firstRetained = run.buffer.length > 0 ? run.buffer[0].seq : undefined;
    const gap =
      run.dropped > 0 &&
      (cursor === undefined || firstRetained === undefined || cursor < firstRetained);
    const headers: Record<string, string> = {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      ...(run.dropped > 0 ? { 'x-rulvar-events-dropped': String(run.dropped) } : {}),
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (gap) {
          controller.enqueue(
            encoder.encode(
              `: replay window starts at seq ${String(firstRetained ?? 'none')}; ` +
                `${run.dropped} earlier events were dropped from the in-memory buffer ` +
                '(the journal is the durable record)\n\n',
            ),
          );
        }
        // The replay obeys the per-connection pending bound too: a
        // backlog longer than the bound is delivered in bounded chunks,
        // each reconnect resuming from the client's Last-Event-ID.
        for (let i = startIndex; i < run.buffer.length; i += 1) {
          const pending = pendingOf(controller);
          if (pending === null) {
            return;
          }
          if (pending >= pendingCap) {
            controller.enqueue(encoder.encode(slowConsumerComment));
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(sseFrame(run.buffer[i])));
        }
        if (run.done) {
          controller.close();
          return;
        }
        feed = (event, note) => {
          if (event === null) {
            try {
              if (note !== undefined) {
                controller.enqueue(encoder.encode(`: ${note}\n\n`));
              }
              controller.close();
            } catch {
              // The consumer may have cancelled concurrently.
            }
            return;
          }
          const pending = pendingOf(controller);
          if (pending !== null && pending >= pendingCap) {
            // This connection stopped consuming: unhook and close so
            // the standard Last-Event-ID reconnect lands on the replay
            // window instead of growing an unbounded per-connection
            // queue (v1.26.0 deep E2E review P1-2). close() keeps the
            // already queued frames readable.
            if (feed !== undefined) {
              run.feeds.delete(feed);
            }
            try {
              controller.enqueue(encoder.encode(slowConsumerComment));
              controller.close();
            } catch {
              // The consumer cancelled concurrently.
            }
            return;
          }
          try {
            controller.enqueue(encoder.encode(sseFrame(event)));
          } catch {
            // Enqueue after cancel: drop silently; cancel() detaches us.
          }
        };
        run.feeds.add(feed);
      },
      cancel() {
        if (feed !== undefined) {
          run.feeds.delete(feed);
        }
      },
    });
    return new Response(stream, { status: 200, headers });
  }

  /** The tracked path: live (or settled-suspended) in this process. */
  async function resolveTracked(run: TrackedRun, key: string, value: Json): Promise<Response> {
    const section = run.queue.then(async (): Promise<Response> => {
      // run.done flips only after the terminal event drain; the settled
      // outcome itself is the authority for refusing a resolution.
      const settledTerminal =
        run.done || (run.outcome !== undefined && run.outcome.status !== 'suspended');
      if (settledTerminal) {
        return json(409, {
          error: {
            code: 'config',
            message: `run '${run.runId}' already settled '${run.outcome?.status ?? 'unknown'}'`,
          },
        });
      }
      const settledSuspended = run.outcome?.status === 'suspended';
      if (settledSuspended) {
        const pendingKeys = (run.outcome as RunOutcome<unknown>).pending.map((item) => item.key);
        if (!pendingKeys.includes(key)) {
          return json(404, {
            error: {
              code: 'invalid_resolution',
              message: `no open suspension '${key}' (pending: ${pendingKeys.join(', ') || 'none'})`,
            },
          });
        }
      }
      const outcome = await run.handle.resolveExternal(key, value);
      let resumed = false;
      if (outcome.applied && outcome.woke !== true) {
        // Applied WITHOUT waking the body: either the segment had
        // already settled suspended, or it was still closing when the
        // attempt landed (the quiesce window; the append is durable and
        // the closed body never continues). Either way the settle is
        // past or imminent, so waiting for it here is bounded, and the
        // continuation belongs to this host (the suspension ownership
        // rule's "exactly one engine.resume"). Racing the settle on
        // timing instead of this typed signal is what left the run
        // stranded 'suspended' when the resolve won the window.
        const settled = settledSuspended
          ? (run.outcome as RunOutcome<unknown>)
          : await run.handle.result;
        if (settled.status === 'suspended') {
          // The registry workflow and the retained original args
          // re-bind the continuation (OQ-21).
          const workflow = workflows[run.workflowName];
          if (workflow === undefined) {
            return json(409, {
              error: {
                code: 'config',
                message:
                  `resolution applied, but workflow '${run.workflowName}' is no longer ` +
                  'registered; resume it from a worker or a process with the registration',
              },
            });
          }
          const handle = engine.resume(
            run.runId,
            workflow as unknown as Workflow<unknown, unknown>,
            {
              args: run.args,
            },
          );
          attach(run, handle);
          resumed = true;
        }
      }
      return json(200, { ...outcome, resumed });
    });
    run.queue = section.catch(() => undefined);
    return section;
  }

  /**
   * The offline path: the run is not live in this
   * process; append the resolution under a lease where the store is
   * leasable and leave the resume to a queue worker.
   */
  async function resolveOffline(runId: string, key: string, value: Json): Promise<Response> {
    const meta = await metaOf(runId);
    if (meta === undefined) {
      return json(404, { error: { code: 'config', message: `run '${runId}' not found` } });
    }
    let lease: Lease | undefined;
    if (isLeasable(journal)) {
      lease = await journal.acquire(runId, `rulvar-server:${process.pid}`);
    }
    try {
      const entries = (await journal.load(runId)).map((raw) => normalizeEntry(raw));
      const replayer = new Replayer({
        runId,
        store: journal,
        now: wallClock,
        priorEntries: entries,
        // The resolution append carries the lease acquired above so the
        // store fences it: if this process stalled past the lease ttl and
        // a queue worker took the run over (epoch+1), the stale append is
        // rejected with LeaseHeldError instead of racing the new owner. An
        // absent lease (a journal with no lease support) keeps the single
        // writer precondition, exactly as before.
        ...(lease === undefined ? {} : { lease }),
      });
      const target = entries.find((entry) => suspensionKeyOf(entry) === key);
      if (target === undefined) {
        return json(404, {
          error: { code: 'invalid_resolution', message: `no suspension with key '${key}'` },
        });
      }
      const state = replayer.suspensionState(target.seq);
      if (state.state !== 'suspended') {
        return json(200, {
          applied: false,
          seq: target.seq,
          supersededBy: state.by,
          reason: state.state === 'resolved' ? 'already_resolved' : 'target_abandoned',
          resumed: false,
        });
      }
      // Mirror the live path's validation so an invalid payload fails the
      // request instead of poisoning the journal (the fold remains the
      // authority at resume).
      if (target.kind === 'approval') {
        const decision = (value as { decision?: unknown } | null)?.decision;
        if (decision !== 'allow' && decision !== 'deny') {
          throw new InvalidResolutionError(
            `approval '${key}' resolves with { decision: 'allow' | 'deny', reason? }`,
          );
        }
      }
      const pinnedSchema = (target.value as { schema?: unknown } | undefined)?.schema;
      if (pinnedSchema !== undefined) {
        const validation = await validateSchemaSpec(pinnedSchema as SchemaSpec, value);
        if (!validation.valid) {
          throw new InvalidResolutionError(
            `resolution for '${key}' does not validate against the pinned schema: ` +
              validation.issues.map((issue) => issue.message).join('; '),
          );
        }
      }
      const outcome: ResolutionOutcome = await replayer.resolveSuspended(target.seq, {
        by: 'external',
        value,
      });
      return json(200, { ...outcome, resumed: false });
    } finally {
      if (lease !== undefined && isLeasable(journal)) {
        await journal.release(lease).catch(() => undefined);
      }
    }
  }

  async function resolveRun(runId: string, key: string, req: Request): Promise<Response> {
    let value: Json;
    try {
      value = (await req.json()) as Json;
    } catch {
      return json(400, { error: { code: 'config', message: 'request body is not valid JSON' } });
    }
    const run = runs.get(runId);
    if (run !== undefined) {
      return resolveTracked(run, key, value);
    }
    return resolveOffline(runId, key, value);
  }

  async function runCost(runId: string): Promise<Response> {
    const run = runs.get(runId);
    if (run?.outcome !== undefined) {
      // The settled in-process outcome carries the exact attribution
      // (byPhase/byAgentType live only in process).
      return json(200, run.outcome.cost);
    }
    const meta = run === undefined ? await metaOf(runId) : undefined;
    if (run === undefined && meta === undefined) {
      return json(404, { error: { code: 'config', message: `run '${runId}' not found` } });
    }
    const entries = (await journal.load(runId)).map((raw) => normalizeEntry(raw));
    const report: CostReport = costReportFromJournal(
      entries,
      options.priceUsd ?? (() => undefined),
    );
    return json(200, report);
  }

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (path === '/runs') {
      if (req.method !== 'POST') {
        return json(405, { error: { code: 'config', message: 'POST /runs' } });
      }
      return startRun(req);
    }
    const events = /^\/runs\/([^/]+)\/events$/.exec(path);
    if (events !== null) {
      if (req.method !== 'GET') {
        return json(405, { error: { code: 'config', message: 'GET /runs/:id/events' } });
      }
      return runEvents(decodeURIComponent(events[1]), req);
    }
    const external = /^\/runs\/([^/]+)\/external\/(.+)$/.exec(path);
    if (external !== null) {
      if (req.method !== 'POST') {
        return json(405, { error: { code: 'config', message: 'POST /runs/:id/external/:key' } });
      }
      return resolveRun(decodeURIComponent(external[1]), decodeURIComponent(external[2]), req);
    }
    const cost = /^\/runs\/([^/]+)\/cost$/.exec(path);
    if (cost !== null) {
      if (req.method !== 'GET') {
        return json(405, { error: { code: 'config', message: 'GET /runs/:id/cost' } });
      }
      return runCost(decodeURIComponent(cost[1]));
    }
    const status = /^\/runs\/([^/]+)$/.exec(path);
    if (status !== null) {
      if (req.method !== 'GET') {
        return json(405, { error: { code: 'config', message: 'GET /runs/:id' } });
      }
      return runStatus(decodeURIComponent(status[1]));
    }
    return json(404, { error: { code: 'config', message: `no route ${req.method} ${path}` } });
  }

  return {
    fetch: async (req: Request): Promise<Response> => {
      try {
        return await route(req);
      } catch (thrown) {
        return errorResponse(thrown);
      }
    },
  };
}
