[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimCoverageGrade

# Type Alias: ClaimCoverageGrade

```ts
type ClaimCoverageGrade = "full" | "partial" | "critical-uncovered" | "judge-failed";
```

Defined in: `packages/core/dist/index.d.ts`

The claim-coverage grade (RV1702): one closed vocabulary a consumer
reads INSTEAD of inferring semantic health from an empty findings
array. The eighteenth comparison benchmark's run reported
`completion: 'complete'` with `contradictions: []` while the judge
had seen 40 of 144 citing sentences and said so only in counts a
reader had to interpret; three material falsehoods rode that gap.
The grade names the verification posture outright:

- `'full'`: every citing sentence the draft carries had at least one
  judged pair, nothing was cut by a bound, no declared critical
  anchor was missed, and the judge (when needed) settled ok. A draft
  with zero citing sentences grades `'full'` vacuously: there was
  nothing to verify, and saying `'partial'` would imply a subset was
  chosen.
- `'partial'`: the pass verified a strict subset: the pair bound
  truncated the fold, a run-facts bound truncated the run-claim
  pairs, or citing sentences exist that no judged pair covers.
- `'critical-uncovered'`: at least one DECLARED critical anchor got
  no judged pair; stronger than `'partial'` because the caller named
  exactly these claims as the ones that must not go unverified.
- `'judge-failed'`: the judge invocation did not settle ok, so
  nothing was judged at all; every other reading of the meta is
  moot.

Precedence is the order above, strongest last. The helper is pure
and total over metas written BEFORE the grade shipped, so a consumer
can grade a persisted outcome from an older engine.
