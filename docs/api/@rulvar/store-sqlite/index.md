[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/store-sqlite

# @rulvar/store-sqlite

SQLite journal store implementing the rulvar storage SPI with the lease
capability and a fencing epoch, on the builtin `node:sqlite` driver; the
reference implementation for community stores. Exports `SqliteStore`.

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/store-sqlite
```

## Documentation

- [Stores](https://docs.rulvar.com/guide/stores)
- [Store authors](https://docs.rulvar.com/guide/store-authors)
- [API reference](https://docs.rulvar.com/api/%40rulvar/store-sqlite/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Classes

| Class | Description |
| ------ | ------ |
| [SqliteStore](/api/@rulvar/store-sqlite/classes/SqliteStore.md) | @rulvar/store-sqlite: SqliteStore implementing JournalStore and LeasableStore with fencing epochs over the builtin node:sqlite driver; the reference implementation for community stores (M5-T02). Requires a Node.js with node:sqlite available (unflagged in the 22.13+/23.4+ lines). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [SqliteStoreOptions](/api/@rulvar/store-sqlite/interfaces/SqliteStoreOptions.md) | @rulvar/store-sqlite: SqliteStore implementing JournalStore and LeasableStore with fencing epochs over the builtin node:sqlite driver; the reference implementation for community stores (M5-T02). Requires a Node.js with node:sqlite available (unflagged in the 22.13+/23.4+ lines). |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_LEASE\_TTL\_MS](/api/@rulvar/store-sqlite/variables/DEFAULT_LEASE_TTL_MS.md) | Appendix A interim reference for the sqlite store. |
