[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / claimExpired

# Function: claimExpired()

```ts
function claimExpired(claim, at): boolean;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

True when the claim steers nothing at `at` (docs/05, read-path filters).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claim` | `Pick`\&lt;[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md), `"expiresAt"`\&gt; |
| `at` | `string` |

## Returns

`boolean`
