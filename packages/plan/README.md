# @rulvar/plan

The adaptive orchestration extension for dynamic Rulvar runs:
`PlanRunner` treats the task plan as typed, engine-owned data with
journaled revisions, reuse, escalations, and model ladders. Built
entirely on the public core API. Exports `planRunner`,
`orchestratePlanned`, and `buildPlanTools`.

The one-line mnemonic against its sibling: `@rulvar/planner` plans
before the run (it writes the script); `@rulvar/plan` replans during the
run (it revises the task plan).

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/plan
```

## Documentation

- [Adaptive orchestration](https://docs.rulvar.com/guide/adaptive-orchestration)
- [Orchestration modes](https://docs.rulvar.com/guide/orchestration-modes)
- [API reference](https://docs.rulvar.com/api/%40rulvar/plan/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
