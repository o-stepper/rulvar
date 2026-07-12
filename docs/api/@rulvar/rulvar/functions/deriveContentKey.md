[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / deriveContentKey

# Function: deriveContentKey()

```ts
function deriveContentKey(input): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

key = sha256(JCS(IdentityInput)) (docs/03, section "Content key").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`IdentityInput`](/api/@rulvar/rulvar/type-aliases/IdentityInput.md) |

## Returns

`string`
