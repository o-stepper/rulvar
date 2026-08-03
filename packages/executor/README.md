# @rulvar/executor

Isolated tool executors for Rulvar: the subprocess `ToolExecutorProvider`
(fresh workdir per dispatch, replaced environment, timeout and output
bounds) and the container adapter over the same seam, plus the executor
conformance kit and the optional two-phase effect ledger (a durable
intent BEFORE the external effect, the outcome after, so a crash leaves
an orphan intent as the reconciliation signal instead of an untracked
effect).

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/executor
```

## What it is NOT

The executors isolate a dispatch; they are not a security sandbox by
themselves (bring a container or OS boundary for hostile code), and the
effect ledger is not a transactional outbox, not an authorization
surface, and not exactly-once delivery: the host's reconciliation
against provider receipts stays mandatory.

## Documentation

- [Isolated executors](https://docs.rulvar.com/guide/isolated-executor)
- [API reference](https://docs.rulvar.com/api/%40rulvar/executor/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
