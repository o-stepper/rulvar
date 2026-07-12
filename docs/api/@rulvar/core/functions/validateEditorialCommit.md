[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateEditorialCommit

# Function: validateEditorialCommit()

```ts
function validateEditorialCommit(
   ops, 
   claimsAfter, 
   options?): void;
```

Defined in: [packages/core/src/knowledge/claims.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L240)

The commit-batch validation: op shapes and gates first (GATE-DRIVEN
since M11-T01: the human gate carries editorial claims, the
eval-committer gate carries eval-measured claims with metrics), the
post-apply cap second. Throws one ConfigError carrying every issue,
so a maintenance caller fixes the batch in one round trip.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ops` | readonly [`ClaimOp`](/api/@rulvar/core/type-aliases/ClaimOp.md)[] |
| `claimsAfter` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `options?` | [`ClaimValidationOptions`](/api/@rulvar/core/interfaces/ClaimValidationOptions.md) & \{ `cap?`: `number`; \} |

## Returns

`void`
