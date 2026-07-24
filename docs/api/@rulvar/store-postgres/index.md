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
| [PostgresStore](/api/@rulvar/store-postgres/classes/PostgresStore.md) | @rulvar/store-postgres: PostgresStore implementing JournalStore and LeasableStore with fencing epochs over node-postgres, for multi-process and multi-host deployments (RV-214). Payloads stay opaque TEXT (A4); every run-scoped mutation serializes on a per-run advisory transaction lock so the fence check and the guarded mutation commit as one unit across hosts. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [PostgresStoreOptions](/api/@rulvar/store-postgres/interfaces/PostgresStoreOptions.md) | @rulvar/store-postgres: PostgresStore implementing JournalStore and LeasableStore with fencing epochs over node-postgres, for multi-process and multi-host deployments (RV-214). Payloads stay opaque TEXT (A4); every run-scoped mutation serializes on a per-run advisory transaction lock so the fence check and the guarded mutation commit as one unit across hosts. |
| [PostgresTranscriptStore](/api/@rulvar/store-postgres/interfaces/PostgresTranscriptStore.md) | The fenced transcript twin over a PostgresStore database (the fenced run state RFC, F2): blobs live in the SAME database as the lease rows, so a lease-carrying put or delete verifies the current holder atomically with the blob mutation. Obtain it from [PostgresStore.transcripts](/api/@rulvar/store-postgres/classes/PostgresStore.md#transcripts); its lifetime is the owning store's (one shared pool, one `close()`). |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_LEASE\_TTL\_MS](/api/@rulvar/store-postgres/variables/DEFAULT_LEASE_TTL_MS.md) | Appendix A interim reference, shared with the sqlite store. |
| [DEFAULT\_POOL\_MAX](/api/@rulvar/store-postgres/variables/DEFAULT_POOL_MAX.md) | Default pg Pool size; every operation is a short transaction. |
