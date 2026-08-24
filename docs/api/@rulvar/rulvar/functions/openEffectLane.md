[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / openEffectLane

# Function: openEffectLane()

```ts
function openEffectLane(options): Promise<EffectLaneWriter>;
```

Defined in: `packages/core/dist/index.d.ts`

Opens the effect lane on one run's journal: acquires the lane lease
in production mode and validates the store capabilities. The lane
operates on SETTLED runs (the admission predicate requires
`settled: true`), so it never contends with a live engine segment,
only with other lane holders, which is exactly what the lease and
the A5 contention rule arbitrate.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EffectLaneWriterOptions`](/api/@rulvar/rulvar/interfaces/EffectLaneWriterOptions.md) |

## Returns

`Promise`\&lt;[`EffectLaneWriter`](/api/@rulvar/rulvar/classes/EffectLaneWriter.md)\&gt;
