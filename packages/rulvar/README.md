# @rulvar/rulvar

The batteries-included Rulvar install: re-exports the entire
`@rulvar/core` surface plus both first-class adapters (`anthropic`,
`openai`), two terminal progress renderers, and `recommendedDefaults`,
the only place the project names strong default models for the
orchestrate and plan roles. Also installable through the unscoped alias
package `rulvar`, which re-exports this one.

The renderers are `progress()`, the live view (one row per agent with a
status glyph, a running timer, token counts, and USD, per-role
sub-timings when one call spans several invocation phases, the run
header with spend against the ceiling, and a final per-role cost
summary; repaints in place on a TTY and degrades to append-only lines in
pipes and CI), and `renderProgress()`, the minimal one line per
lifecycle fact. Both consume the public `WorkflowEvent` stream and
nothing else.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
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
