[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / PreflightDeclaration

# Type Alias: PreflightDeclaration

```ts
type PreflightDeclaration = Pick<PreflightInput, "spawns" | "orchestrator" | "quotaRules">;
```

Defined in: [packages/cli/src/config.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L37)

The preflight declaration a config or workflow module may export
(the experiment-review P2.2): the declared spawn wave, the
orchestrator spec, and the quota rule set behind the configured
limiter, exactly the PreflightInput slices the estimator cannot
derive from engineOptions alone. `rulvar preflight` merges the
workflow module's declaration over the config file's, and --spawns
overrides the spawn wave from the command line.
