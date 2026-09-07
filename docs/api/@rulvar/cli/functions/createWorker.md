[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / createWorker

# Function: createWorker()

```ts
function createWorker(engine, options): Worker;
```

Defined in: [packages/cli/src/worker.ts:358](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L358)

The queue shell over the public engine API (M8, FR-703): leases
resumable and suspended runs from a `LeasableStore` under the
fencing epoch and drives each through `engine.resume`.

It is not a regulated worker. What it does NOT check (plan 49 wave
B, the RV4913 remainder; the same list as [CreateWorkerOptions](/api/@rulvar/cli/interfaces/CreateWorkerOptions.md)):

1. It asserts no resume posture of its own: `engine.resume` receives
   `{ ...resumeOptions, args, lease }`, and without a host supplied
   `resumeOptions` the engine defaults decide (`bodyHash` `'warn'`, a
   recorded `configFingerprint` unchecked, a recorded `scope` restored
   without an assertion, open wire intents refused and poisoned). The
   worker computes none of those values; the function form sees the
   run's `RunMeta` so the host re asserts what genesis recorded or
   throws a `ConfigError` to refuse.
2. It compiles no regulated profile and attests nothing; the only
   bridge is `resumeOptions.configFingerprint`, which the ENGINE
   compares against the genesis record before ownership.
3. It trusts `argsFor`: arguments are not journaled, the engine
   records `argsProvided` and `argsHash` at genesis and does not
   enforce them, and the worker compares nothing; the refusal is the
   host's (`hashRunArgs(args)` against `meta.argsHash`), which is
   what `rulvar resume` does and `--allow-args-change` overrides.
4. It bounds no money and no admission: `concurrency` caps leased
   runs in one process only; a run's ceiling is its recorded one (or
   the host's `resumeOptions.run` override, journaled by the engine),
   and no fleet wide cap on active runs lives here.
5. It selects nothing by identity: every `running` or `suspended`
   meta in the store is a candidate whatever its tenant, region, or
   account; separate stores, or refuse per run from the
   `resumeOptions` function.
6. It reads the meta row, never the journal, for candidacy; the
   divergences `rulvar runs audit` names are invisible to a sweep.
7. Poison is process local and retry is unbounded: a poisoned run is
   skipped by THIS worker until a restart or a new generation and
   nothing is written to the store, and a resume that rejects without
   settling is re leased on every sweep with no attempt counter and
   no backoff.
8. It authenticates nobody and isolates nothing: no network surface,
   no executor, permission layer, worktree, or container of its own.
9. Retention is the host's predicate; absent, everything persists.
10. The lease protocol is the store's: the ttl match is verified only
   over a store exposing `leaseTtlMs`, stale meta and blob writes are
   rejected only over a store declaring `fencedWrites` (the journal is
   fenced always), and the worker adds no fencing of its own.
11. It observes events and persists none: `onEvent` sees the stream,
   nothing is exported, the journal stays the record.
12. The recorded postures (`strictPricing`, `clampTurnToExposure`,
   `budgetPolicy`, the scope with its normalization table, the
   fingerprint) are restored from `RunMeta` by the engine; the worker
   neither re arms nor checks them, and `resumeOptions.run` is the
   one door that changes a ceiling.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `options` | [`CreateWorkerOptions`](/api/@rulvar/cli/interfaces/CreateWorkerOptions.md) |

## Returns

[`Worker`](/api/@rulvar/cli/interfaces/Worker.md)
