[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / insertRunIdIntoSentence

# Function: insertRunIdIntoSentence()

```ts
function insertRunIdIntoSentence(sentence, insert): string;
```

Defined in: `packages/core/dist/index.d.ts`

The deterministic edit behind the `insert-run-id` mechanism
(RV3801): the id lands INSIDE the sentence, before its trailing
terminator run (a `.`, `!`, or `?` with any closing quotes,
brackets, or markdown emphasis after it), or at the very end when
the sentence carries no terminator. Inside matters: appended AFTER
the terminator the id would belong to the NEXT sentence under the
shared `sentencesOf` segmentation and the re-validation would fail
the same sentence again. Exported so tests and hosts can reproduce
the loop's exact bytes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sentence` | `string` |
| `insert` | `string` |

## Returns

`string`
