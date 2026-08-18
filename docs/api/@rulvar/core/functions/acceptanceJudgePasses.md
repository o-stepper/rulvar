[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / acceptanceJudgePasses

# Function: acceptanceJudgePasses()

```ts
function acceptanceJudgePasses(stage?, onFound?): number;
```

Defined in: [packages/core/src/orchestrator/admission.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L300)

Worst-case claim judge dispatches of a declared posture
(RV3402/RV4001): `'both'` dispatches the judge at the draft AND the
final, and an armed repair round (`onFound: 'repair'`, which intake
refuses at stage 'draft') rejudges the repaired composition once
more. Absent declarations read as the historical one pass.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stage?` | `"draft"` \| `"final"` \| `"both"` |
| `onFound?` | `"repair"` \| `"report"` \| `"carry"` \| `"fail"` |

## Returns

`number`
