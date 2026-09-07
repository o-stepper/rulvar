[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / SpanLike

# Interface: SpanLike

Defined in: [packages/cli/src/otel.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L42)

The tiny subset of the OTel Tracer/Span API the exporter uses.

## Methods

### addEvent()

```ts
addEvent(name, attributes?): void;
```

Defined in: [packages/cli/src/otel.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L44)

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

Defined in: [packages/cli/src/otel.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L46)

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

Defined in: [packages/cli/src/otel.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L43)

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

Defined in: [packages/cli/src/otel.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L45)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `status` | \{ `code`: `number`; `message?`: `string`; \} |
| `status.code` | `number` |
| `status.message?` | `string` |

#### Returns

`void`
