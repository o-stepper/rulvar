[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / citationJudgePassOf

# Function: citationJudgePassOf()

```ts
function citationJudgePassOf(label): "first" | "round" | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Which audit pass a citation judge label names (RV4206): the exact
[CITATION\_JUDGE\_LABEL](/api/@rulvar/rulvar/variables/CITATION_JUDGE_LABEL.md) is the first pass over the shipped
document, and every suffixed variant is a post round re-audit
(today `citation-entailment-judge-round`, the RV4004 round and the
RV4202 merged round both dispatch it). `undefined` for every other
label; one classifier for both reducers, the RV3302 doctrine.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` \| `undefined` |

## Returns

`"first"` \| `"round"` \| `undefined`
