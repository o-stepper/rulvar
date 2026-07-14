[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / deriveContentKey

# Function: deriveContentKey()

```ts
function deriveContentKey(input): string;
```

Defined in: [packages/core/src/journal/identity.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L131)

key = sha256(JCS(IdentityInput)).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`IdentityInput`](/api/@rulvar/core/type-aliases/IdentityInput.md) |

## Returns

`string`
