[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolutionBy

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The journaled by-source of a resolution (docs/03, section 8.6 mapping table).
