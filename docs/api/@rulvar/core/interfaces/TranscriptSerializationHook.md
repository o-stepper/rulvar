[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TranscriptSerializationHook

# Interface: TranscriptSerializationHook

Defined in: [packages/core/src/l0/serialization.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L48)

## Methods

### fromStored()

```ts
fromStored(ref, blob): Bytes;
```

Defined in: [packages/core/src/l0/serialization.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L52)

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

Defined in: [packages/core/src/l0/serialization.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L50)

Applied at put.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)
