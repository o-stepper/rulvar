[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / runKillPointWorker

# Function: runKillPointWorker()

```ts
function runKillPointWorker(
   fixture, 
   config, 
hooks?): Promise<void>;
```

Defined in: [packages/store-conformance/src/kill-points.ts:482](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L482)

The worker protocol: run it in a spawned process against the
consumer-constructed store pair. Wraps the journal so the configured
write kills the process (`before` = ahead of the write, `after` =
once it is durable), appends every observation to the report file
first (the appends are synchronous, so the report survives the
SIGKILL), and reports `ran-to-completion` when the kill point is
never reached, which the referee treats as a violation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fixture` | [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) |
| `config` | [`KillPointWorkerConfig`](/api/@rulvar/store-conformance/interfaces/KillPointWorkerConfig.md) |
| `hooks` | [`KillPointWorkerHooks`](/api/@rulvar/store-conformance/interfaces/KillPointWorkerHooks.md) |

## Returns

`Promise`\&lt;`void`\&gt;
