[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DEFAULT\_EVIDENCE\_GRADE\_PHRASES

# Variable: DEFAULT\_EVIDENCE\_GRADE\_PHRASES

```ts
const DEFAULT_EVIDENCE_GRADE_PHRASES: readonly string[];
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1167)

The default evidence-grade phrases (RV1212, the sixteenth comparison
experiment P2-3). Each asserts the STRONGEST kind of provenance a
report can claim: that something was watched running, that a
provider charged for it, or that it holds up in production. The
sixteenth run's own answer used exactly this register about a
runtime the live run never observed, which is the failure mode the
lint exists to catch.
