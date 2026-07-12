[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationDeniedWriter

# Type Alias: TerminationDeniedWriter

```ts
type TerminationDeniedWriter = (denied) => Promise<EntryRef>;
```

Defined in: [packages/core/src/journal/termination.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L237)

Injected appender for termination.denied entries (engine-owned I/O).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `denied` | [`TerminationDeniedValue`](/api/@rulvar/core/interfaces/TerminationDeniedValue.md) |

## Returns

`Promise`\&lt;[`EntryRef`](/api/@rulvar/core/type-aliases/EntryRef.md)\&gt;
