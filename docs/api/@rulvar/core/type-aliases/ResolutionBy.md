[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionBy

# Type Alias: ResolutionBy

```ts
type ResolutionBy = 
  | "external"
  | "timeout"
  | "class_decision"
  | "operator"
  | "quiescence"
  | "engine_fallback";
```

Defined in: [packages/core/src/l0/entries.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L56)

The journaled by-source of a resolution.
