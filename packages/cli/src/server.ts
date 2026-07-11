/**
 * createServer (M8-T01): the HTTP shell over the public engine API
 * (docs/02, section 8.2; FR-702). Canonical signature
 * `createServer({ engine, workflows })` returning
 * `{ fetch(req: Request): Promise<Response> }`; the journal store comes
 * from the engine (Engine.stores, docs/06 10.2, M8 entry amendment).
 *
 * Routes:
 *   POST /runs                     start a run of a registered workflow
 *   GET  /runs/:id                 run status and outcome
 *   GET  /runs/:id/events          SSE event stream (Last-Event-ID resume)
 *   POST /runs/:id/external/:key   resolve an awaitExternal suspension
 *   GET  /runs/:id/cost            CostReport
 *
 * Authentication is explicitly out of scope: the server is host-embedded
 * and auth belongs to host middleware (docs/14, OQ-16). SSE reconnection
 * maps Last-Event-ID to the event seq (the per-run telemetry counter,
 * docs/09, section 1.1); replay is at-least-once by design, matching the
 * journal-backed re-emission contract (docs/09, section 1.5: consumers
 * deduplicate on `replayed`).
 *
 * The server is a single-process shell: it tracks the runs it started
 * (or resumed) in memory and serves everything else from the engine's
 * stores. A resolution posted for a run that is NOT live in this process
 * is the documented offline append (docs/03, section 8: load, compute
 * next seq, append, under a lease where the store is leasable); such a
 * run resumes on a queue worker (createWorker, M8-T02), not here,
 * because original run arguments are not journaled in v1 (docs/14,
 * OQ-21).
 */
import {
  InvalidResolutionError,
  RulvarError,
  Replayer,
  costReportFromJournal,
  normalizeEntry,
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
  /** The explicit, first-class registry (docs/06, section 10.4). */
  workflows: WorkflowRegistry;
  /**
   * Prices the journal fold behind GET /runs/:id/cost for runs without a
   * settled in-process outcome (the host assembles pricing exactly as it
   * does for the CLI); absent means those usages surface as `unpriced`,
   * never a silent zero (docs/04, section 10).
   */
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /**
   * Opt-in retention (docs/02, 8.2; OQ-20 executed at M8-T04): evaluated
   * when a tracked run settles terminally; a true verdict applies
   * engine.deleteRun (transcript cascade, then the journal) and
   * untracks the run. Absent means everything persists indefinitely.
   */
  retention?: (meta: RunMeta) => boolean;
}

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
  /** Every event observed across resume segments, in arrival order. */
  buffer: WorkflowEvent[];
  /** Live SSE feeds; fed `null` exactly once at the terminal settle. */
  feeds: Set<(event: WorkflowEvent | null) => void>;
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

/** The approval-suspension resolution key (docs/08, section 3.6). */
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

export function createServer(options: CreateServerOptions): RulvarServer {
  const { engine, workflows } = options;
  const journal = engine.stores.journal;
  const runs = new Map<string, TrackedRun>();

  /** Pumps one resume segment's events into the buffer and the feeds. */
  function attach(run: TrackedRun, handle: RunHandle<unknown>): void {
    run.handle = handle;
    run.outcome = undefined;
    void (async () => {
      for await (const event of handle.events) {
        run.buffer.push(event);
        for (const feed of [...run.feeds]) {
          feed(event);
        }
      }
    })().catch(() => undefined);
    void handle.result
      .then((outcome) => {
        run.outcome = outcome;
        if (outcome.status !== 'suspended') {
          run.done = true;
          for (const feed of [...run.feeds]) {
            feed(null);
          }
          run.feeds.clear();
          if (options.retention !== undefined) {
            // Opt-in retention at the terminal settle (docs/02, 8.2).
            void (async () => {
              const meta = await metaOf(run.runId);
              if (meta !== undefined && options.retention?.(meta) === true) {
                await engine.deleteRun(run.runId);
                runs.delete(run.runId);
              }
            })().catch(() => undefined);
          }
        }
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
    const metas = await journal.listRuns();
    return metas.find((meta) => meta.runId === runId);
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
          message: `no workflow named '${name}' in the registry (docs/06, section 10.4)`,
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
      // telemetry; docs/09, section 1).
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
    let feed: ((event: WorkflowEvent | null) => void) | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Replay strictly AFTER the last delivered seq when it is found in
        // the buffer; otherwise replay the whole buffer (at-least-once;
        // consumers deduplicate replayed events, docs/09 section 1.5).
        let startIndex = 0;
        if (lastEventId !== null) {
          const cursor = Number(lastEventId);
          if (Number.isFinite(cursor)) {
            for (let i = run.buffer.length - 1; i >= 0; i -= 1) {
              const buffered = run.buffer[i];
              if (buffered.seq === cursor) {
                startIndex = i + 1;
                break;
              }
            }
          }
        }
        for (const event of run.buffer.slice(startIndex)) {
          controller.enqueue(encoder.encode(sseFrame(event)));
        }
        if (run.done) {
          controller.close();
          return;
        }
        feed = (event) => {
          if (event === null) {
            try {
              controller.close();
            } catch {
              // The consumer may have cancelled concurrently.
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
    return new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
    });
  }

  /** The tracked path: live (or settled-suspended) in this process. */
  async function resolveTracked(run: TrackedRun, key: string, value: Json): Promise<Response> {
    const section = run.queue.then(async (): Promise<Response> => {
      if (run.done) {
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
      if (outcome.applied && settledSuspended) {
        // The segment had settled: continue the run in place. The
        // registry workflow and the retained original args re-bind it
        // (docs/06, section 10.2; docs/14, OQ-21).
        const workflow = workflows[run.workflowName];
        if (workflow === undefined) {
          return json(409, {
            error: {
              code: 'config',
              message:
                `resolution applied, but workflow '${run.workflowName}' is no longer registered; ` +
                'resume it from a worker or a process with the registration',
            },
          });
        }
        const handle = engine.resume(run.runId, workflow as unknown as Workflow<unknown, unknown>, {
          args: run.args,
        });
        attach(run, handle);
        resumed = true;
      }
      return json(200, { ...outcome, resumed });
    });
    run.queue = section.catch(() => undefined);
    return section;
  }

  /**
   * The offline path (docs/03, section 8): the run is not live in this
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
      // request instead of poisoning the journal (docs/03, section 8.7;
      // the fold remains the authority at resume).
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
      // (byPhase/byAgentType live only in process; docs/09, section 4.3).
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
