[**Rulvar API reference**](../index.md)

***

[Rulvar API reference](/api/index.md) / eslint-plugin-rulvar

# eslint-plugin-rulvar

Determinism lint rules for Rulvar workflow modules: ban bare `Date.now`,
`Math.random`, `new Date`, `fetch`, and `process.env`, and ban
`Promise.all` over `ctx` calls, so workflows stay replay-safe. Emits
structured JSON diagnostics (`toJsonDiagnostics`) that drive the
planner's self-repair loop, and ships a ready `workflowsConfig` for
ESLint flat config. Requires ESLint 9 or newer (peer dependency).

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add -D eslint-plugin-rulvar
```

## Documentation

- [Determinism](https://docs.rulvar.com/guide/determinism)
- [The planner](https://docs.rulvar.com/guide/planner)
- [API reference](https://docs.rulvar.com/api/eslint-plugin-rulvar/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Interfaces

| Interface | Description |
| ------ | ------ |
| [RulvarLintDiagnostic](/api/eslint-plugin-rulvar/interfaces/RulvarLintDiagnostic.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [default](/api/eslint-plugin-rulvar/variables/default.md) | - |
| [rules](/api/eslint-plugin-rulvar/variables/rules.md) | - |
| [workflowsConfig](/api/eslint-plugin-rulvar/variables/workflowsConfig.md) | The flat-config preset for workflow modules: the determinism bans as errors, the duplicate-identical-call advisory as a warning. |

## Functions

| Function | Description |
| ------ | ------ |
| [toJsonDiagnostics](/api/eslint-plugin-rulvar/functions/toJsonDiagnostics.md) | - |
