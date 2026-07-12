[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / rungRuleHolds

# Function: rungRuleHolds()

```ts
function rungRuleHolds(baseline, treatment): boolean;
```

Defined in: [packages/evals/src/checkpoint.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L149)

The OQ-09 cell rule (shared by the per-cell and pooled verdicts).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `baseline` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) |
| `treatment` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) |

## Returns

`boolean`
