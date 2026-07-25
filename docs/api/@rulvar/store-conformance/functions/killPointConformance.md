[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / killPointConformance

# Function: killPointConformance()

```ts
function killPointConformance(options): ConformanceSuite;
```

Defined in: [packages/store-conformance/src/kill-points.ts:873](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L873)

The whole [KILL\_POINT\_SCENARIOS](/api/@rulvar/store-conformance/variables/KILL_POINT_SCENARIOS.md) table as a conformance suite:
one check per scenario, each over the fresh isolation `prepare`
returns. Register it with a test API whose `it` allows at least
thirty seconds per case (spawn, run, die, lease lapse, resume).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`KillPointConformanceOptions`](/api/@rulvar/store-conformance/interfaces/KillPointConformanceOptions.md) |

## Returns

[`ConformanceSuite`](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md)
