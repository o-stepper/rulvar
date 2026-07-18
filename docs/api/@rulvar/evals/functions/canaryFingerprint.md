[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / canaryFingerprint

# Function: canaryFingerprint()

```ts
function canaryFingerprint(
   engine, 
   probes, 
options?): Promise<string>;
```

Defined in: [packages/evals/src/canary.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L134)

The fingerprint alone (the pre-v1.16.2-review surface, kept
compatible). Prefer runCanary: its allOk is the drift-flip gate.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `probes` | [`CanaryProbeSet`](/api/@rulvar/evals/interfaces/CanaryProbeSet.md) |
| `options` | [`CanaryRunOptions`](/api/@rulvar/evals/interfaces/CanaryRunOptions.md) |

## Returns

`Promise`\&lt;`string`\&gt;
