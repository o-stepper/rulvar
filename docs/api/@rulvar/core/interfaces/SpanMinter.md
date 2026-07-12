[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpanMinter

# Interface: SpanMinter

Defined in: [packages/core/src/engine/ctx.ts:504](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L504)

Mints span ids in the run > phase > agent > tool > child hierarchy.

## Methods

### mint()

```ts
mint(parentSpanId?): string;
```

Defined in: [packages/core/src/engine/ctx.ts:505](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L505)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentSpanId?` | `string` |

#### Returns

`string`
