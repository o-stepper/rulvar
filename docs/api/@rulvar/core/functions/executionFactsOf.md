[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / executionFactsOf

# Function: executionFactsOf()

```ts
function executionFactsOf(result): ChildExecutionFacts;
```

Defined in: [packages/core/src/orchestrator/handles.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L93)

Folds one settled child's replay-stable execution facts (RV1503).
Per dispatch record: the wire count is the adapter-reported
`wireRequests` when present, else the absorbed id list's length,
else one (a single-wire dispatch); the named side counts the
absorbed ids or the single `responseId`, clamped by the wire count
(RV1410: a keyless single-wire row contributes one missing id).
Pure over the settled result, so live and resumed folds agree byte
for byte.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |

## Returns

[`ChildExecutionFacts`](/api/@rulvar/core/interfaces/ChildExecutionFacts.md)
