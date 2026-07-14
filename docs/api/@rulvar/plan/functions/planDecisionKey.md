[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / planDecisionKey

# Function: planDecisionKey()

```ts
function planDecisionKey(
   origin, 
   ops, 
   causeRef): string;
```

Defined in: [packages/plan/src/plan-entries.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L226)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `origin` | [`PlanDecisionOrigin`](/api/@rulvar/plan/type-aliases/PlanDecisionOrigin.md) |
| `ops` | readonly [`EnginePlanOp`](/api/@rulvar/plan/type-aliases/EnginePlanOp.md)[] |
| `causeRef` | `number` |

## Returns

`string`
