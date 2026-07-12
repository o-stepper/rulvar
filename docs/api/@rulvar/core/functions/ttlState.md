[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ttlState

# Function: ttlState()

```ts
function ttlState(claim, at): TtlState;
```

Defined in: [packages/core/src/knowledge/decay.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L50)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claim` | `Pick`\&lt;[`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md), `"expiresAt"`\&gt; |
| `at` | `string` |

## Returns

[`TtlState`](/api/@rulvar/core/type-aliases/TtlState.md)
