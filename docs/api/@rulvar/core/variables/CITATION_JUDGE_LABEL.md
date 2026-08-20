[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CITATION\_JUDGE\_LABEL

# Variable: CITATION\_JUDGE\_LABEL

```ts
const CITATION_JUDGE_LABEL: "citation-entailment-judge" = 'citation-entailment-judge';
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:513](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L513)

The label the citation entailment audit judge dispatches under
(RV4004; named here since RV4206 so the reducers and the
orchestrator share one constant, the CLAIM_JUDGE_LABEL precedent):
the audit judge rides role 'synthesize' exactly like the claim
judge, and until RV4206 no reducer knew its name, so its wall
folded into final composition on both surfaces.
