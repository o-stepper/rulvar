[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / SpanLike

# Interface: SpanLike

Defined in: [packages/cli/src/otel.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L20)

The tiny subset of the OTel Tracer/Span API the exporter uses.

## Methods

### addEvent()

```ts
addEvent(name, attributes?): void;
```

Defined in: [packages/cli/src/otel.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L22)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `attributes?` | `Record`\&lt;`string`, `string` \| `number` \| `boolean`\&gt; |

#### Returns

`void`

***

### end()

```ts
end(endTime?): void;
```

Defined in: [packages/cli/src/otel.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L24)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `endTime?` | `number` |

#### Returns

`void`

***

### setAttribute()

```ts
setAttribute(key, value): void;
```

Defined in: [packages/cli/src/otel.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L21)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `value` | `string` \| `number` \| `boolean` |

#### Returns

`void`

***

### setStatus()

```ts
setStatus(status): void;
```

Defined in: [packages/cli/src/otel.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L23)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `status` | \{ `code`: `number`; `message?`: `string`; \} |
| `status.code` | `number` |
| `status.message?` | `string` |

#### Returns

`void`
