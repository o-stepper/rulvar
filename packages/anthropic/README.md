# @rulvar/anthropic

First-class Anthropic provider adapter over the official
`@anthropic-ai/sdk`: thinking-block replay with signatures, cache hint
compilation, `pause_turn` continuation, typed refusal outcomes, and
usage normalization. Exports the `anthropic` adapter factory; models are
addressed as `'anthropic:<model>'` in routing.

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/anthropic
```

The umbrella package `@rulvar/rulvar` already bundles this adapter.

## Documentation

- [Providers](https://docs.rulvar.com/guide/providers)
- [Model routing](https://docs.rulvar.com/guide/model-routing)
- [API reference](https://docs.rulvar.com/api/%40rulvar/anthropic/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
