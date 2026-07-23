[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / soakWriterConfigFromEnv

# Function: soakWriterConfigFromEnv()

```ts
function soakWriterConfigFromEnv(env?): SoakWriterConfig;
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L213)

Reads the writer contract a referee serialized into the child env.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `env` | `Record`\&lt;`string`, `string` \| `undefined`\&gt; | `process.env` |

## Returns

[`SoakWriterConfig`](/api/@rulvar/store-conformance/interfaces/SoakWriterConfig.md)
