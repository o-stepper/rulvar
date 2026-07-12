[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelSpec

# Type Alias: ModelSpec

```ts
type ModelSpec = 
  | ModelRef
  | ModelChoice
  | {
  ladder: LadderSpec;
};
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

What authors write wherever a model is configurable: a call override, an
agent profile, a workflow default, or an engine default (docs/04, section
"Router and resolution chain").
