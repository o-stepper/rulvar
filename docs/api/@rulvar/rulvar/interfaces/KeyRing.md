[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / KeyRing

# Interface: KeyRing

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Methods

### keyFor()

```ts
keyFor(identity, hashVersion): DerivedKey;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `identity` | [`IdentityInput`](/api/@rulvar/rulvar/type-aliases/IdentityInput.md) |
| `hashVersion` | `number` |

#### Returns

[`DerivedKey`](/api/@rulvar/rulvar/type-aliases/DerivedKey.md)
