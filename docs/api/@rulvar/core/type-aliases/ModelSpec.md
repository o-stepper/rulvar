[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelSpec

# Type Alias: ModelSpec

```ts
type ModelSpec = 
  | ModelRef
  | ModelChoice
  | {
  ladder: LadderSpec;
};
```

Defined in: [packages/core/src/l0/messages.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L194)

What authors write wherever a model is configurable: a call override, an
agent profile, a workflow default, or an engine default.
