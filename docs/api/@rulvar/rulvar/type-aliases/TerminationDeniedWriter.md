[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TerminationDeniedWriter

# Type Alias: TerminationDeniedWriter

```ts
type TerminationDeniedWriter = (denied) => Promise<EntryRef>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Injected appender for termination.denied entries (engine-owned I/O).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `denied` | [`TerminationDeniedValue`](/api/@rulvar/rulvar/interfaces/TerminationDeniedValue.md) |

## Returns

`Promise`\&lt;[`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md)\&gt;
