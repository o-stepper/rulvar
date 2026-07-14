# Rulvar (pointer package)

Rulvar is an embeddable TypeScript engine for multi-agent LLM workflows:
durable (a completed LLM call is never paid for twice), budget-bounded
(immutable per-run dollar ceilings), vendor-neutral (Anthropic, OpenAI,
OpenAI-compatible endpoints, and a Vercel AI SDK bridge), observable, and
testable, with no server, no database, and no control plane required.

The canonical package is
[`@rulvar/rulvar`](https://www.npmjs.com/package/@rulvar/rulvar); this
unscoped name is an alias that re-exports it one to one and tracks its
releases, so `npm install rulvar` works and the bare name stays reserved
for the project. New projects should depend on the scoped package
directly:

```bash
pnpm add @rulvar/rulvar
```

Start with the ten-minute
[quickstart](https://docs.rulvar.com/guide/quickstart); the full
documentation lives at [docs.rulvar.com](https://docs.rulvar.com).

Project home: [rulvar.com](https://rulvar.com) and
[github.com/o-stepper/rulvar](https://github.com/o-stepper/rulvar).
