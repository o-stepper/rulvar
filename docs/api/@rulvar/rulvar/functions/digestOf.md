[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / digestOf

# Function: digestOf()

```ts
function digestOf(record, result): TaskDigest;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Folds one settled child into its digest (spawn-ordinal ordering is the caller's).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `record` | [`SpawnRecord`](/api/@rulvar/rulvar/interfaces/SpawnRecord.md) |
| `result` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |

## Returns

[`TaskDigest`](/api/@rulvar/rulvar/interfaces/TaskDigest.md)
