[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / applyClaimOps

# Function: applyClaimOps()

```ts
function applyClaimOps(claims, ops): ModelClaim[];
```

Defined in: [packages/core/src/knowledge/file-store.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L36)

Applies one op batch to a claims array, mechanically (M10-T01). The
editorial validators (attestation, caps, statement bounds) layer on
top in M10-T02; referential integrity is enforced here because a
dangling supersede or archive would corrupt the append-only chain.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `ops` | readonly [`ClaimOp`](/api/@rulvar/core/type-aliases/ClaimOp.md)[] |

## Returns

[`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[]
