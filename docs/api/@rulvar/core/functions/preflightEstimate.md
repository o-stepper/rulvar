[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / preflightEstimate

# Function: preflightEstimate()

```ts
function preflightEstimate(input): PreflightReport;
```

Defined in: [packages/core/src/engine/preflight.ts:341](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L341)

Computes the preflight report: the effective merged limits per
declared spawn, the layer-1 admission projection over the declared
wave, the per-tool and weighted-unit bottleneck ordering, the
concurrency and quota exposure at the declared estimates, and the
linter findings. Pure: no engine is constructed, no store is opened,
no adapter stream is dispatched, and no journal entry is written.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`PreflightInput`](/api/@rulvar/core/interfaces/PreflightInput.md) |

## Returns

[`PreflightReport`](/api/@rulvar/core/interfaces/PreflightReport.md)
