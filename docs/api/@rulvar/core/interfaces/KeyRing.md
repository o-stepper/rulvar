[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / KeyRing

# Interface: KeyRing

Defined in: [packages/core/src/journal/matching.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L37)

## Methods

### keyFor()

```ts
keyFor(identity, hashVersion): DerivedKey;
```

Defined in: [packages/core/src/journal/matching.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L38)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `identity` | [`IdentityInput`](/api/@rulvar/core/type-aliases/IdentityInput.md) |
| `hashVersion` | `number` |

#### Returns

[`DerivedKey`](/api/@rulvar/core/type-aliases/DerivedKey.md)
