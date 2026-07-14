[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / applyClaimOps

# Function: applyClaimOps()

```ts
function applyClaimOps(claims, ops): ModelClaim[];
```

Defined in: `packages/core/dist/index.d.ts`

Applies one op batch to a claims array, mechanically (M10-T01). The
editorial validators (attestation, caps, statement bounds) layer on
top in M10-T02; referential integrity is enforced here because a
dangling supersede or archive would corrupt the append-only chain.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `ops` | readonly [`ClaimOp`](/api/@rulvar/rulvar/type-aliases/ClaimOp.md)[] |

## Returns

[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[]
