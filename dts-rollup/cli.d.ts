import { CreateEngineOptions, Engine, JournalStore, KeyDeriver, LeasableStore, ModelRef, PreflightInput, Pricing, ResumeOptions, RunHandle, RunMeta, RunOutcome, Usage, Workflow, WorkflowEvent, WorkflowRegistry } from "@rulvar/core";

//#region src/io.d.ts
interface CliIo {
  out(line: string): void;
  err(line: string): void;
  /**
  * Asks one question and resolves with the answer line, or undefined
  * when input is exhausted (EOF): the caller leaves the run suspended.
  */
  prompt(question: string): Promise<string | undefined>;
  /** TTY-aware renderers may switch between live and plain output. */
  isTTY: boolean;
}
/** The process-backed io the bin entry uses. */
declare function processIo(): CliIo;
//#endregion
//#region src/cli-main.d.ts
declare const HELP: string;
declare function runCli(argv: string[], options: {
  cwd: string;
  io: CliIo;
}): Promise<number>;
//#endregion
//#region src/commands.d.ts
interface CommandContext {
  cwd: string;
  io: CliIo;
}
declare function runCommand(argv: string[], context: CommandContext): Promise<number>;
declare function resumeCommand(argv: string[], context: CommandContext): Promise<number>;
declare function runsLsCommand(argv: string[], context: CommandContext): Promise<number>;
declare function inspectCommand(argv: string[], context: CommandContext): Promise<number>;
/**
* rulvar invoice (P1.3): the per-dispatch reconciliation export from
* the journal's providerCalls ledger, one row per billable provider
* call with the provider's response id when the adapter surfaced one,
* plus the gross/net ledger totals (`totalUsd` here is the GROSS
* figure: abandoned subtrees included, exactly what a provider invoice
* bills). --json prints the machine-readable InvoiceExport; the text
* form prints one line per row and mirrors the export's declared
* pricing basis honestly (RV511): fully attributed runs price per
* request and the rows sum to gross; an aggregate-priced remainder or
* legacy entry makes the export say `row usd is non-additive`, and
* `allocatedUsd` is the additive column that sums to gross in every
* case. Pricing folds at read time from the run's settle pins composed
* with the assembled price table (RV611), the same numbers rulvar
* inspect reports and the engine's own settle mirrors.
*/
declare function invoiceCommand(argv: string[], context: CommandContext): Promise<number>;
/**
* cost-audit (RV1910): the denominator diagnostic over one stored run.
* The four-role benchmark's recovery run produced four mutually
* inconsistent cost views; the lifecycle now admits one, and this
* command VERIFIES it on a concrete journal instead of trusting the
* doctrine: the roster is closed (every agent entry terminal), the
* settle is recorded and is the billing boundary, and the settled
* fold, the invoice totals and the wire cardinality agree. Exit 1
* with the failing checks named when any diverge, which is exactly
* what a pre-RV1904 journal (the benchmark's own) reports. `--all`
* (RV2209) runs the same six checks over EVERY run the store lists,
* one summary row each, exit 1 when any run diverges: the parity
* sessions audited seven journals one invocation at a time, and a
* catalog posture check should cost one command.
*
* The orphaned receipt lane (RV3501): when the invoice carries
* `orphanedReceipts` (RV3405, paid wires the settled terminal's record
* set does not cover), every output form surfaces it: the single run
* text prints the lane totals plus one line per receipt, the JSON
* shapes carry the lane verbatim under `invoice`, and the catalog
* sweep appends an orphaned suffix to the run's row and a carrying
* count to its header. The lane never moves the verdict or the exit
* code: an orphaned receipt is the honest double payment window of a
* resume, not a divergence, and before this surface a journal in that
* shape passed all six checks while the money stayed invisible in
* every printed figure. Journals without the lane render byte for
* byte as before.
*/
declare function costAuditCommand(argv: string[], context: CommandContext): Promise<number>;
/**
* rulvar preflight (the experiment-review P2.2; grammar in grammar.ts):
* the effective-config linter and dry-run estimator. Loads the SAME
* config, module, and run-profile merge `rulvar run` would assemble,
* but constructs no engine, opens no store, and dispatches nothing:
* the report is computed by preflightEstimate over options alone, so
* the command cannot pay for a single provider token by construction.
* The declared spawn wave comes from the `preflight` export of the
* config or workflow module (module wins), and --spawns JSON overrides
* it from the command line. --json prints the machine-readable report.
* Exit 1 when any finding has severity 'error' (the linter contract:
* green preflight means the run can at least start), 0 otherwise.
*/
declare function preflightCommand(argv: string[], context: CommandContext): Promise<number>;
//#endregion
//#region src/config.d.ts
/**
* The preflight declaration a config or workflow module may export
* (the experiment-review P2.2): the declared spawn wave, the
* orchestrator spec, and the quota rule set behind the configured
* limiter, exactly the PreflightInput slices the estimator cannot
* derive from engineOptions alone. `rulvar preflight` merges the
* workflow module's declaration over the config file's, and --spawns
* overrides the spawn wave from the command line.
*/
type PreflightDeclaration = Pick<PreflightInput, "spawns" | "orchestrator" | "quotaRules">;
/** The shape both the config module and a workflow module may export. */
interface CliConfig {
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
  /** rulvar preflight declaration (P2.2). */
  preflight?: PreflightDeclaration;
  /** rulvar kb sweep configuration (M11-T05). */
  kbSweep?: KbSweepCliConfig;
  /**
  * The module's own configuration identity (RV4602): recorded on
  * every run this module starts, verified by the engine on every
  * resume and replay STRICTLY before ownership, meta writes, or any
  * provider call, so policy drift refuses typed instead of running.
  * The seventh comparison experiment's programmatic run recorded a
  * fingerprint the CLI then never supplied back, which downgraded the
  * genesis binding to a warning; a descriptor module carrying the
  * fingerprint closes that loop.
  */
  configFingerprint?: string;
}
/**
* The kb sweep config: a FIXED pool (sweep volume is never authorized
* by proposal volume) plus the cases per taskClass. Structural sweep
* shapes only: the CLI's static dependency stays @rulvar/core and
* @rulvar/evals loads dynamically at command time (the plan-command
* precedent), so graders and cases are typed by the config module.
*/
interface KbSweepCliConfig {
  /** The dedicated committer identity recorded on gates and authors. */
  committerId: string;
  /** The fixed pool; falsification UNIONS in the store's negative-claim and re-measure subjects. */
  models: Array<{
    model: `${string}:${string}`;
    effort?: string;
  }>;
  /** Eval cases tagged by taskClass (constructed with @rulvar/evals inside the config module). */
  cases: Array<{
    taskClass: string;
    case: unknown;
  }>;
  thresholds?: {
    strength?: number;
    weakness?: number;
  };
  /** Optional canary probes run per pool member BEFORE the sweep; drift flips stale. */
  canary?: {
    agentType: string;
    prompts: string[];
  };
  /** Default: kb-sweep-<observedAt ISO>. */
  reportId?: string;
  /** Per-member engine override; default: engineOptions with loop/extract routed at the member. */
  engineFor?: (member: {
    model: `${string}:${string}`;
    effort?: string;
  }) => unknown;
  /**
  * Immutable per-run ceilings and the aggregate debit-only envelope
  * (v1.16.2 review P1-2). A sweep multiplies paid runs: pool members
  * times cases for targets, one judge run per judge-grader call, one
  * canary run per probe per member, and the falsification union can
  * grow the pool past the configured models. Per-run ceilings alone do
  * not bound that product, so maxTotalUsd is the hard aggregate ceiling
  * every target, judge, and canary run authorizes against BEFORE it
  * starts. Required unless allowUnbounded is set: a sweep is never
  * silently unbounded.
  */
  budgets?: {
    /** Immutable ceiling B0 of every eval target run. */targetUsd: number; /** Immutable ceiling of every judge run. */
    judgeUsd: number; /** Immutable ceiling of every canary probe run. */
    canaryUsd: number; /** The debit-only envelope over the WHOLE sweep (targets, judges, canary). */
    maxTotalUsd: number;
  };
  /**
  * Explicitly waive the ceilings and run every target, judge, and
  * canary run unbounded (the pre-v1.16.2 behavior). A sweep with
  * neither budgets nor this flag set fails loudly: an unbounded paid
  * matrix is never the silent default.
  */
  allowUnbounded?: boolean;
}
/** Loads `rulvar.config.mjs`/`.js` from cwd; absent config is fine. */
declare function loadCliConfig(cwd: string): Promise<CliConfig>;
interface LoadedWorkflowModule {
  workflow?: Workflow<never, unknown>;
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
  preflight?: PreflightDeclaration;
  /** The module's declared configuration identity (RV4602). */
  configFingerprint?: string;
}
/** Imports a workflow module given on the command line. */
declare function loadWorkflowModule(file: string, cwd: string): Promise<LoadedWorkflowModule>;
/** True when the `run` target names a file rather than a registry entry. */
declare function looksLikeFile(target: string): boolean;
//#endregion
//#region src/engine-assembly.d.ts
declare const DEFAULT_STORE_DIR = ".rulvar";
interface AssembledCli {
  engine: Engine;
  store: JournalStore;
  workflows: WorkflowRegistry;
  /** The journal-fold price function (table wins over caps). */
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /**
  * The resolved pricing row behind priceUsd (table wins over caps),
  * surfaced for the provenance renderers (RV814): the invoice names
  * each priced model's `ratesVerifiedAt` with its age, and the row is
  * where the date lives.
  */
  pricingOf: (servedBy: ModelRef) => Pricing | undefined;
  /**
  * The deployment's argsHash salt (engineOptions.security, RV-217),
  * surfaced so the CLI resume args gate hashes supplied --args the
  * same way the engine hashed the genesis args.
  */
  argsHashSalt?: string;
  /**
  * The configured price table's version (RV706), surfaced so the
  * invoice and inspect surfaces can name the CURRENT table in a
  * composed provenance instead of leaving the tail's rates anonymous.
  * Absent when the config declares no table.
  */
  currentPricingVersion?: string;
}
declare function assembleEngine(options: {
  /** RV1512: disarm the JSONL torn-tail repair on load (audit reads). */repairOnLoad?: boolean;
  config: CliConfig;
  module?: LoadedWorkflowModule;
  storePath?: string;
  profile?: string;
  cwd: string;
}): AssembledCli;
//#endregion
//#region src/drive.d.ts
/**
* Drives a handle to a terminal outcome, resolving suspensions
* interactively and resuming until the run settles or input runs dry.
*/
declare function driveRun(options: {
  engine: Engine;
  workflow: Workflow<never, unknown>;
  first: RunHandle<unknown>;
  io: CliIo; /** Original run arguments: not journaled in v1, the host re-supplies them. */
  args?: unknown;
}): Promise<RunOutcome<unknown>>;
/**
* Renders the settled outcome; returns the process exit code. Error
* messages, suspension keys, model refs, and phase names originate from
* providers, tools, and workflow authors, so each is sanitized before
* it reaches a terminal line, matching the TUI renderer (v1.24.1 review
* P2-1). Values print as JSON, which escapes control bytes on its own.
*/
declare function reportOutcome(outcome: RunOutcome<unknown>, io: CliIo): number;
/**
* `--strict` (the v1.40.0 improvement plan's completion contract): a
* settled ok run whose orchestration acceptance envelope reports a
* completion other than 'complete' exits nonzero, with the degraded
* reasons printed. Outcomes without an acceptance envelope (a workflow
* that never opted into orchestrate acceptance) and nonzero exit codes
* pass through unchanged, so the flag never masks the ordinary status
* exit and never bites a plain workflow.
*
* Completion answers for the CHILDREN, never for the artifact, so
* strict also reads the deliverable verdict (RV2604): a
* `deliverableAccepted: false` exits nonzero even under a green
* completion, the row the twenty-fifth comparison run landed on when
* its child roster passed and its declared contract refused every
* synthesis. An ABSENT verdict is left alone, because nothing judged
* anything and a host that declares no contract is its own judge.
*
* Completion is a MECHANICAL verdict, and the eighteenth comparison
* benchmark showed how easily `completion: 'complete'` reads as
* semantic green while the claim judge saw 40 of 144 citing sentences.
* So strict also reads the claim-coverage grade (RV1702) when the
* outcome carries a claim-consistency meta: `'judge-failed'` (nothing
* was judged), `'judge-declined'` (RV2508: the judge was refused
* admission and never dispatched, so nothing was judged either) and
* `'critical-uncovered'` (declared claims went unverified) exit
* nonzero, because all three previously slipped through strict as
* green; `'partial'` prints its counts to stderr and keeps the exit,
* because the bounded pass is the documented default and declaring
* critical anchors is the opt-in that makes the subset enforceable,
* and `'vacuous'` (RV2508: the draft cited nothing, so the configured
* pass verified nothing) prints and keeps the exit too, because
* citing nothing breaks no contract the pass declares.
*/
declare function strictExitCode(outcome: RunOutcome<unknown>, base: number, io: CliIo): number;
//#endregion
//#region src/server.d.ts
interface CreateServerOptions {
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
  * durable record of the run itself. Defaults to
  * {@link DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN} (RV409; before v1.94.0
  * absent meant unbounded, and an explicit huge bound such as
  * `Number.MAX_SAFE_INTEGER` restores that behavior in effect).
  * Validated at construction: a positive safe integer, anything else
  * is a typed ConfigError.
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
declare const DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT = 1e4;
/**
* The default per-run replay-buffer bound (RV409): generous enough
* that any ordinary run keeps its full replay (lifecycle events number
* in the hundreds; only long `agent:stream` delta torrents approach
* tens of thousands), small enough that one delta-heavy run cannot
* grow process memory past a few tens of megabytes. Past the bound the
* oldest events are dropped and the replay marks the gap; the journal
* remains the durable record. Before v1.94.0 an absent
* `maxBufferedEventsPerRun` meant unbounded; set an explicit huge
* bound (`Number.MAX_SAFE_INTEGER`) to restore that in effect.
*/
declare const DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN = 5e4;
interface RulvarServer {
  fetch(req: Request): Promise<Response>;
}
declare function createServer(options: CreateServerOptions): RulvarServer;
//#endregion
//#region src/worker.d.ts
/** Appendix A: the committed reference lease ttl. */
declare const DEFAULT_WORKER_TTL_MS = 6e4;
/**
* The options of {@link createWorker}, the queue shell over the public
* engine API.
*
* What the stock worker does NOT check (plan 49 wave B, the RV4913
* remainder). The worker is not a regulated worker: the production
* host guide's RACI applies to a worker deployment unchanged, and the
* list below is what stays the host's to assert, enforce, or supply.
* Before RV4913 the resume was blind (`{ lease, args }` only), so none
* of the assertions could reach the engine from a worker at all;
* 1.253.0 forwards them, and the rest is read from the code.
*
* 1. It asserts no resume posture of its own. What reaches
*    `engine.resume` is `{ ...resumeOptions, args, lease }`, so without
*    a host supplied `resumeOptions` the engine defaults decide: a
*    changed workflow body warns and proceeds (`bodyHash` defaults to
*    `'warn'`), a recorded `configFingerprint` goes unchecked (the
*    engine warns `RULVAR_RESUME_FINGERPRINT_UNCHECKED`), a recorded
*    `scope` resumes verbatim without an assertion, and a run holding
*    open wire intents refuses typed and is poisoned for this worker.
*    The worker computes none of those values: it has no config
*    module, no fingerprint of the engine it was built from, and no
*    scope of its own. The function form receives the run's `RunMeta`
*    (its recorded `configFingerprint`, `scope`, `budgetUsd`,
*    `workflowName`), so the host re asserts what genesis recorded or
*    throws a `ConfigError` to refuse.
* 2. It compiles no regulated profile and attests nothing.
*    `compileRegulatedProfile` is a host call at engine assembly; the
*    worker never reads a `profileHash` and never compares the engine
*    it runs to the posture a run was started under. The only bridge
*    is `resumeOptions.configFingerprint`, and it is the ENGINE that
*    compares it against the genesis record before ownership; a worker
*    built over a loosened engine drives a regulated run like any other
*    unless the host supplies that fingerprint.
* 3. It trusts `argsFor`. Run arguments are not journaled; the engine
*    records `argsProvided` and a canonical `argsHash` at genesis,
*    carries them through every resume, and does not enforce them. The
*    worker passes whatever `argsFor(meta)` returns and compares
*    nothing against `meta.argsHash`, so the refusal belongs to the
*    host (`hashRunArgs(args)` against the recorded hash before the
*    resume), which is what `rulvar resume` does and what its
*    `--allow-args-change` overrides.
* 4. It bounds no money and no admission. `concurrency` caps leased
*    runs in one process and nothing else: a run's ceiling is what its
*    own `RunMeta` recorded (or what a host `resumeOptions.run`
*    override asks, journaled by the engine as a `run_budget_override`
*    decision), spawn admission and quotas are the engine's, and two
*    workers with `concurrency: 1` over one store drive two runs,
*    because no fleet wide cap on active runs lives here.
* 5. It selects nothing by identity. Every meta the store lists as
*    `running` or `suspended` is a candidate whatever its tenant,
*    region, or account (`listRuns({ statuses })` carries no scope
*    filter), so a fleet that must not drive another fleet's runs
*    separates stores, or refuses per run from the `resumeOptions`
*    function (a thrown `ConfigError` poisons the run for this worker;
*    a `scope` it asserts that differs from the recorded one is refused
*    by the engine).
* 6. It reads the meta row, never the journal, to decide candidacy. A
*    row behind a journaled settle, or a terminal row stranded over
*    live journal work, is invisible to a sweep; `rulvar runs audit`
*    names those divergences and its `--repair` rewrites them.
* 7. Poison is process local and retry is unbounded. A run the worker
*    poisons (a `ConfigError`, a `JournalCompatibilityError`, an
*    unregistered workflow) is skipped by THIS worker until a restart
*    or a new generation of the runId; nothing is written to the store,
*    so another worker retries it. A run whose resume rejects without
*    settling (a withheld settlement, a failed store write) stays a
*    candidate and is re leased on every sweep with no attempt counter
*    and no backoff, so a deterministic failure is a paid loop until a
*    human reads `onError`.
* 8. It authenticates nobody and isolates nothing. The worker has no
*    network surface (the HTTP server's authentication is host
*    middleware, and the worker sits behind none of it); tools run
*    wherever the engine's executors and profiles put them, and the
*    worker configures no executor, permission layer, worktree, or
*    container.
* 9. Retention is the host's predicate: `retention(meta)` alone decides
*    deletion, applied under a brief lease; absent, everything
*    persists, and no age or size policy exists in the worker.
* 10. The lease protocol is the store's. The ttl match is verified only
*    over a store that exposes `leaseTtlMs`; a store without the
*    capability is trusted with the worker's ttl, and a stale writer's
*    meta and blob writes are rejected only over a store declaring
*    `fencedWrites` (the journal is fenced always). The worker adds no
*    fencing of its own.
* 11. It observes events and persists none. `onEvent` sees the stream
*    in order and the drain keeps memory bounded; nothing is exported
*    (`toOtel` is the host's call) and the journal stays the record.
* 12. The recorded postures are the engine's to restore.
*    `strictPricing`, `clampTurnToExposure` (since RV4913),
*    `budgetPolicy`, the scope with its normalization table, and the
*    fingerprint come back from `RunMeta` on every resume without the
*    worker's help; the worker neither re arms nor checks them, and
*    `resumeOptions.run` is the one door that changes a ceiling.
*/
interface CreateWorkerOptions {
  /**
  * The LeasableStore to lease runs from; MUST be the same journal the
  * engine writes (Engine.stores.journal), or the fencing epoch would
  * protect a store nobody appends to. Verified at start.
  */
  store: LeasableStore;
  /** Appendix A: leased runs per worker process; default 1. */
  concurrency?: number;
  /** Lease owner id; defaults to a per-process identity. */
  owner?: string;
  /**
  * The store's lease ttl; the worker renews at ttl/3 (the normative
  * bound). An integer between 1 and 2147483647 ms, refused as a
  * ConfigError at construction. MUST match the store's configured ttl:
  * when the store exposes the optional `leaseTtlMs` capability
  * (SqliteStore does), the match is VERIFIED at construction and a
  * mismatch is a ConfigError; a store without the capability is
  * trusted. Omitted, the worker ADOPTS the store's exposed ttl, falling
  * back to the Appendix A reference 60000 ms.
  */
  ttlMs?: number;
  /**
  * Idle sweep cadence for start(); default 1000 ms. An integer between
  * 1 and 2147483647 ms, refused as a ConfigError at construction (an
  * overflow or a value that is not finite would collapse to the 1 ms floor
  * and storm the store; v1.35.0 review P2-4). Zero is not a manual
  * mode: drive sweeps directly with worker.sweep() instead of
  * start().
  */
  pollMs?: number;
  /**
  * The OQ-21 interim channel: original in-process run arguments are not
  * journaled in v1, so the host re-supplies them per run. Absent means
  * args resume as undefined (fully replayed prefixes never notice).
  */
  argsFor?: (meta: RunMeta) => unknown;
  /** DEF-6 window extension, in lockstep with the engine assembly. */
  extraDerivers?: KeyDeriver[];
  /** Observability hook for per-run failures; never throws into the loop. */
  onError?: (runId: string, error: unknown) => void;
  /**
  * Opt-in retention (OQ-20 executed at M8-T04): evaluated
  * during sweeps over SETTLED runs (terminal meta); a true verdict
  * applies engine.deleteRun under a briefly held lease. Absent means
  * everything persists indefinitely.
  */
  retention?: (meta: RunMeta) => boolean;
  /**
  * Observer of every event of every run this worker drives (RV4913),
  * in emission order, called from the worker's own drain of the
  * handle's event stream. The engine subscribes that stream at handle
  * creation and buffers it without bound until a consumer arrives,
  * and the stock worker never arrived, so a long run held its whole
  * event history in memory until settle, multiplied by `concurrency`.
  * The drain now runs whether or not this hook is set (compaction
  * keeps the queue bounded behind it); the hook is where a host
  * renders or exports per run. A throw is swallowed: observability
  * never breaks the loop.
  */
  onEvent?: (event: WorkflowEvent) => void;
  /**
  * Observability hook for sweep failures (RV4913): a `listRuns` or
  * `acquire` that rejects (a store outage) used to be swallowed by the
  * poll timer, so a worker over a dead store idled silently. The timer
  * path now reports each failed sweep here and raises
  * `Worker.lastSweepError()` until the next sweep completes; a direct
  * `sweep()` call still rejects to its caller. Never throws into the
  * loop.
  */
  onSweepError?: (error: unknown) => void;
  /**
  * The resume posture forwarded to `engine.resume` for every driven
  * run (RV4913), as one value or computed per run from the run's
  * meta: everything `ResumeOptions` offers except `lease` (the
  * worker's own) and `args` (`argsFor`), so `bodyHash: 'refuse'`, the
  * `configFingerprint` and `scope` assertions, `run` overrides, and the
  * RV4006 `acknowledgeOpenWireIntents` acknowledgment reach the
  * engine. Without it the worker resumes under the engine defaults: a
  * changed body warns and proceeds, a recorded fingerprint or scope
  * goes unchecked, and a run holding open wire intents refuses typed
  * and poisons for this worker (before this option nothing could lift
  * that refusal: a run that died mid wire under the intent posture
  * was never resumed by a worker again). A throw from the function
  * form is reported through `onError` and the lease is handed back
  * (a ConfigError poisons the run for this worker, the binding rule).
  */
  resumeOptions?: WorkerResumeOptions | ((meta: RunMeta) => WorkerResumeOptions);
}
/**
* The resume posture a worker may forward (RV4913): `ResumeOptions`
* without the two fields the worker owns, `lease` and `args`.
*/
type WorkerResumeOptions = Omit<ResumeOptions, "lease" | "args">;
interface Worker {
  /** Begins sweeping on the poll cadence. Idempotent. */
  start(): void;
  /**
  * One sweep: lease and resume eligible runs up to the concurrency
  * cap. Returns the number of runs picked up. Exposed so hosts and
  * tests can drive the worker deterministically without timers. A
  * store failure rejects here and raises `lastSweepError()`.
  */
  sweep(): Promise<number>;
  /**
  * Stops sweeping, cancels in flight runs (evicted runs included) and
  * waits for their settle, releases held leases.
  */
  stop(): Promise<void>;
  /**
  * runIds occupying a slot: runs held under a lease, plus evicted runs
  * (a failed renew) still unwinding their cancel. A slot frees only
  * when its run settles, never before the cancel lands (RV4913).
  */
  active(): string[];
  /**
  * Readiness (RV4913): the error of the most recent sweep that failed
  * against the store, or undefined once a later sweep completed. A
  * store outage used to be a silent idle; with this flag a health
  * probe can report a worker that polls a store it cannot read.
  */
  lastSweepError(): unknown;
}
/**
* The queue shell over the public engine API (M8, FR-703): leases
* resumable and suspended runs from a `LeasableStore` under the
* fencing epoch and drives each through `engine.resume`.
*
* It is not a regulated worker. What it does NOT check (plan 49 wave
* B, the RV4913 remainder; the same list as {@link CreateWorkerOptions}):
*
* 1. It asserts no resume posture of its own: `engine.resume` receives
*    `{ ...resumeOptions, args, lease }`, and without a host supplied
*    `resumeOptions` the engine defaults decide (`bodyHash` `'warn'`, a
*    recorded `configFingerprint` unchecked, a recorded `scope` restored
*    without an assertion, open wire intents refused and poisoned). The
*    worker computes none of those values; the function form sees the
*    run's `RunMeta` so the host re asserts what genesis recorded or
*    throws a `ConfigError` to refuse.
* 2. It compiles no regulated profile and attests nothing; the only
*    bridge is `resumeOptions.configFingerprint`, which the ENGINE
*    compares against the genesis record before ownership.
* 3. It trusts `argsFor`: arguments are not journaled, the engine
*    records `argsProvided` and `argsHash` at genesis and does not
*    enforce them, and the worker compares nothing; the refusal is the
*    host's (`hashRunArgs(args)` against `meta.argsHash`), which is
*    what `rulvar resume` does and `--allow-args-change` overrides.
* 4. It bounds no money and no admission: `concurrency` caps leased
*    runs in one process only; a run's ceiling is its recorded one (or
*    the host's `resumeOptions.run` override, journaled by the engine),
*    and no fleet wide cap on active runs lives here.
* 5. It selects nothing by identity: every `running` or `suspended`
*    meta in the store is a candidate whatever its tenant, region, or
*    account; separate stores, or refuse per run from the
*    `resumeOptions` function.
* 6. It reads the meta row, never the journal, for candidacy; the
*    divergences `rulvar runs audit` names are invisible to a sweep.
* 7. Poison is process local and retry is unbounded: a poisoned run is
*    skipped by THIS worker until a restart or a new generation and
*    nothing is written to the store, and a resume that rejects without
*    settling is re leased on every sweep with no attempt counter and
*    no backoff.
* 8. It authenticates nobody and isolates nothing: no network surface,
*    no executor, permission layer, worktree, or container of its own.
* 9. Retention is the host's predicate; absent, everything persists.
* 10. The lease protocol is the store's: the ttl match is verified only
*    over a store exposing `leaseTtlMs`, stale meta and blob writes are
*    rejected only over a store declaring `fencedWrites` (the journal is
*    fenced always), and the worker adds no fencing of its own.
* 11. It observes events and persists none: `onEvent` sees the stream,
*    nothing is exported, the journal stays the record.
* 12. The recorded postures (`strictPricing`, `clampTurnToExposure`,
*    `budgetPolicy`, the scope with its normalization table, the
*    fingerprint) are restored from `RunMeta` by the engine; the worker
*    neither re arms nor checks them, and `resumeOptions.run` is the
*    one door that changes a ceiling.
*/
declare function createWorker(engine: Engine, options: CreateWorkerOptions): Worker;
//#endregion
//#region src/tui.d.ts
/**
* Renders one event to a line, or undefined for silent event types. The
* composed line is sanitized so an untrusted provider/tool/log string
* cannot inject a control sequence or a second physical line (v1.21.0
* review P2-1).
*/
declare function renderEventLine(event: WorkflowEvent): string | undefined;
/** Attaches the renderer to a handle's event stream; returns a detach. */
declare function attachProgress(handle: RunHandle<unknown>, io: CliIo): () => void;
//#endregion
//#region src/otel.d.ts
/** The tiny subset of the OTel Tracer/Span API the exporter uses. */
interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
  setStatus(status: {
    code: number;
    message?: string;
  }): void;
  end(endTime?: number): void;
}
interface TracerLike {
  startSpan(name: string, options?: {
    startTime?: number;
    attributes?: Record<string, string | number | boolean>;
  }, context?: unknown): SpanLike;
}
/** Minimal OTel context surface (setSpan/with) for parentage. */
interface OtelContextApi {
  active(): unknown;
  with<T>(context: unknown, fn: () => T): T;
}
interface ToOtelOptions {
  /** OTel context API for parentage; when absent, spans are flat but attributed. */
  contextApi?: OtelContextApi;
  /** trace.setSpan(context, span) equivalent; required with contextApi. */
  setSpan?: (context: unknown, span: SpanLike) => unknown;
  /**
  * Host redaction patterns applied to every exported string attribute
  * ON TOP of the default credential set (RV-217). Feed the same list
  * as `createEngine redaction.patterns` for event/trace parity; an
  * invalid pattern is a typed ConfigError before anything exports.
  */
  patterns?: ReadonlyArray<RegExp | string>;
}
/**
* Exports one run's event stream onto a tracer. The run's events are
* consumed in seq order; span openers start spans, the matching
* closers end them, and payload-only events attach as span events on
* the innermost open span. Returns the number of spans created. Every
* terminal path exports, the unsettled ones included (RV1106): a
* rejecting `result` never fails an export the stream already
* completed, it only marks any leftover span with the refusal.
*/
declare function toOtel(run: {
  runId: string;
  events: AsyncIterable<WorkflowEvent>;
  result: Promise<RunOutcome<unknown>>;
}, tracer: TracerLike, options?: ToOtelOptions): Promise<number>;
//#endregion
export { type AssembledCli, type CliConfig, type CliIo, type CommandContext, type CreateServerOptions, type CreateWorkerOptions, DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN, DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT, DEFAULT_STORE_DIR, DEFAULT_WORKER_TTL_MS, HELP, type KbSweepCliConfig, type LoadedWorkflowModule, type OtelContextApi, type PreflightDeclaration, type RulvarServer, type SpanLike, type ToOtelOptions, type TracerLike, type Worker, type WorkerResumeOptions, assembleEngine, attachProgress, costAuditCommand, createServer, createWorker, driveRun, inspectCommand, invoiceCommand, loadCliConfig, loadWorkflowModule, looksLikeFile, preflightCommand, processIo, renderEventLine, reportOutcome, resumeCommand, runCli, runCommand, runsLsCommand, strictExitCode, toOtel };