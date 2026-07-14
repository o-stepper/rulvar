[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TranscriptSerializationHook

# Interface: TranscriptSerializationHook

Defined in: `packages/core/dist/index.d.ts`

## Methods

### fromStored()

```ts
fromStored(ref, blob): Bytes;
```

Defined in: `packages/core/dist/index.d.ts`

Applied at get; MUST be symmetric with toStored.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |

#### Returns

[`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md)

***

### toStored()

```ts
toStored(ref, blob): Bytes;
```

Defined in: `packages/core/dist/index.d.ts`

Applied at put.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |

#### Returns

[`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md)
