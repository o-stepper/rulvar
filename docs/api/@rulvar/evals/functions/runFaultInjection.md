[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runFaultInjection

# Function: runFaultInjection()

```ts
function runFaultInjection(options?): Promise<FaultInjectionReport>;
```

Defined in: [packages/evals/src/fault-injection.ts:3384](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L3384)

Runs the fault-injection scenarios sequentially and reports each
driven branch's observation; with `artifactsDir`, writes one
`<scenario>.json` bundle per scenario (the observation plus every
artifact), the experiment-grade trace a review can cite.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`RunFaultInjectionOptions`](/api/@rulvar/evals/interfaces/RunFaultInjectionOptions.md) |

## Returns

`Promise`\&lt;[`FaultInjectionReport`](/api/@rulvar/evals/interfaces/FaultInjectionReport.md)\&gt;
