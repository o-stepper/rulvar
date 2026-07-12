[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / claimIssues

# Function: claimIssues()

```ts
function claimIssues(
   claim, 
   path, 
   options?): string[];
```

Defined in: [packages/core/src/knowledge/claims.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L95)

Issues of one claim record (empty = valid).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claim` | [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md) |
| `path` | `string` |
| `options?` | [`ClaimValidationOptions`](/api/@rulvar/core/interfaces/ClaimValidationOptions.md) |

## Returns

`string`[]
