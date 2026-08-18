[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpanMinter

# Interface: SpanMinter

Defined in: [packages/core/src/engine/ctx.ts:760](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L760)

Mints span ids in the run > phase > agent > tool > child hierarchy.

## Methods

### mint()

```ts
mint(parentSpanId?): string;
```

Defined in: [packages/core/src/engine/ctx.ts:761](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L761)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentSpanId?` | `string` |

#### Returns

`string`
