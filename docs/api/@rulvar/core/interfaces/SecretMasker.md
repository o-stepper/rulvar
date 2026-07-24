[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SecretMasker

# Interface: SecretMasker

Defined in: [packages/core/src/l0/serialization.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L213)

A compiled masking policy: text and deep-JSON forms of one pattern set.

## Methods

### maskDeep()

```ts
maskDeep<T>(value): T;
```

Defined in: [packages/core/src/l0/serialization.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L215)

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

Defined in: [packages/core/src/l0/serialization.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L214)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`string`
