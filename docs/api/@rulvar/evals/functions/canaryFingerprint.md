[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / canaryFingerprint

# Function: canaryFingerprint()

```ts
function canaryFingerprint(engine, probes): Promise<string>;
```

Defined in: [packages/evals/src/canary.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L44)

Runs the fixed probe set through the ordinary engine and returns the
fingerprint. Probes run sequentially in declaration order, one run
per probe, so recordings replay deterministically.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `probes` | [`CanaryProbeSet`](/api/@rulvar/evals/interfaces/CanaryProbeSet.md) |

## Returns

`Promise`\&lt;`string`\&gt;
