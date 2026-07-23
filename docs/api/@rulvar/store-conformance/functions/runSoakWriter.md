[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / runSoakWriter

# Function: runSoakWriter()

```ts
function runSoakWriter(
   fixture, 
   config, 
hooks?): Promise<void>;
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L297)

The writer protocol: run it in a spawned process against the
consumer-constructed store pair. Appends every observation to the
report file; protocol-level anomalies (a stale acceptance, an
unexpected error class) are logged as events for the referee, never
thrown, so one writer's finding cannot vanish with its process.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fixture` | [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) |
| `config` | [`SoakWriterConfig`](/api/@rulvar/store-conformance/interfaces/SoakWriterConfig.md) |
| `hooks` | [`SoakWriterHooks`](/api/@rulvar/store-conformance/interfaces/SoakWriterHooks.md) |

## Returns

`Promise`\&lt;`void`\&gt;
