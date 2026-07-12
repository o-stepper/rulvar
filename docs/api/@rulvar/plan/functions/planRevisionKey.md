[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / planRevisionKey

# Function: planRevisionKey()

```ts
function planRevisionKey(base, requestedOps): string;
```

Defined in: [packages/plan/src/plan-entries.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L218)

Content keys (docs/07, 3.3): plan.revision keys over {kind, base,
requestedOps}; plan.decision over {kind, origin, ops, causeRef}.
Cosmetics (rationale) never enter a key; ordinal within scope "plan"
distinguishes repeats, so forward-matching works without kernel
changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `base` | [`PlanSnapshotRef`](/api/@rulvar/plan/interfaces/PlanSnapshotRef.md) |
| `requestedOps` | readonly [`PlanOp`](/api/@rulvar/plan/type-aliases/PlanOp.md)[] |

## Returns

`string`
