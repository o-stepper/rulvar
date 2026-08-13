[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / claimJudgeStageOf

# Function: claimJudgeStageOf()

```ts
function claimJudgeStageOf(label): "draft" | "final" | undefined;
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:399](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L399)

Which pass a claim-consistency judge label names (RV3404): the exact
[CLAIM\_JUDGE\_LABEL](/api/@rulvar/core/variables/CLAIM_JUDGE_LABEL.md) is the draft pass, and every suffixed
variant is a post draft pass over the composed document (today the
final pass and the repair round's re-judge, both dispatching under
`-final`, RV2509/RV3307). `undefined` for every other label. One
classifier for both reducers, the RV3302 doctrine extended from the
judge predicate to the stage: the split must never read differently
off the live stream and off the journal of one run.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` \| `undefined` |

## Returns

`"draft"` \| `"final"` \| `undefined`
