# @rulvar/evals

The Rulvar eval framework: eval cases with golden outputs, rubric and
judge graders that run through the engine itself, matrix sweeps across
models and configurations, and the canary fingerprint. Exports
`runEvalSuite`, `runEvalMatrix`, `goldenGrader`, `rubricGrader`,
`judgeGrader`, and `canaryFingerprint`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add -D @rulvar/evals
```

## Documentation

- [Evals](https://docs.rulvar.com/guide/evals)
- [API reference](https://docs.rulvar.com/api/%40rulvar/evals/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
