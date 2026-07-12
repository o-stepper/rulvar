# @rulvar/rulvar

The batteries-included rulvar install: re-exports the entire
`@rulvar/core` surface plus both first-class adapters (`anthropic`,
`openai`), the terminal progress renderer, and `recommendedDefaults`,
the only place the project names strong default models for the
orchestrate and plan roles. Also installable through the unscoped alias
package `rulvar`, which re-exports this one.

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/rulvar
```

A minimal engine is one import:

```ts
import { createEngine, anthropic, openai, recommendedDefaults } from '@rulvar/rulvar';

const engine = createEngine({
  adapters: [anthropic(), openai()],
  defaults: {
    routing: recommendedDefaults.routing,
    roleFloors: recommendedDefaults.floors,
  },
});
```

## Documentation

- [Quickstart](https://docs.rulvar.com/guide/quickstart)
- [Installation](https://docs.rulvar.com/guide/installation)
- [API reference](https://docs.rulvar.com/api/%40rulvar/rulvar/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
