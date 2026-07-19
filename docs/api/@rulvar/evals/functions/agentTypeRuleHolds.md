[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / agentTypeRuleHolds

# Function: agentTypeRuleHolds()

```ts
function agentTypeRuleHolds(baseline, informed): boolean;
```

Defined in: [packages/evals/src/checkpoint.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L138)

The OQ-09 criterion 2 rule (as amended 2026-07-12): match-or-beat at
105 percent of baseline cost, OR at least 15 points better at 115
percent (the quality branch: the baseline fails cheaply, so the flat
bar tightened exactly when the card won on quality). The vacuous-pass
guard stays with the caller.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `baseline` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) |
| `informed` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) |

## Returns

`boolean`
