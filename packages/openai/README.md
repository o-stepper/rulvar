# @rulvar/openai

First-class adapter for the OpenAI Responses API (reasoning items,
strict `json_schema` outputs), plus `openaiCompatible`, the factory that
points the same adapter at any OpenAI-compatible endpoint (Ollama, vLLM,
gateways) with an explicit id and baseURL. Models are addressed as
`'openai:<model>'` in routing.

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/openai
```

The umbrella package `@rulvar/rulvar` already bundles this adapter.

## Documentation

- [Providers](https://docs.rulvar.com/guide/providers)
- [Model routing](https://docs.rulvar.com/guide/model-routing)
- [API reference](https://docs.rulvar.com/api/%40rulvar/openai/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
