[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / flipStaleOnCanaryDrift

# Function: flipStaleOnCanaryDrift()

```ts
function flipStaleOnCanaryDrift(
   store, 
   model, 
   freshFingerprint, 
options?): Promise<CanaryDriftReport>;
```

Defined in: [packages/evals/src/canary.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L145)

Flips the model's ACTIVE eval-measured claims to stale when their
recorded canary fingerprint differs from the fresh one. Claims
without a recorded fingerprint have no baseline and
stay untouched (the documented no-probe posture); a second run is
an idempotent noop. CAS-rebased like every maintenance commit; the
retries run no engine work and pay nothing.

Only pass fingerprints from an allOk probe set (runCanary): a
fingerprint containing a `!status` probe differs from any healthy
baseline by construction, and flipping on it would blame the model
for a budget ceiling or a transient provider failure.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md) |
| `model` | `` `${string}:${string}` `` |
| `freshFingerprint` | `string` |
| `options?` | \{ `attempts?`: `number`; \} |
| `options.attempts?` | `number` |

## Returns

`Promise`\&lt;[`CanaryDriftReport`](/api/@rulvar/evals/interfaces/CanaryDriftReport.md)\&gt;
