[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointPhase

# Type Alias: KillPointPhase

```ts
type KillPointPhase = "before" | "after";
```

Defined in: [packages/store-conformance/src/kill-points.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L79)

`before` = the write is lost; `after` = everything past it is lost.
