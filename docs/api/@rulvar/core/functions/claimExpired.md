[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / claimExpired

# Function: claimExpired()

```ts
function claimExpired(claim, at): boolean;
```

Defined in: [packages/core/src/knowledge/decay.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L41)

True when the claim steers nothing at `at` (docs/05, read-path filters).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claim` | `Pick`\&lt;[`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md), `"expiresAt"`\&gt; |
| `at` | `string` |

## Returns

`boolean`
