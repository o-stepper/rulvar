[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CreateWorkerOptions

# Interface: CreateWorkerOptions

Defined in: [packages/cli/src/worker.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L166)

The options of [createWorker](/api/@rulvar/cli/functions/createWorker.md), the queue shell over the public
engine API.

What the stock worker does NOT check (plan 49 wave B, the RV4913
remainder). The worker is not a regulated worker: the production
host guide's RACI applies to a worker deployment unchanged, and the
list below is what stays the host's to assert, enforce, or supply.
Before RV4913 the resume was blind (`{ lease, args }` only), so none
of the assertions could reach the engine from a worker at all;
1.253.0 forwards them, and the rest is read from the code.

1. It asserts no resume posture of its own. What reaches
   `engine.resume` is `{ ...resumeOptions, args, lease }`, so without
   a host supplied `resumeOptions` the engine defaults decide: a
   changed workflow body warns and proceeds (`bodyHash` defaults to
   `'warn'`), a recorded `configFingerprint` goes unchecked (the
   engine warns `RULVAR_RESUME_FINGERPRINT_UNCHECKED`), a recorded
   `scope` resumes verbatim without an assertion, and a run holding
   open wire intents refuses typed and is poisoned for this worker.
   The worker computes none of those values: it has no config
   module, no fingerprint of the engine it was built from, and no
   scope of its own. The function form receives the run's `RunMeta`
   (its recorded `configFingerprint`, `scope`, `budgetUsd`,
   `workflowName`), so the host re asserts what genesis recorded or
   throws a `ConfigError` to refuse.
2. It compiles no regulated profile and attests nothing.
   `compileRegulatedProfile` is a host call at engine assembly; the
   worker never reads a `profileHash` and never compares the engine
   it runs to the posture a run was started under. The only bridge
   is `resumeOptions.configFingerprint`, and it is the ENGINE that
   compares it against the genesis record before ownership; a worker
   built over a loosened engine drives a regulated run like any other
   unless the host supplies that fingerprint.
3. It trusts `argsFor`. Run arguments are not journaled; the engine
   records `argsProvided` and a canonical `argsHash` at genesis,
   carries them through every resume, and does not enforce them. The
   worker passes whatever `argsFor(meta)` returns and compares
   nothing against `meta.argsHash`, so the refusal belongs to the
   host (`hashRunArgs(args)` against the recorded hash before the
   resume), which is what `rulvar resume` does and what its
   `--allow-args-change` overrides.
4. It bounds no money and no admission. `concurrency` caps leased
   runs in one process and nothing else: a run's ceiling is what its
   own `RunMeta` recorded (or what a host `resumeOptions.run`
   override asks, journaled by the engine as a `run_budget_override`
   decision), spawn admission and quotas are the engine's, and two
   workers with `concurrency: 1` over one store drive two runs,
   because no fleet wide cap on active runs lives here.
5. It selects nothing by identity. Every meta the store lists as
   `running` or `suspended` is a candidate whatever its tenant,
   region, or account (`listRuns({ statuses })` carries no scope
   filter), so a fleet that must not drive another fleet's runs
   separates stores, or refuses per run from the `resumeOptions`
   function (a thrown `ConfigError` poisons the run for this worker;
   a `scope` it asserts that differs from the recorded one is refused
   by the engine).
6. It reads the meta row, never the journal, to decide candidacy. A
   row behind a journaled settle, or a terminal row stranded over
   live journal work, is invisible to a sweep; `rulvar runs audit`
   names those divergences and its `--repair` rewrites them.
7. Poison is process local and retry is unbounded. A run the worker
   poisons (a `ConfigError`, a `JournalCompatibilityError`, an
   unregistered workflow) is skipped by THIS worker until a restart
   or a new generation of the runId; nothing is written to the store,
   so another worker retries it. A run whose resume rejects without
   settling (a withheld settlement, a failed store write) stays a
   candidate and is re leased on every sweep with no attempt counter
   and no backoff, so a deterministic failure is a paid loop until a
   human reads `onError`.
8. It authenticates nobody and isolates nothing. The worker has no
   network surface (the HTTP server's authentication is host
   middleware, and the worker sits behind none of it); tools run
   wherever the engine's executors and profiles put them, and the
   worker configures no executor, permission layer, worktree, or
   container.
9. Retention is the host's predicate: `retention(meta)` alone decides
   deletion, applied under a brief lease; absent, everything
   persists, and no age or size policy exists in the worker.
10. The lease protocol is the store's. The ttl match is verified only
   over a store that exposes `leaseTtlMs`; a store without the
   capability is trusted with the worker's ttl, and a stale writer's
   meta and blob writes are rejected only over a store declaring
   `fencedWrites` (the journal is fenced always). The worker adds no
   fencing of its own.
11. It observes events and persists none. `onEvent` sees the stream
   in order and the drain keeps memory bounded; nothing is exported
   (`toOtel` is the host's call) and the journal stays the record.
12. The recorded postures are the engine's to restore.
   `strictPricing`, `clampTurnToExposure` (since RV4913),
   `budgetPolicy`, the scope with its normalization table, and the
   fingerprint come back from `RunMeta` on every resume without the
   worker's help; the worker neither re arms nor checks them, and
   `resumeOptions.run` is the one door that changes a ceiling.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argsfor"></a> `argsFor?` | (`meta`) => `unknown` | The OQ-21 interim channel: original in-process run arguments are not journaled in v1, so the host re-supplies them per run. Absent means args resume as undefined (fully replayed prefixes never notice). | [packages/cli/src/worker.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L202) |
| <a id="property-concurrency"></a> `concurrency?` | `number` | Appendix A: leased runs per worker process; default 1. | [packages/cli/src/worker.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L174) |
| <a id="property-extraderivers"></a> `extraDerivers?` | [`KeyDeriver`](/api/@rulvar/rulvar/interfaces/KeyDeriver.md)[] | DEF-6 window extension, in lockstep with the engine assembly. | [packages/cli/src/worker.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L204) |
| <a id="property-onerror"></a> `onError?` | (`runId`, `error`) => `void` | Observability hook for per-run failures; never throws into the loop. | [packages/cli/src/worker.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L206) |
| <a id="property-onevent"></a> `onEvent?` | (`event`) => `void` | Observer of every event of every run this worker drives (RV4913), in emission order, called from the worker's own drain of the handle's event stream. The engine subscribes that stream at handle creation and buffers it without bound until a consumer arrives, and the stock worker never arrived, so a long run held its whole event history in memory until settle, multiplied by `concurrency`. The drain now runs whether or not this hook is set (compaction keeps the queue bounded behind it); the hook is where a host renders or exports per run. A throw is swallowed: observability never breaks the loop. | [packages/cli/src/worker.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L226) |
| <a id="property-onsweeperror"></a> `onSweepError?` | (`error`) => `void` | Observability hook for sweep failures (RV4913): a `listRuns` or `acquire` that rejects (a store outage) used to be swallowed by the poll timer, so a worker over a dead store idled silently. The timer path now reports each failed sweep here and raises `Worker.lastSweepError()` until the next sweep completes; a direct `sweep()` call still rejects to its caller. Never throws into the loop. | [packages/cli/src/worker.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L236) |
| <a id="property-owner"></a> `owner?` | `string` | Lease owner id; defaults to a per-process identity. | [packages/cli/src/worker.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L176) |
| <a id="property-pollms"></a> `pollMs?` | `number` | Idle sweep cadence for start(); default 1000 ms. An integer between 1 and 2147483647 ms, refused as a ConfigError at construction (an overflow or a value that is not finite would collapse to the 1 ms floor and storm the store; v1.35.0 review P2-4). Zero is not a manual mode: drive sweeps directly with worker.sweep() instead of start(). | [packages/cli/src/worker.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L196) |
| <a id="property-resumeoptions"></a> `resumeOptions?` | \| [`WorkerResumeOptions`](/api/@rulvar/cli/type-aliases/WorkerResumeOptions.md) \| ((`meta`) => [`WorkerResumeOptions`](/api/@rulvar/cli/type-aliases/WorkerResumeOptions.md)) | The resume posture forwarded to `engine.resume` for every driven run (RV4913), as one value or computed per run from the run's meta: everything `ResumeOptions` offers except `lease` (the worker's own) and `args` (`argsFor`), so `bodyHash: 'refuse'`, the `configFingerprint` and `scope` assertions, `run` overrides, and the RV4006 `acknowledgeOpenWireIntents` acknowledgment reach the engine. Without it the worker resumes under the engine defaults: a changed body warns and proceeds, a recorded fingerprint or scope goes unchecked, and a run holding open wire intents refuses typed and poisons for this worker (before this option nothing could lift that refusal: a run that died mid wire under the intent posture was never resumed by a worker again). A throw from the function form is reported through `onError` and the lease is handed back (a ConfigError poisons the run for this worker, the binding rule). | [packages/cli/src/worker.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L253) |
| <a id="property-retention"></a> `retention?` | (`meta`) => `boolean` | Opt-in retention (OQ-20 executed at M8-T04): evaluated during sweeps over SETTLED runs (terminal meta); a true verdict applies engine.deleteRun under a briefly held lease. Absent means everything persists indefinitely. | [packages/cli/src/worker.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L213) |
| <a id="property-store"></a> `store` | [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md) | The LeasableStore to lease runs from; MUST be the same journal the engine writes (Engine.stores.journal), or the fencing epoch would protect a store nobody appends to. Verified at start. | [packages/cli/src/worker.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L172) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | The store's lease ttl; the worker renews at ttl/3 (the normative bound). An integer between 1 and 2147483647 ms, refused as a ConfigError at construction. MUST match the store's configured ttl: when the store exposes the optional `leaseTtlMs` capability (SqliteStore does), the match is VERIFIED at construction and a mismatch is a ConfigError; a store without the capability is trusted. Omitted, the worker ADOPTS the store's exposed ttl, falling back to the Appendix A reference 60000 ms. | [packages/cli/src/worker.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L187) |
