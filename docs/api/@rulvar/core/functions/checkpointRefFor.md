[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / checkpointRefFor

# Function: checkpointRefFor()

```ts
function checkpointRefFor(runId, runningSeq): string;
```

Defined in: [packages/core/src/journal/checkpoint.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L59)

Deterministic checkpoint blob ref for an agent dispatch (running seq).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `runningSeq` | `number` |

## Returns

`string`
