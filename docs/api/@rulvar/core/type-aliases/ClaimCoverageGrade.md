[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimCoverageGrade

# Type Alias: ClaimCoverageGrade

```ts
type ClaimCoverageGrade = 
  | "full"
  | "vacuous"
  | "partial"
  | "critical-uncovered"
  | "judge-declined"
  | "judge-failed";
```

Defined in: [packages/core/src/orchestrator/consistency.ts:659](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L659)

The claim-coverage grade (RV1702): one closed vocabulary a consumer
reads INSTEAD of inferring semantic health from an empty findings
array. The eighteenth comparison benchmark's run reported
`completion: 'complete'` with `contradictions: []` while the judge
had seen 40 of 144 citing sentences and said so only in counts a
reader had to interpret; three material falsehoods rode that gap.
The grade names the verification posture outright:

- `'full'`: every citing sentence the draft carries had at least one
  judged pair, nothing was cut by a bound, no declared critical
  anchor was missed, and the judge (when needed) settled ok.
- `'vacuous'` (RV2508): the draft carried NO citing sentence, so the
  configured pass verified nothing. This used to grade `'full'` on
  the reasoning that saying `'partial'` would imply a subset was
  chosen, which is true and beside the point: `'full'` is the
  strongest word in the vocabulary and it was standing over a
  denominator of zero, the same silent green the grade exists to
  abolish, at its extreme.
- `'partial'`: the pass verified a strict subset: the pair bound
  truncated the fold, a run-facts bound truncated the run-claim
  pairs, or citing sentences exist that no judged pair covers.
- `'critical-uncovered'`: at least one DECLARED critical anchor got
  no judged pair; stronger than `'partial'` because the caller named
  exactly these claims as the ones that must not go unverified.
- `'judge-declined'` (RV2508): the judge invocation was refused
  ADMISSION and never dispatched (RV2106), so nothing was judged at
  all. It ranks with a failed judge and above everything the counts
  could say, because those counts describe a pass that did not
  happen; before this the flag was invisible to the grade and a
  declined judge over a citation-free draft graded `'full'`.
- `'judge-failed'`: the judge invocation did not settle ok, so
  nothing was judged at all; every other reading of the meta is
  moot.

Precedence is the order above, strongest last. The helper is pure
and total over metas written BEFORE the grade shipped, so a consumer
can grade a persisted outcome from an older engine.
