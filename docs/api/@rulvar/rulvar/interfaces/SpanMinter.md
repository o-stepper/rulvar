[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpanMinter

# Interface: SpanMinter

Defined in: `packages/core/dist/index.d.ts`

Mints span ids in the run > phase > agent > tool > child hierarchy.

## Methods

### mint()

```ts
mint(parentSpanId?): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentSpanId?` | `string` |

#### Returns

`string`
