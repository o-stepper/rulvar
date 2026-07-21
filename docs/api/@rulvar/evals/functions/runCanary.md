[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runCanary

# Function: runCanary()

```ts
function runCanary(
   engine, 
   probes, 
options?): Promise<CanaryReport>;
```

Defined in: [packages/evals/src/canary.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L89)

Runs the fixed probe set through the ordinary engine. Probes run
sequentially in declaration order, one run per probe, so recordings
replay deterministically. Each probe run carries the optional
immutable ceiling (options.budgetUsd) and authorizes it against the
optional envelope before starting; an envelope refusal records the
probe as 'refused' and keeps walking instead of throwing away the
completed probes. A non-ok or refused probe enters the fingerprint
as `!status` and clears allOk: callers gate drift flipping on allOk,
because a budget-starved or transiently failing probe fingerprints
differently without the model having drifted.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `probes` | [`CanaryProbeSet`](/api/@rulvar/evals/interfaces/CanaryProbeSet.md) |
| `options` | [`CanaryRunOptions`](/api/@rulvar/evals/interfaces/CanaryRunOptions.md) |

## Returns

`Promise`\&lt;[`CanaryReport`](/api/@rulvar/evals/interfaces/CanaryReport.md)\&gt;
