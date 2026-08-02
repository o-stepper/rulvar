[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / digestOf

# Function: digestOf()

```ts
function digestOf(
   record, 
   result, 
   includeFacts?): TaskDigest;
```

Defined in: `packages/core/dist/index.d.ts`

Folds one settled child into its digest (spawn-ordinal ordering is
the caller's). `includeFacts` (RV1503) appends the replay-stable
execution facts; absent or false keeps the digest byte identical.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `record` | [`SpawnRecord`](/api/@rulvar/rulvar/interfaces/SpawnRecord.md) |
| `result` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |
| `includeFacts?` | `boolean` |

## Returns

[`TaskDigest`](/api/@rulvar/rulvar/interfaces/TaskDigest.md)
