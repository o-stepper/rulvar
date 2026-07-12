[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionBy

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

Defined in: [packages/core/src/l0/entries.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L58)

The journaled by-source of a resolution (docs/03, section 8.6 mapping table).
