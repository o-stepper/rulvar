[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / StoreFactory

# Type Alias: StoreFactory\&lt;S\&gt;

```ts
type StoreFactory<S> = () => Promise<S> | S;
```

Defined in: [packages/store-conformance/src/types.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L27)

The factory contract: every call MUST return a fresh, isolated store
(checks run against independent instances; a JsonlFileStore factory
uses a fresh temp directory per call).

## Type Parameters

| Type Parameter |
| ------ |
| `S` |

## Returns

`Promise`\&lt;`S`\&gt; \| `S`
