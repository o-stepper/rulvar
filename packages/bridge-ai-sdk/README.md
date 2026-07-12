# @rulvar/bridge-ai-sdk

Bridge adapter that wraps any Vercel AI SDK language model as a rulvar
provider adapter, covering the long tail of providers; it performs a
specification-version check at runtime and is, by design, the
highest-churn package in the project. Exports `bridgeAiSdk`.

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/bridge-ai-sdk
```

Add the AI SDK provider package you are bridging alongside it.

## Documentation

- [Providers](https://docs.rulvar.com/guide/providers)
- [Adapter authors](https://docs.rulvar.com/guide/adapter-authors)
- [API reference](https://docs.rulvar.com/api/%40rulvar/bridge-ai-sdk/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
