[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelSpec

# Type Alias: ModelSpec

```ts
type ModelSpec = 
  | ModelRef
  | ModelChoice
  | {
  ladder: LadderSpec;
};
```

Defined in: `packages/core/dist/index.d.ts`

What authors write wherever a model is configurable: a call override, an
agent profile, a workflow default, or an engine default.
