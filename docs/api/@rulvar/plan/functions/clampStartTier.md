[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / clampStartTier

# Function: clampStartTier()

```ts
function clampStartTier(ladder, hint?): number;
```

Defined in: [packages/plan/src/ladder.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L64)

Clamps the orchestrator's `model_hint.startTier` to the declared ladder
(docs/07, section 4.2): the hint is the ONLY model influence the
orchestrator has, and it never names a model.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ladder` | [`CanonicalLadderSpec`](/api/@rulvar/rulvar/interfaces/CanonicalLadderSpec.md) |
| `hint?` | `number` |

## Returns

`number`
