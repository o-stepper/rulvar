[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runSweepMatrix

# Function: runSweepMatrix()

```ts
function runSweepMatrix(pool, options): Promise<SweepReport>;
```

Defined in: [packages/evals/src/sweeps.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L118)

Runs the fixed matrix sequentially in declaration order
(deterministic cassette consumption), aggregates per (model,
taskClass) cell, emits threshold-crossing claims, and commits them
through the eval-committer identity when a store is given.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pool` | [`SweepPool`](/api/@rulvar/evals/interfaces/SweepPool.md) |
| `options` | [`RunSweepOptions`](/api/@rulvar/evals/interfaces/RunSweepOptions.md) |

## Returns

`Promise`\&lt;[`SweepReport`](/api/@rulvar/evals/interfaces/SweepReport.md)\&gt;
