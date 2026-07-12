# @rulvar/store-conformance

The executable conformance kit for rulvar store adapters: append
atomicity, total per-run order, read-your-writes, payload opacity, lease
fencing, and golden fold-state fixtures. If you implement a custom
store, this suite is the contract your implementation must pass. Exports
`journalStoreConformance`, `leasableStoreConformance`, and
`registerConformance`.

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add -D @rulvar/store-conformance
```

## Documentation

- [Store authors](https://docs.rulvar.com/guide/store-authors)
- [Stores](https://docs.rulvar.com/guide/stores)
- [API reference](https://docs.rulvar.com/api/%40rulvar/store-conformance/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
