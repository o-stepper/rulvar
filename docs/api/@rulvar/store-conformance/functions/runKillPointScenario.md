[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / runKillPointScenario

# Function: runKillPointScenario()

```ts
function runKillPointScenario(options): Promise<KillPointObservation>;
```

Defined in: [packages/store-conformance/src/kill-points.ts:646](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L646)

Spawns the worker, asserts it died AT the configured write by
SIGKILL, waits out the dead owner's lease, resumes the run over the
referee's own store instance, and asserts the scenario's pinned
recovery semantics. Throws one Error naming every violation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`KillPointScenarioOptions`](/api/@rulvar/store-conformance/interfaces/KillPointScenarioOptions.md) |

## Returns

`Promise`\&lt;[`KillPointObservation`](/api/@rulvar/store-conformance/interfaces/KillPointObservation.md)\&gt;
