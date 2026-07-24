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
