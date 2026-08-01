[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DEFAULT\_EVIDENCE\_GRADE\_PHRASES

# Variable: DEFAULT\_EVIDENCE\_GRADE\_PHRASES

```ts
const DEFAULT_EVIDENCE_GRADE_PHRASES: readonly string[];
```

Defined in: `packages/core/dist/index.d.ts`

The default evidence-grade phrases (RV1212, the sixteenth comparison
experiment P2-3). Each asserts the STRONGEST kind of provenance a
report can claim: that something was watched running, that a
provider charged for it, or that it holds up in production. The
sixteenth run's own answer used exactly this register about a
runtime the live run never observed, which is the failure mode the
lint exists to catch.
