[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / claimExpired

# Function: claimExpired()

```ts
function claimExpired(claim, at): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

True when the claim steers nothing at `at` (the read-path filter).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claim` | `Pick`\&lt;[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md), `"expiresAt"`\&gt; |
| `at` | `string` |

## Returns

`boolean`
