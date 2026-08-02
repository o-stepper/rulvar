[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / executionFactsOf

# Function: executionFactsOf()

```ts
function executionFactsOf(result): ChildExecutionFacts;
```

Defined in: `packages/core/dist/index.d.ts`

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
| `result` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |

## Returns

[`ChildExecutionFacts`](/api/@rulvar/rulvar/interfaces/ChildExecutionFacts.md)
