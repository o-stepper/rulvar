[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / judgePrompt

# Function: judgePrompt()

```ts
function judgePrompt(input): string;
```

Defined in: [packages/plan/src/ladder.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L185)

The judge prompt: artifact-grounded, assembled from journaled values
only (the attempt's output summary and artifact index), so a replayed
judge dispatch hashes identically.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `artifactIds`: readonly `string`[]; `outputSummary`: `string`; `taskPrompt`: `string`; \} |
| `input.artifactIds` | readonly `string`[] |
| `input.outputSummary` | `string` |
| `input.taskPrompt` | `string` |

## Returns

`string`
