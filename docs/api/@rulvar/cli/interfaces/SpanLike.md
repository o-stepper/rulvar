[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / SpanLike

# Interface: SpanLike

Defined in: [packages/cli/src/otel.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L31)

The tiny subset of the OTel Tracer/Span API the exporter uses.

## Methods

### addEvent()

```ts
addEvent(name, attributes?): void;
```

Defined in: [packages/cli/src/otel.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L33)

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

Defined in: [packages/cli/src/otel.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L35)

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

Defined in: [packages/cli/src/otel.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L32)

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

Defined in: [packages/cli/src/otel.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L34)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `status` | \{ `code`: `number`; `message?`: `string`; \} |
| `status.code` | `number` |
| `status.message?` | `string` |

#### Returns

`void`
