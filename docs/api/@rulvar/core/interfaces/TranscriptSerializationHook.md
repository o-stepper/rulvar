[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TranscriptSerializationHook

# Interface: TranscriptSerializationHook

Defined in: [packages/core/src/l0/serialization.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L36)

## Methods

### fromStored()

```ts
fromStored(ref, blob): Bytes;
```

Defined in: [packages/core/src/l0/serialization.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L40)

Applied at get; MUST be symmetric with toStored.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)

***

### toStored()

```ts
toStored(ref, blob): Bytes;
```

Defined in: [packages/core/src/l0/serialization.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L38)

Applied at put.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)
