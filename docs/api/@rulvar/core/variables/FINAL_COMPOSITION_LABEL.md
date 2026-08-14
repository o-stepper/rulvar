[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FINAL\_COMPOSITION\_LABEL

# Variable: FINAL\_COMPOSITION\_LABEL

```ts
const FINAL_COMPOSITION_LABEL: "final-composition" = 'final-composition';
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:445](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L445)

The label the final synthesis (composition) invocation dispatches
under (RV2901). The engine labelling its OWN dispatches is what lets
`criticalPathFromJournal` split the synthesize bucket offline: the
split demands a label on EVERY synthesize span, and the comparison
run that shipped the journal fold still refused it because this one
dispatch stayed anonymous while the claim judge was labelled.
