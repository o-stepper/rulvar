[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / claimOpIssues

# Function: claimOpIssues()

```ts
function claimOpIssues(op, index): string[];
```

Defined in: [packages/core/src/knowledge/claims.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L184)

Issues of one op (empty = valid). GATE-DRIVEN (M11-T01): the gate on
the op decides which claim rules apply, so the identity is enforced
by shape alone. Referential integrity stays with apply.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `op` | [`ClaimOp`](/api/@rulvar/core/type-aliases/ClaimOp.md) |
| `index` | `number` |

## Returns

`string`[]
