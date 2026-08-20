[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / synthesizeSpanClassOf

# Function: synthesizeSpanClassOf()

```ts
function synthesizeSpanClassOf(label): "composition" | "claim-judge" | "citation-judge" | "unclassified";
```

Defined in: `packages/core/dist/index.d.ts`

The ONE synthesize-span classifier both reducers fold through
(RV4206, the RV3302 doctrine extended from a judge predicate to the
whole vocabulary): the sixth comparison experiment's citation judge
(label [CITATION\_JUDGE\_LABEL](/api/@rulvar/rulvar/variables/CITATION_JUDGE_LABEL.md), role 'synthesize') was
recognized by neither reducer and fell into `finalCompositionMs` on
both, so the run's 368889 ms "composition" was half verdict, its
`compositionSpans: 2` faked a repair round's signature on a clean
run, and `lastCandidateMs` overshot the candidate by 154 seconds.

- 'claim-judge': [claimJudgeStageOf](/api/@rulvar/rulvar/functions/claimJudgeStageOf.md) recognizes the label.
- 'citation-judge': [citationJudgePassOf](/api/@rulvar/rulvar/functions/citationJudgePassOf.md) recognizes it.
- 'composition': the engine's own composition labels
  ([FINAL\_COMPOSITION\_LABEL](/api/@rulvar/rulvar/variables/FINAL_COMPOSITION_LABEL.md), [SYNTHESIS\_NOTE\_LABEL](/api/@rulvar/rulvar/variables/SYNTHESIS_NOTE_LABEL.md),
  suffixed variants included) and every UNLABELLED span: streams
  recorded before RV2901 carry no labels, and composition was the
  only unlabelled engine dispatch, so absence keeps its historical
  reading.
- 'unclassified': any OTHER label. A present label this classifier
  does not know is a NEW vocabulary member, and folding it silently
  into composition is exactly the failure this function exists to
  end; the reducers bucket it under `unclassifiedSynthesisMs` with
  its own nonzero span counter.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` \| `undefined` |

## Returns

`"composition"` \| `"claim-judge"` \| `"citation-judge"` \| `"unclassified"`
