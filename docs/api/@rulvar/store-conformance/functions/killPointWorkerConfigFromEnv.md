[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / killPointWorkerConfigFromEnv

# Function: killPointWorkerConfigFromEnv()

```ts
function killPointWorkerConfigFromEnv(env?): KillPointWorkerConfig;
```

Defined in: [packages/store-conformance/src/kill-points.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L320)

Reads the worker contract a referee serialized into the child env.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `env` | `Record`\&lt;`string`, `string` \| `undefined`\&gt; | `process.env` |

## Returns

[`KillPointWorkerConfig`](/api/@rulvar/store-conformance/interfaces/KillPointWorkerConfig.md)
