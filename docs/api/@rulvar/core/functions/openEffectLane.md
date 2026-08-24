[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / openEffectLane

# Function: openEffectLane()

```ts
function openEffectLane(options): Promise<EffectLaneWriter>;
```

Defined in: [packages/core/src/effects/writer.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L107)

Opens the effect lane on one run's journal: acquires the lane lease
in production mode and validates the store capabilities. The lane
operates on SETTLED runs (the admission predicate requires
`settled: true`), so it never contends with a live engine segment,
only with other lane holders, which is exactly what the lease and
the A5 contention rule arbitrate.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EffectLaneWriterOptions`](/api/@rulvar/core/interfaces/EffectLaneWriterOptions.md) |

## Returns

`Promise`\&lt;[`EffectLaneWriter`](/api/@rulvar/core/classes/EffectLaneWriter.md)\&gt;
