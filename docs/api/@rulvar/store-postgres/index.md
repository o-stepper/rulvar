[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/store-postgres

# @rulvar/store-postgres

PostgreSQL journal store implementing the Rulvar storage SPI with the
lease capability and a fencing epoch, on node-postgres (`pg`); the
production reference for multi-process and multi-host deployments.
Exports `PostgresStore`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/store-postgres
```

## Documentation

- [Stores](https://docs.rulvar.com/guide/stores)
- [Store authors](https://docs.rulvar.com/guide/store-authors)
- [API reference](https://docs.rulvar.com/api/%40rulvar/store-postgres/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Classes

| Class | Description |
| ------ | ------ |
| [PostgresQuotaLimiter](/api/@rulvar/store-postgres/classes/PostgresQuotaLimiter.md) | The multi-host reference implementation of the core QuotaLimiter SPI: engine processes pointing instances at ONE database and schema (a PostgresStore's database or their own) enforce one global provider quota. Admission consumes the window counters inside a single transaction serialized on a schema-wide advisory transaction lock, so two processes or HOSTS can never both take the last slot; reservations are rows, so `reconcile` settles a grant from any host; both tables are lazily pruned to the current and previous accounting window. The rule model, the fixed epoch-aligned one-minute windows, and the admission decision are the core's own exported functions, so this limiter, `memoryQuotaLimiter`, and `SqliteQuotaLimiter` agree on every verdict. The `rules` MUST be identical across coordinating processes (buckets key on rule content). Runtime contention queues on the advisory lock (a hot limiter is EXPECTED to serialize); a call still waiting past `QUOTA_LOCK_TIMEOUT_MS` throws, and the engine's `onLimiterError` policy decides what that means. Call `close()` when done. |
| [PostgresStore](/api/@rulvar/store-postgres/classes/PostgresStore.md) | @rulvar/store-postgres: PostgresStore implementing JournalStore and LeasableStore with fencing epochs over node-postgres, for multi-process and multi-host deployments (RV-214). Payloads stay opaque TEXT (A4); every run-scoped mutation serializes on a per-run advisory transaction lock so the fence check and the guarded mutation commit as one unit across hosts. Beside it, PostgresQuotaLimiter (RV410) is the multi-host reference of the core QuotaLimiter SPI: one database, one schema, one global provider quota, admission serialized on a schema-wide advisory lock. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [PostgresQuotaLimiterOptions](/api/@rulvar/store-postgres/interfaces/PostgresQuotaLimiterOptions.md) | - |
| [PostgresStoreOptions](/api/@rulvar/store-postgres/interfaces/PostgresStoreOptions.md) | @rulvar/store-postgres: PostgresStore implementing JournalStore and LeasableStore with fencing epochs over node-postgres, for multi-process and multi-host deployments (RV-214). Payloads stay opaque TEXT (A4); every run-scoped mutation serializes on a per-run advisory transaction lock so the fence check and the guarded mutation commit as one unit across hosts. Beside it, PostgresQuotaLimiter (RV410) is the multi-host reference of the core QuotaLimiter SPI: one database, one schema, one global provider quota, admission serialized on a schema-wide advisory lock. |
| [PostgresTranscriptStore](/api/@rulvar/store-postgres/interfaces/PostgresTranscriptStore.md) | The fenced transcript twin over a PostgresStore database (the fenced run state RFC, F2): blobs live in the SAME database as the lease rows, so a lease-carrying put or delete verifies the current holder atomically with the blob mutation. Obtain it from [PostgresStore.transcripts](/api/@rulvar/store-postgres/classes/PostgresStore.md#transcripts); its lifetime is the owning store's (one shared pool, one `close()`). |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_LEASE\_TTL\_MS](/api/@rulvar/store-postgres/variables/DEFAULT_LEASE_TTL_MS.md) | Appendix A interim reference, shared with the sqlite store. |
| [DEFAULT\_POOL\_MAX](/api/@rulvar/store-postgres/variables/DEFAULT_POOL_MAX.md) | Default pg Pool size; every operation is a short transaction. |
| [QUOTA\_LOCK\_TIMEOUT\_MS](/api/@rulvar/store-postgres/variables/QUOTA_LOCK_TIMEOUT_MS.md) | How long a reserve/reconcile transaction waits for the schema-wide admission lock before postgres cancels the statement. Quota admissions are short single-writer transactions; queueing here IS the cross-host serialization working. |
