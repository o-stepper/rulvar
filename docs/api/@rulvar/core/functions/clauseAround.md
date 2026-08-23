[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / clauseAround

# Function: clauseAround()

```ts
function clauseAround(sentence, anchorIndex): string;
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:408](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L408)

The claim clause nearest an anchor (RV4208): the sentence segment,
cut at clause boundaries (';' or ',' followed by whitespace), that
contains the anchor position. Pure text arithmetic, no NLP: the
point is to hand the judge the claim half the anchor was cited FOR
instead of the whole compound sentence.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sentence` | `string` |
| `anchorIndex` | `number` |

## Returns

`string`
