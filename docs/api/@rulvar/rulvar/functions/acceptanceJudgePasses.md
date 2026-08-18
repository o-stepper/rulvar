[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / acceptanceJudgePasses

# Function: acceptanceJudgePasses()

```ts
function acceptanceJudgePasses(stage?, onFound?): number;
```

Defined in: `packages/core/dist/index.d.ts`

Worst-case claim judge dispatches of a declared posture
(RV3402/RV4001): `'both'` dispatches the judge at the draft AND the
final, and an armed repair round (`onFound: 'repair'`, which intake
refuses at stage 'draft') rejudges the repaired composition once
more. Absent declarations read as the historical one pass.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stage?` | `"draft"` \| `"final"` \| `"both"` |
| `onFound?` | `"report"` \| `"carry"` \| `"fail"` \| `"repair"` |

## Returns

`number`
