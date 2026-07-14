# @rulvar/core

The Rulvar engine in one dependency-light package: the L0 contracts and
SPI interfaces, the journal kernel behind the never-pay-twice invariant,
the model router with the capability and price registry, the agent
runtime, the tool system and MCP bus, the `ctx` primitives and run
engine, the dynamic orchestrator, the in-memory and JSONL reference
stores, and the typed event stream. Zero provider SDK dependencies:
adapters plug in from their own packages. Key exports: `createEngine`,
`defineWorkflow`, `tool`, `mcp`, `orchestrate`, `InMemoryStore`,
`JsonlFileStore`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core
```

Most applications start with the umbrella instead: `pnpm add
@rulvar/rulvar` bundles this engine with both first-class adapters and
the recommended model defaults. The a la carte path pairs the core with
exactly the pieces you need, for example
`pnpm add @rulvar/core @rulvar/anthropic @rulvar/store-sqlite`.

## Documentation

- [Quickstart](https://docs.rulvar.com/guide/quickstart)
- [Architecture](https://docs.rulvar.com/guide/architecture)
- [Workflows](https://docs.rulvar.com/guide/workflows) and
  [The journal](https://docs.rulvar.com/guide/journal)
- [API reference](https://docs.rulvar.com/api/%40rulvar/core/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
