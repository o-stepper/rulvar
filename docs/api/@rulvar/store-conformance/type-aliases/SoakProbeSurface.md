[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / SoakProbeSurface

# Type Alias: SoakProbeSurface

```ts
type SoakProbeSurface = 
  | "append"
  | "meta"
  | "blob-put"
  | "blob-delete"
  | "run-delete"
  | "renew"
  | "cross-run"
  | "release";
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L55)

Surfaces of the stale-probe sweep; every one must reject typed.
