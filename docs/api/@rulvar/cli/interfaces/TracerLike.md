[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / TracerLike

# Interface: TracerLike

Defined in: [packages/cli/src/otel.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L27)

## Methods

### startSpan()

```ts
startSpan(
   name, 
   options?, 
   context?): SpanLike;
```

Defined in: [packages/cli/src/otel.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L28)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `options?` | \{ `attributes?`: `Record`\&lt;`string`, `string` \| `number` \| `boolean`\&gt;; `startTime?`: `number`; \} |
| `options.attributes?` | `Record`\&lt;`string`, `string` \| `number` \| `boolean`\&gt; |
| `options.startTime?` | `number` |
| `context?` | `unknown` |

#### Returns

[`SpanLike`](/api/@rulvar/cli/interfaces/SpanLike.md)
