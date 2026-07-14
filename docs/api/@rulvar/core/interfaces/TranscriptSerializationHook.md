[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TranscriptSerializationHook

# Interface: TranscriptSerializationHook

Defined in: [packages/core/src/l0/serialization.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L35)

## Methods

### fromStored()

```ts
fromStored(ref, blob): Bytes;
```

Defined in: [packages/core/src/l0/serialization.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L39)

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

Defined in: [packages/core/src/l0/serialization.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L37)

Applied at put.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)
