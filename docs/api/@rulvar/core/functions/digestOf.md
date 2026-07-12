[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / digestOf

# Function: digestOf()

```ts
function digestOf(record, result): TaskDigest;
```

Defined in: [packages/core/src/orchestrator/handles.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L93)

Folds one settled child into its digest (spawn-ordinal ordering is the caller's).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `record` | [`SpawnRecord`](/api/@rulvar/core/interfaces/SpawnRecord.md) |
| `result` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |

## Returns

[`TaskDigest`](/api/@rulvar/core/interfaces/TaskDigest.md)
