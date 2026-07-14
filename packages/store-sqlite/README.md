# @rulvar/store-sqlite

SQLite journal store implementing the Rulvar storage SPI with the lease
capability and a fencing epoch, on the builtin `node:sqlite` driver; the
reference implementation for community stores. Exports `SqliteStore`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
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
