[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SecretMasker

# Interface: SecretMasker

Defined in: `packages/core/dist/index.d.ts`

A compiled masking policy: text and deep-JSON forms of one pattern set.

## Methods

### maskDeep()

```ts
maskDeep<T>(value): T;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `T` |

#### Returns

`T`

***

### maskText()

```ts
maskText(text): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`string`
